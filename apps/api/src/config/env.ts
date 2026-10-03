import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
