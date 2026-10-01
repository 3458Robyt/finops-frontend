import { spawn } from 'node:child_process';
import { access, unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const command = (name) => name;
const frontendUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://127.0.0.1:3100';
const frontendPort = localServicePort(frontendUrl, 'frontend');
const backendPort = localServicePort(backendUrl, 'backend');
const backendDir = resolve(process.env.FINOPS_BACKEND_DIR ?? '../finops-backend');
const fixtureFile = process.env.E2E_FIXTURE_FILE ?? resolve(backendDir, '.test-artifacts/e2e-fixtures.json');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl === undefined || testDatabaseUrl.trim() === '') {
  throw new Error('TEST_DATABASE_URL is required. Use an isolated *_test database or finops_e2e_* schema.');
}

assertIsolatedTestDatabase(testDatabaseUrl);

if (process.env.ALLOW_DESTRUCTIVE_TEST_DATABASE !== 'true') {
  throw new Error('ALLOW_DESTRUCTIVE_TEST_DATABASE=true is required for the full E2E fixture setup.');
}

function assertIsolatedTestDatabase(connectionString) {
  let parsedUrl;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL for an isolated test database.');
  }

  const databaseName = parsedUrl.pathname.replace(/^\/+/, '');
  const schema = parsedUrl.searchParams.get('schema');
  const isolatedSchema = schema !== null && /^finops_e2e_[a-z0-9_]+$/.test(schema);
  if (!databaseName.endsWith('_test') && !isolatedSchema) {
    throw new Error('TEST_DATABASE_URL must point to a database ending in _test or an isolated finops_e2e_* schema before migrations run.');
  }
}

function localServicePort(value, label) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`${label} E2E URL must use local HTTP loopback.`);
  }
  const port = Number(url.port || (label === 'frontend' ? 5173 : 3100));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${label} E2E URL must use a valid local development port.`);
  }
  return port;
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

async function removeFixtureManifest(filePath) {
  const artifactsRoot = resolve(backendDir, '.test-artifacts');
  const resolvedFilePath = resolve(filePath);
  const relativeFilePath = relative(artifactsRoot, resolvedFilePath);
  if (relativeFilePath.startsWith('..') || isAbsolute(relativeFilePath)) {
    throw new Error('Refusing to delete an E2E manifest outside finops-backend/.test-artifacts.');
  }

  await unlink(resolvedFilePath).catch((error) => {
    if (error?.code !== 'ENOENT') throw error;
  });
}

const fixtureEnv = {
  ...process.env,
  TEST_DATABASE_URL: testDatabaseUrl,
  E2E_FIXTURE_FILE: fixtureFile,
  ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
};
const migrationEnv = {
  ...fixtureEnv,
  DATABASE_URL: testDatabaseUrl,
};
const backendEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  // Browser E2E mocks AI routes; keep backend startup independent of provider secrets and network.
  AI_API_KEY: 'e2e-disabled-provider-key',
  AI_BASE_URL: 'http://127.0.0.1:1/v1',
  PORT: String(backendPort),
  CORS_ORIGIN: frontendUrl,
  INGESTION_WORKER_ENABLED: 'false',
  INGESTION_SCHEDULER_ENABLED: 'false',
  RECOMMENDATION_ANALYSIS_WORKER_ENABLED: 'false',
  RECOMMENDATION_ANALYSIS_SCHEDULER_ENABLED: 'false',
  AGENT_LEARNING_WORKER_ENABLED: 'false',
  MESSAGE_SCHEDULER_ENABLED: 'false',
};
const sensitiveTestEnvName = /(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|DATABASE_URL|CONNECTION_STRING|CREDENTIAL|SESSION[_-]?ID|SUPABASE|OCI_|AWS_|SMTP_|TELEGRAM_)/i;
const frontendEnv = {
  // Playwright failures can serialize process.env; browser-side tests must not inherit credentials.
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !sensitiveTestEnvName.test(name))),
  E2E_BASE_URL: frontendUrl,
  E2E_ORIGIN: frontendUrl,
  VITE_API_BASE_URL: `${backendUrl}/api/v1`,
};
if (Object.keys(frontendEnv).some((name) => sensitiveTestEnvName.test(name))) {
  throw new Error('Sensitive environment variables must not be passed to the frontend or Playwright process.');
}

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
  await run(command('npm'), ['run', 'test:fixtures:prepare'], { cwd: backendDir, env: fixtureEnv });
  await run(command('npx'), ['prisma', 'migrate', 'deploy'], { cwd: backendDir, env: migrationEnv });
  await run(command('npm'), ['run', 'test:fixtures:create'], { cwd: backendDir, env: fixtureEnv });
  backend = start(command('npx'), ['tsx', 'src/index.ts'], backendEnv, backendDir);
  await waitFor(`${backendUrl}/health`);
  frontend = start(command('npx'), ['vite', '--host', '127.0.0.1', '--port', String(frontendPort)], frontendEnv, resolve('.'));
  await waitFor(`${frontendUrl}/`);
  // The database-backed specs intentionally share one isolated fixture tenant.
  // Run them serially so concurrent analysis commands cannot race on the same durable job.
  await run(command('npx'), ['playwright', 'test', '--workers=1', '--grep-invert', '@role-matrix'], { cwd: resolve('.') , env: frontendEnv });
  // Keep the production 10-attempt/15-minute login throttle intact. The role
  // suite performs several distinct legitimate logins, so give it a fresh
  // isolated API process and limiter bucket rather than weakening auth.
  await stop(backend);
  backend = start(command('npx'), ['tsx', 'src/index.ts'], backendEnv, backendDir);
  await waitFor(`${backendUrl}/health`);
  await run(command('npx'), ['playwright', 'test', 'e2e/role-access.spec.ts', '--workers=1', '--grep', '@role-matrix'], { cwd: resolve('.'), env: frontendEnv });
} finally {
  await stop(frontend);
  await stop(backend);
  try {
    await run(command('npm'), ['run', 'test:fixtures:cleanup'], { cwd: backendDir, env: fixtureEnv });
  } finally {
    await removeFixtureManifest(fixtureFile);
  }
}
