import { z } from 'zod';

export const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.url().default('http://localhost:5173'),
    // S3-compatible media storage (RustFS in dev, see compose.yml). Endpoints unset = AWS S3.
    /** What the api itself talks to, e.g. http://storage:9000 from the dev container. */
    S3_ENDPOINT: z.url().optional(),
    /**
     * What the browser reaches: presigned upload and read URLs are signed for this host, and
     * a signature only works on the host it was made for. Unset = S3_ENDPOINT.
     */
    S3_PUBLIC_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_BUCKET: z.string().min(3),
    // Unset = the SDK's default credential chain (e.g. an IAM role on AWS).
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /** true for RustFS/MinIO-style servers: http://host/bucket/key instead of bucket.host. */
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  })
  .refine((env) => !env.S3_ACCESS_KEY_ID === !env.S3_SECRET_ACCESS_KEY, {
    message: 'Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither',
    path: ['S3_SECRET_ACCESS_KEY'],
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
