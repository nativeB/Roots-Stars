import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// In dev/prod the api runs with cwd = api/, but the .env lives at the repo root.
// Load the root .env if present, then fall back to a local one.
for (const p of [resolve(process.cwd(), '../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(p)) loadEnv({ path: p });
}

/**
 * Validated environment. Fails fast on boot if misconfigured.
 * Loads the repo-root .env via dotenv (cwd is the api package in dev/prod).
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(8080),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  API_SECRET: z.string().min(16, 'API_SECRET must be at least 16 chars'),
  HOST_SECRET: z.string().min(1),

  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().optional().default('roots-and-stars'),
  R2_ENDPOINT: z.string().optional().default(''),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = schema.parse(process.env);
export const r2Configured = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT,
);
