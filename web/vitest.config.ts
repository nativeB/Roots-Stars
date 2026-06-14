import { defineConfig } from 'vitest/config';

// Unit tests only (layout math). Playwright e2e lives under tests/*.spec.ts and
// tests/live, run separately.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
