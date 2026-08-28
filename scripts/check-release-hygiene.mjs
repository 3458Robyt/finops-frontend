import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const tracked = listFilesForReleaseCheck();

const forbidden = tracked.filter((file) => {
  const normalized = file.replaceAll('\\', '/');
  if (normalized === '.env.example') return false;
  return /(^|\/)\.env(?:\.|$)/i.test(normalized)
    || /\.(?:pem|key|p12|pfx|jks|sqlite|sqlite3|db)$/i.test(normalized)
    || /(^|\/)(?:node_modules|dist|\.test-artifacts|test-results|playwright-report)(\/|$)/i.test(normalized)
    || /\.log$/i.test(normalized);
});

if (forbidden.length > 0) {
  console.error('Release hygiene check failed. Forbidden tracked artifacts:');
  forbidden.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log(`Release hygiene check passed for ${tracked.length} tracked files.`);

function listFilesForReleaseCheck() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    // Container build contexts intentionally exclude .git. Scan the copied
    // context instead of making the application build depend on Git being
    // installed in the image.
    return walk(process.cwd());
  }
}

function walk(root) {
  const ignoredDirectories = new Set([
    '.git',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
    '.test-artifacts',
    'graphify-out',
  ]);
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        files.push(relative(root, absolute).replaceAll('\\', '/'));
      }
    }
  };
  visit(root);
  return files;
}
