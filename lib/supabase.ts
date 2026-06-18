import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import { env } from "@/lib/env"

let _client: SupabaseClient | null = null
let _serviceClient: SupabaseClient | null = null
let _browserClient: SupabaseClient | null = null

export function getSupabase() {
  if (typeof window !== "undefined") {
    if (!_browserClient) {
      _browserClient = createBrowserClient(
        env.NEXT_PUBLIC_SUPABASE_URL!,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return _browserClient
  }
  if (!_client) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL!
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    _client = createClient(url, key)
  }
  return _client
}

export function getServiceSupabase() {
  if (!_serviceClient) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL!
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL")
    _serviceClient = createClient(url, key)
  }
  return _serviceClient
}
