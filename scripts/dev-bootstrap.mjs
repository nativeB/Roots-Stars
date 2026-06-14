#!/usr/bin/env node
/**
 * One-command dev prep. Runs automatically before `npm run dev`.
 * Ensures the local Postgres container is running, migrations are applied, and
 * a stable demo family is seeded — then prints the invite link.
 *
 * Idempotent: safe to run every time. Skips gracefully if Docker isn't available
 * (assumes you pointed DATABASE_URL at some other reachable Postgres).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTAINER = 'roots-pg';
const IMAGE = 'postgres:16-alpine';

// ── load .env (DATABASE_URL drives the port/db) ──
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('\n✗ No .env found. Copy .env.example to .env first.\n');
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
const DATABASE_URL = env.DATABASE_URL;
const childEnv = { ...process.env, ...env };

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}
function quiet(cmd) {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
}

const dockerOk = quiet('docker info') !== null;
const url = new URL(DATABASE_URL);
const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
const port = url.port || '5432';

if (dockerOk && isLocal) {
  const state = quiet(`docker inspect -f '{{.State.Running}}' ${CONTAINER}`);
  if (state === null) {
    console.log(`▸ Starting Postgres (${CONTAINER}) on port ${port}…`);
    sh(
      `docker run -d --name ${CONTAINER} ` +
        `-e POSTGRES_USER=${url.username} -e POSTGRES_PASSWORD=${url.password} ` +
        `-e POSTGRES_DB=${url.pathname.slice(1)} -p ${port}:5432 ${IMAGE}`,
    );
  } else if (state === 'false') {
    console.log(`▸ Restarting Postgres (${CONTAINER})…`);
    sh(`docker start ${CONTAINER}`);
  } else {
    console.log(`▸ Postgres (${CONTAINER}) already running.`);
  }

  // wait until the server accepts connections
  process.stdout.write('▸ Waiting for Postgres');
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (quiet(`docker exec ${CONTAINER} pg_isready -U ${url.username}`)?.includes('accepting')) {
      ready = true;
      break;
    }
    process.stdout.write('.');
    spawnSync('sleep', ['0.5']);
  }
  console.log(ready ? ' ready.' : ' timed out (continuing anyway).');
} else if (!dockerOk) {
  console.log('▸ Docker not available — assuming DATABASE_URL points at a reachable Postgres.');
}

// ── migrations + seed ──
const apiDir = resolve(root, 'api');
console.log('▸ Applying migrations…');
spawnSync('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'], {
  cwd: apiDir,
  env: childEnv,
  stdio: 'inherit',
});

console.log('▸ Seeding demo family…');
spawnSync('npm', ['run', 'seed'], { cwd: apiDir, env: childEnv, stdio: 'inherit' });

console.log('\n✦ Ready. Starting dev servers…\n');
