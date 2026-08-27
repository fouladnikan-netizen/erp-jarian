import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight .env loader for Playwright (no dotenv dependency).
 * Does not override existing process.env keys.
 */
export function loadRepoEnv(repoRoot = process.cwd()) {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requireE2eQaCredentials() {
  loadRepoEnv();
  const username = process.env.E2E_QA_USERNAME || process.env.QA_ADMIN_USERNAME;
  const password = process.env.E2E_QA_PASSWORD || process.env.QA_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing E2E QA credentials. Set E2E_QA_USERNAME and E2E_QA_PASSWORD in .env or the environment.',
    );
  }
  return { username, password };
}
