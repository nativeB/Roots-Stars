import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { env } from './env.js';
import { registerRoutes } from './routes.js';
import { initIO } from './realtime/io.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// In prod the built SPA lives at web/dist relative to the repo root.
const WEB_DIST = resolve(__dirname, '../../web/dist');

async function main() {
  const app = Fastify({ logger: true });

  // Tolerate empty bodies on JSON POSTs (e.g. token issue, claim) instead of 400.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      const str = typeof body === 'string' ? body.trim() : '';
      if (str.length === 0) return done(null, {});
      try {
        done(null, JSON.parse(str));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Privacy §10: never indexable, on every response.
  app.addHook('onSend', async (_req, reply, payload) => {
    void reply.header('X-Robots-Tag', 'noindex, nofollow');
    return payload;
  });

  await registerRoutes(app);

  app.get('/api/health', async () => ({ ok: true }));

  // Single-origin: serve the built SPA + client-side routing fallback.
  if (existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, { root: WEB_DIST, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  const server = app.server;
  initIO(server);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Roots & Stars API + realtime listening on :${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
