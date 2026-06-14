# Roots & Stars 🌌

> A living constellation of your extended family. Share one link, and every relative lights up their own star, sees how they connect to everyone else, and adds the small human details that make a family feel like a family.

Private, invite-only, mobile-first. Not genealogy software — **wonder**. The emotional core is the *ignite-on-join* moment: tap "This is me," and your star flares to life while a pulse of light travels up your lineage threads through the generations.

## Stack

A single-origin app deployed as one Railway service.

- **web** — Vite + React + TypeScript + Tailwind + Framer Motion. Custom SVG constellation (d3-hierarchy for layout math only).
- **api** — Fastify + Prisma + Postgres + socket.io. Serves the built SPA, the JSON API, and the realtime WebSocket from one origin.
- **shared** — TypeScript types + Zod schemas; the single source of truth for API contracts and realtime event payloads.

Photos live in **Cloudflare R2** (S3-compatible). Auth is a frictionless **per-device signed token** (no passwords) — the invite link is the key.

## Monorepo layout

```
roots-and-stars/
├── shared/   # @roots/shared — types + zod schemas
├── api/      # @roots/api    — Fastify + Prisma + socket.io
└── web/      # @roots/web    — Vite + React SPA + Playwright tests
```

npm workspaces. `shared` builds first; `api` and `web` consume it as `@roots/shared`.

## Local development

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL etc.
npm run -w @roots/api prisma:generate
npm run -w @roots/api prisma:migrate    # creates tables in your Postgres
npm run -w @roots/api seed              # seeds a demo family (incl. a half-sibling + remarriage)
npm run dev                              # builds shared, then runs api + web
```

- web dev server: http://localhost:5173
- api: http://localhost:8080

Open the invite link printed by the seed script (e.g. `http://localhost:5173/j/<slug>`).

## Testing the UI against the spec

The look *is* the product, so the UI is held to the spec by Playwright — critical flows, visual-regression snapshots (capped at 2000px), §6 design-token assertions, accessibility (axe + keyboard + list-view fallback), reduced-motion, and privacy (noindex / unreachable-without-slug).

```bash
npm run -w @roots/web test:e2e            # run the suite
npm run -w @roots/web test:e2e:update     # update visual snapshots after intentional changes
```

## Deploy (Railway, single service)

One Railway service serves the SPA, the JSON API, and the WebSocket from one
origin. Build + start are defined in [`nixpacks.toml`](nixpacks.toml).

1. Add a **Postgres** plugin. In the app service, set `DATABASE_URL` to a
   reference of the plugin's connection variable.
2. Create a service from this repo with **Root Directory = repo root**. Nixpacks
   reads `nixpacks.toml`:
   - build: `npm ci` → build shared → build web → `prisma generate` → build api
   - start: `prisma migrate deploy` → `node api/dist/server.js`
3. Set env vars: `API_SECRET`, `HOST_SECRET`, and (for photos) `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
   `PORT` is injected by Railway. Photos are optional — without R2 the app runs
   fine and the photo picker simply reports it can't store images.
4. After first deploy, seed a family once (Railway shell): `npm run -w @roots/api seed`,
   then open the printed `/j/<slug>` invite link.

## Privacy

Invite-only with an unguessable slug. `noindex` everywhere, `robots.txt` disallow, no public sharing surfaces, no sitemap. Photos (incl. of minors) live behind the invite wall via private R2 + presigned GETs. Any star (or the host) can be exported and deleted. Family data is isolated at the API layer — every query is scoped by `familyId` derived from the token, never from client input.
