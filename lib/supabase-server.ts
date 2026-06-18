import "@/lib/env"
import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export function createClientForProxy(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )
}

export function createClientForRouteHandler(request: Request) {
  const cookieHeader = request.headers.get("cookie") || ""
  const pairs = parseCookieHeader(cookieHeader)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return pairs },
        setAll() { /* read-only — caller should use createClientForRouteHandlerWithResponse */ },
      },
    }
  )
}

export function createClientForRouteHandlerWithResponse(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function getRoleFromRequest(request: Request): Promise<string | null> {
  try {
    const supabase = createClientForRouteHandler(request)
    const { data: { user } } = await supabase.auth.getUser()
    return (user?.user_metadata?.role as string) ?? null
  } catch (e) {
    logger.error("getRoleFromRequest failed", e)
    return null
  }
}

function parseCookieHeader(header: string): { name: string; value: string }[] {
  const pairs: { name: string; value: string }[] = []
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx > 0) {
      pairs.push({
        name: part.slice(0, idx).trim(),
        value: part.slice(idx + 1).trim(),
      })
    }
  }
  return pairs
}
