import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load the repo-root .env so drizzle-kit (run from this package) sees DATABASE_URL.
config({ path: '../../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://acolhe:acolhe@localhost:5432/acolhe_animal',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
