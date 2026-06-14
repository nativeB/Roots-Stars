import { readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Stop the API started in global-setup. */
export default async function globalTeardown() {
  const pidFile = resolve(__dirname, '.api-pid');
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    if (pid) {
      try {
        process.kill(-pid); // kill the detached process group
      } catch {
        try {
          process.kill(pid);
        } catch {
          /* already gone */
        }
      }
    }
    rmSync(pidFile, { force: true });
  }
}
