import { z } from 'zod';

// Validated once at startup, like apps/api/src/config/env.ts: a missing or malformed value
// fails loudly here instead of producing fetches to 'undefined/milestones'.
// Read env only through this module, never import.meta.env directly.
const envSchema = z.object({
  VITE_API_URL: z.url(), // no trailing slash (see apps/web/.env)
});

export const env = envSchema.parse(import.meta.env);
