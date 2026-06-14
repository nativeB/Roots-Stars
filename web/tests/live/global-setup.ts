import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Live-test setup: seed a fresh demo family and start the API server, capturing
 * the invite slug for the live specs. The web dev server is started by the
 * Playwright `webServer` config. Skipped automatically if the DB isn't reachable.
 */
const API_DIR = resolve(__dirname, '../../../api');
const SLUG_FILE = resolve(__dirname, '.live-slug');
const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://roots:roots@localhost:5436/rootsandstars?schema=public';

export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: DB_URL };

  // seed and grab the slug
  const out = execSync('npm run seed', { cwd: API_DIR, env }).toString();
  const m = /\/j\/([A-Za-z0-9]+)/.exec(out);
  if (!m) throw new Error('Could not parse invite slug from seed output');
  writeFileSync(SLUG_FILE, m[1]!, 'utf8');

  // start the API (single-origin not needed; web proxies /api + /socket.io)
  const api = spawn('npm', ['run', 'dev'], { cwd: API_DIR, env, stdio: 'ignore', detached: true });
  // wait for health
  const base = 'http://localhost:8080/api/health';
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(base);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  // store pid for teardown
  writeFileSync(resolve(__dirname, '.api-pid'), String(api.pid ?? ''), 'utf8');
}
