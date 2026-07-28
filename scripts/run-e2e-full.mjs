import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const command = (name) => name;
const frontendUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:3100';
const backendDir = resolve(process.env.FINOPS_BACKEND_DIR ?? '../finops-backend');
const fixtureFile = process.env.E2E_FIXTURE_FILE ?? resolve(backendDir, '.test-artifacts/e2e-fixtures.json');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined || testDatabaseUrl.trim() === '') {
  throw new Error('TEST_DATABASE_URL is required. Use an isolated *_test database or finops_e2e_* schema.');
}

if (process.env.ALLOW_DESTRUCTIVE_TEST_DATABASE !== 'true') {
  throw new Error('ALLOW_DESTRUCTIVE_TEST_DATABASE=true is required for the full E2E fixture setup.');
}

async function isReachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

// The TypeScript backend startup compiles the full composition root locally;
// keep the E2E timeout above the observed cold-start ceiling without changing
// the production runtime.
async function waitFor(url, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(childCommand, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const spec = spawnSpec(childCommand, args);
    const child = spawn(spec.file, spec.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.detached ? 'ignore' : 'inherit',
      detached: options.detached ?? false,
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${childCommand} exited with ${code ?? signal}`));
    });
  });
}

function start(childCommand, args, env, cwd) {
  const spec = spawnSpec(childCommand, args);
  const child = spawn(spec.file, spec.args, {
    cwd,
    env,
    stdio: process.env.E2E_DEBUG === 'true' ? 'inherit' : 'ignore',
    detached: false,
    windowsHide: true,
  });
  child.once('error', (error) => {
    console.error(error.message);
  });
  return child;
}

function spawnSpec(childCommand, args) {
  if (!isWindows) return { file: childCommand, args };
  const quote = (value) => {
    const text = String(value);
    return /\s/.test(text) ? `"${text.replaceAll('"', '\\"')}"` : text;
  };
  return {
    file: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [childCommand, ...args.map(quote)].join(' ')],
  };
}

async function stop(child) {
  if (child === undefined || child.exitCode !== null) return;
  if (isWindows) {
    await run('taskkill', ['/PID', String(child.pid), '/T', '/F']).catch(() => undefined);
  } else {
    child.kill('SIGTERM');
  }
}

const fixtureEnv = {
  ...process.env,
  E2E_FIXTURE_FILE: fixtureFile,
  ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
};
const backendEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  PORT: '3100',
  CORS_ORIGIN: frontendUrl,
  INGESTION_WORKER_ENABLED: 'false',
  INGESTION_SCHEDULER_ENABLED: 'false',
  RECOMMENDATION_ANALYSIS_WORKER_ENABLED: 'false',
  RECOMMENDATION_ANALYSIS_SCHEDULER_ENABLED: 'false',
  AGENT_LEARNING_WORKER_ENABLED: 'false',
  MESSAGE_SCHEDULER_ENABLED: 'false',
};
const frontendEnv = {
  ...process.env,
  E2E_BASE_URL: frontendUrl,
  VITE_API_BASE_URL: `${backendUrl}/api/v1`,
};

let backend;
let frontend;
try {
  if (await isReachable(`${frontendUrl}/`)) {
    throw new Error(`${frontendUrl} is already in use; stop the existing frontend before running the full E2E suite.`);
  }
  if (await isReachable(`${backendUrl}/health`)) {
    throw new Error(`${backendUrl} is already in use; stop the existing backend before running the full E2E suite.`);
  }
  await access(backendDir);
  await run(command('npm'), ['run', 'test:fixtures:create'], { cwd: backendDir, env: fixtureEnv });
  backend = start(command('npx'), ['tsx', 'src/index.ts'], backendEnv, backendDir);
  await waitFor(`${backendUrl}/health`);
  frontend = start(command('npx'), ['vite', '--host', '127.0.0.1', '--port', '5173'], frontendEnv, resolve('.'));
  await waitFor(`${frontendUrl}/`);
  await run(command('npx'), ['playwright', 'test'], { cwd: resolve('.') , env: frontendEnv });
} finally {
  await stop(frontend);
  await stop(backend);
}
