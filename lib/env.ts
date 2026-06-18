const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_ENCRYPTION_KEY",
  "CRON_SECRET",
] as const

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SESSION_ENCRYPTION_KEY: process.env.SESSION_ENCRYPTION_KEY!,
  CRON_SECRET: process.env.CRON_SECRET!,

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || "",
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || "",
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "burger-house",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",
  DEV_ROOT_PASSWORD: process.env.DEV_ROOT_PASSWORD || "",
  DEV_PASSWORD_HASH: process.env.DEV_PASSWORD_HASH || "",
  SETUP_SECRET: process.env.SETUP_SECRET || "",
  CSRF_SECRET: process.env.CSRF_SECRET || "",
  VERCEL_URL: process.env.VERCEL_URL || "",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || "",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const
