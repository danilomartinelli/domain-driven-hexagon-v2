import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default(''),
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  LOG_PRETTY: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  CACHE_DRIVER: z.enum(['memory', 'redis']).default('memory'),
  CACHE_DEFAULT_TTL: z.coerce.number().default(300),
  EVENT_BUS_DRIVER: z.enum(['memory', 'redis']).default('memory'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  STORAGE_S3_BUCKET: z.string().default(''),
  STORAGE_S3_REGION: z.string().default(''),
  NOTIFICATION_DRIVER: z.enum(['console', 'email']).default('console'),
  GQL_MAX_DEPTH: z.coerce.number().default(10),
  GQL_MAX_COMPLEXITY: z.coerce.number().default(1000),
  GQL_MAX_ALIASES: z.coerce.number().default(15),
});

export type EnvConfig = z.infer<typeof envSchema>;
