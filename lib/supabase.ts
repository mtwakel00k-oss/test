import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"

let _client: SupabaseClient | null = null
let _serviceClient: SupabaseClient | null = null
let _browserClient: SupabaseClient | null = null

export function getSupabase() {
  if (typeof window !== "undefined") {
    if (!_browserClient) {
      _browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return _browserClient
  }
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    _client = createClient(url, key)
  }
  return _client
}

export function getServiceSupabase() {
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL")
    _serviceClient = createClient(url, key)
  }
  return _serviceClient
}
