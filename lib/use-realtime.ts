"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { supabase } from "@/lib/tenant"
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js"

type ChannelTable = "orders" | "order_items" | "produits"
type RowChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void

interface RealtimeSubscription {
  table: ChannelTable
  event?: "*" | "INSERT" | "UPDATE" | "DELETE"
  filter?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => boolean
  handler: RowChangeHandler
}

interface UseRealtimeOptions {
  channelName: string
  subscriptions: RealtimeSubscription[]
  pollInterval?: number
  onPoll?: () => void
}

export function useRealtime(options: UseRealtimeOptions) {
  const { channelName, subscriptions, pollInterval = 10000 } = options
  const retriesRef = useRef(0)
  const maxRetries = 5
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [connected, setConnected] = useState(false)

  const refresh = useCallback(() => {
    setConnected((c) => c)
  }, [])

  const stableOnPoll = useRef(options.onPoll)
  const subscriptionsRef = useRef(subscriptions)

  useEffect(() => {
    stableOnPoll.current = options.onPoll
  })

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  useEffect(() => {
    retriesRef.current = 0

    const channel = supabase().channel(channelName)

    for (const sub of subscriptionsRef.current) {
      const event = sub.event || "*"
      channel.on(
        "postgres_changes",
        { event, schema: "public", table: sub.table },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (sub.filter && !sub.filter(payload)) return
          sub.handler(payload)
        },
      )
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true)
        retriesRef.current = 0
      } else if (status === "CHANNEL_ERROR") {
        setConnected(false)
        retriesRef.current++
        if (retriesRef.current <= maxRetries) {
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30000)
          setTimeout(() => { channel.subscribe() }, delay)
        }
      } else if (status === "TIMED_OUT") {
        setConnected(false)
        channel.subscribe()
      } else if (status === "CLOSED") {
        setConnected(false)
      }
    })

    channelRef.current = channel

    return () => {
      supabase().removeChannel(channel)
      channelRef.current = null
    }
  }, [channelName])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    pollRef.current = setInterval(() => {
      refresh()
      stableOnPoll.current?.()
    }, pollInterval)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refresh, pollInterval])

  return { refresh, connected }
}
