"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as LeafMap, Marker, Polyline } from "leaflet"
import { useTheme } from "@/lib/theme"

interface LiveMapProps {
  driverLat: number | null
  driverLng: number | null
  customerLat: number | null
  customerLng: number | null
  lastUpdated?: string | null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function EtaBanner({
  etaLabel,
  distanceKm,
  lastUpdated,
}: {
  etaLabel: string
  distanceKm: string
  lastUpdated?: string | null
}) {
  return (
    <div className="flex items-center justify-between p-6 bg-emerald-500 text-white">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center animate-bounce">
          <svg className="size-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14l1.5 4H4L5 8z" />
            <circle cx="7" cy="17" r="2" strokeWidth={1.5} />
            <circle cx="17" cy="17" r="2" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">السائق في الطريق</p>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">يصل خلال {etaLabel}</p>
        </div>
      </div>
      <div className="text-right">
        {lastUpdated && (
          <div className="mb-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">آخر تحديث</p>
            <p className="text-[10px] font-bold tabular-nums">
              {new Date(lastUpdated).toLocaleTimeString("ar")}
            </p>
          </div>
        )}
        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{distanceKm}</p>
      </div>
    </div>
  )
}

function MapLoading() {
  return (
    <div className="h-80 rounded-[2.5rem] bg-card/50 backdrop-blur-3xl border border-border/50 flex flex-col items-center justify-center gap-6 shadow-2xl">
      <div className="size-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-black tracking-tight">جاري تحديد موقع السائق</p>
        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">يرجى الانتظار قليلاً</p>
      </div>
    </div>
  )
}

export default function LiveDriverMap(props: LiveMapProps) {
  const { driverLat, driverLng, customerLat, customerLng, lastUpdated } = props
  const isDark = useTheme().resolved === "dark"
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafMap | null>(null)
  const driverMarkerRef = useRef<Marker | null>(null)
  const customerMarkerRef = useRef<Marker | null>(null)
  const polylineRef = useRef<Polyline | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [routeDistMeters, setRouteDistMeters] = useState<number | null>(null)
  const lastFetchedRef = useRef<{ lat: number; lng: number } | null>(null)
  const orderIdRef = useRef("")

  // Get order ID from URL (inside effect or called on demand, not during render)
  function getOrderId(): string {
    if (!orderIdRef.current && typeof window !== "undefined") {
      orderIdRef.current = window.location.pathname.split("/").pop() || ""
    }
    return orderIdRef.current
  }

  // Fetch real route from OSRM proxy whenever driver/customer coords change
  useEffect(() => {
    // Need both driver and customer coords for routing
    if (driverLat == null || driverLng == null || customerLat == null || customerLng == null) return

    // Debounce: skip if driver moved less than ~50m and we already have a route
    const last = lastFetchedRef.current
    if (last && etaSeconds != null) {
      const dist = haversineKm(last.lat, last.lng, driverLat, driverLng)
      if (dist < 0.05) return
    }

    const orderId = getOrderId()
    if (!orderId) return

    const dLat = driverLat
    const dLng = driverLng
    const cLat = customerLat
    const cLng = customerLng

    async function fetchRoute() {
      try {
        const url = `/api/orders/${orderId}/route-eta?driverLat=${dLat}&driverLng=${dLng}&customerLat=${cLat}&customerLng=${cLng}`
        const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
        if (!res.ok) throw new Error(`route-eta proxy returned ${res.status}`)
        const data = await res.json()
        if (data.geometry && Array.isArray(data.geometry)) {
          // OSRM returns [lng, lat] — swap to [lat, lng] for Leaflet
          setRouteCoords(data.geometry.map((c: [number, number]) => [c[1], c[0]] as [number, number]))
        }
        if (data.duration != null) setEtaSeconds(data.duration)
        if (data.distance != null) setRouteDistMeters(data.distance)
        lastFetchedRef.current = { lat: dLat, lng: dLng }
      } catch (e) {
        // Fallback: clear route coords (draw straight line) and use haversine ETA
        setRouteCoords(null)
        setEtaSeconds(null)
        setRouteDistMeters(null)
        const msg = e instanceof Error ? e.message : String(e)
        if (!msg.includes("abort") && !msg.includes("timeout")) {
          console.warn("[LiveDriverMap] OSRM fallback to haversine:", msg)
        }
      }
    }

    fetchRoute()
  }, [driverLat, driverLng, customerLat, customerLng, etaSeconds])

  // Compute ETA label
  let etaLabel = ""
  let distanceKm = ""
  if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
    if (etaSeconds != null) {
      const minutes = Math.round(etaSeconds / 60)
      etaLabel = minutes <= 1 ? "أقل من دقيقة" : `~${minutes} دقيقة`
    } else {
      // Fallback haversine
      const km = haversineKm(driverLat, driverLng, customerLat, customerLng)
      const minutes = Math.round((km / 30) * 60)
      etaLabel = minutes <= 1 ? "أقل من دقيقة" : `~${minutes} دقيقة`
    }
    const km = routeDistMeters != null ? (routeDistMeters / 1000) : haversineKm(driverLat, driverLng, customerLat, customerLng)
    distanceKm = `${km.toFixed(1)} كم`
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let map: L.Map | null = null

    async function init() {
      const L = (await import("leaflet")).default
      leafletRef.current = L
      await import("leaflet/dist/leaflet.css")

      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map)

      const redIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      const greenIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;">D</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      if (driverLat != null && driverLng != null) {
        driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: greenIcon }).addTo(map)
      }

      if (customerLat != null && customerLng != null) {
        customerMarkerRef.current = L.marker([customerLat, customerLng], { icon: redIcon }).addTo(map)
      }

      if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
        polylineRef.current = L.polyline(
          [[driverLat, driverLng], [customerLat, customerLng]],
          { color: "#22c55e", weight: 3, dashArray: "6 4", opacity: 0.7 },
        ).addTo(map)

        const bounds = L.latLngBounds([driverLat, driverLng], [customerLat, customerLng])
        map.fitBounds(bounds, { padding: [40, 40] })
      } else if (driverLat != null && driverLng != null) {
        map.setView([driverLat, driverLng], 14)
      } else if (customerLat != null && customerLng != null) {
        map.setView([customerLat, customerLng], 14)
      }

      mapInstanceRef.current = map
    }

    init()

    return () => {
      if (map) map.remove()
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers and polyline when coordinates or route change
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (driverLat != null && driverLng != null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng])
      }
    }
    if (customerLat != null && customerLng != null) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLat, customerLng])
      }
    }

    // Update polyline: use real route if available, else straight line
    if (polylineRef.current && driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
      if (routeCoords && routeCoords.length > 1) {
        // OSRM route — solid line
        polylineRef.current.setLatLngs(routeCoords)
        polylineRef.current.setStyle({ dashArray: undefined, opacity: 0.9 })
      } else {
        // Fallback straight line — dashed
        polylineRef.current.setLatLngs([[driverLat, driverLng], [customerLat, customerLng]])
        polylineRef.current.setStyle({ dashArray: "6 4", opacity: 0.7 })
      }
    }
  }, [driverLat, driverLng, customerLat, customerLng, routeCoords])

  if (driverLat == null && driverLng == null) {
    return <MapLoading />
  }

  return (
    <div className="rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl bg-card/50 backdrop-blur-3xl">
      <EtaBanner etaLabel={etaLabel} distanceKm={distanceKm} lastUpdated={lastUpdated} />
      <div ref={mapRef} className="w-full h-80" />
    </div>
  )
}
