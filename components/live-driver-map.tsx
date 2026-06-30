"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as LeafMap, Marker, Polyline, Circle } from "leaflet"
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

function EtaBadge({
  etaLabel,
  distanceKm,
  lastUpdated,
}: {
  etaLabel: string
  distanceKm: string
  lastUpdated?: string | null
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 300); return () => clearTimeout(t) }, [])

  return (
    <div className={`absolute bottom-4 inset-x-4 z-[1000] transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      <div className="rounded-2xl bg-card/85 backdrop-blur-2xl border border-border/40 shadow-2xl shadow-emerald-500/10 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg className="size-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14l1.5 4H4L5 8z" />
              <circle cx="7" cy="17" r="2" strokeWidth={1.5} />
              <circle cx="17" cy="17" r="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight truncate">السائق في الطريق</p>
            <p className="text-[11px] font-semibold text-emerald-500 leading-tight mt-0.5">{etaLabel} &middot; {distanceKm}</p>
          </div>
        </div>
        {lastUpdated && (
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">آخر تحديث</p>
            <p className="text-[10px] font-bold tabular-nums text-muted-foreground leading-tight mt-0.5">
              {new Date(lastUpdated).toLocaleTimeString("ar")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MapLoading() {
  return (
    <div className="rounded-[2.5rem] border border-border/50 shadow-2xl bg-card/50 backdrop-blur-3xl overflow-hidden">
      <div className="h-80 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-card/50 to-muted/20">
        <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <div className="size-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-center max-w-[200px]">
          <div className="h-3.5 bg-muted rounded-lg w-32 mx-auto animate-pulse" />
          <div className="h-2.5 bg-muted/60 rounded-lg w-24 mx-auto mt-2 animate-pulse" style={{ animationDelay: "100ms" }} />
        </div>
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
  const pulseCircleRef = useRef<Circle | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [routeDistMeters, setRouteDistMeters] = useState<number | null>(null)
  const lastFetchedRef = useRef<{ lat: number; lng: number } | null>(null)
  const orderIdRef = useRef("")

  function getOrderId(): string {
    if (!orderIdRef.current && typeof window !== "undefined") {
      orderIdRef.current = window.location.pathname.split("/").pop() || ""
    }
    return orderIdRef.current
  }

  useEffect(() => {
    if (driverLat == null || driverLng == null || customerLat == null || customerLng == null) return

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
          setRouteCoords(data.geometry.map((c: [number, number]) => [c[1], c[0]] as [number, number]))
        }
        if (data.duration != null) setEtaSeconds(data.duration)
        if (data.distance != null) setRouteDistMeters(data.distance)
        lastFetchedRef.current = { lat: dLat, lng: dLng }
      } catch (e) {
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

  let etaLabel = ""
  let distanceKm = ""
  if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
    if (etaSeconds != null) {
      const minutes = Math.round(etaSeconds / 60)
      etaLabel = minutes <= 1 ? "أقل من دقيقة" : `~${minutes} دقيقة`
    } else {
      const km = haversineKm(driverLat, driverLng, customerLat, customerLng)
      const minutes = Math.round((km / 30) * 60)
      etaLabel = minutes <= 1 ? "أقل من دقيقة" : `~${minutes} دقيقة`
    }
    const km = routeDistMeters != null ? (routeDistMeters / 1000) : haversineKm(driverLat, driverLng, customerLat, customerLng)
    distanceKm = `${km.toFixed(1)} كم`
  }

  // Init map
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

      map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })

      // Custom zoom controls top-left
      L.control.zoom({ position: "topright" }).addTo(map)

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map)

      // Driver marker: green circle with pulse ring
      const driverIcon = L.divIcon({
        html: `<div style="position:relative;width:32px;height:32px"><div style="position:absolute;inset:0;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;z-index:2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l1.5 4H4L5 8z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div></div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      // Customer marker: red dot
      const customerIcon = L.divIcon({
        html: `<div style="position:relative;width:18px;height:18px"><div style="position:absolute;inset:0;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div></div>`,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      if (driverLat != null && driverLng != null) {
        driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map)

        // Pulse ring behind driver
        const pulse = L.circle([driverLat, driverLng], {
          radius: 22,
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.4,
        })
        pulse.addTo(map)
        pulseCircleRef.current = pulse

        // Animate pulse
        let growing = true
        const pulseInterval = setInterval(() => {
          const r = pulse.getRadius()
          if (growing) { if (r >= 45) growing = false; else pulse.setRadius(r + 1) }
          else { if (r <= 22) growing = true; else pulse.setRadius(r - 1) }
        }, 90)
        ;(pulse as unknown as Record<string, unknown>)._pulseInterval = pulseInterval
      }

      if (customerLat != null && customerLng != null) {
        customerMarkerRef.current = L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map)
      }

      if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
        polylineRef.current = L.polyline(
          [[driverLat, driverLng], [customerLat, customerLng]],
          { color: "#22c55e", weight: 3, dashArray: "8 6", opacity: 0.6 },
        ).addTo(map)

        const bounds = L.latLngBounds([driverLat, driverLng], [customerLat, customerLng])
        map.fitBounds(bounds, { padding: [50, 50] })
      } else if (driverLat != null && driverLng != null) {
        map.setView([driverLat, driverLng], 14)
      } else if (customerLat != null && customerLng != null) {
        map.setView([customerLat, customerLng], 14)
      }

      mapInstanceRef.current = map
    }

    init()

    return () => {
      if (map) {
        // Cleanup pulse interval
        if (pulseCircleRef.current) {
          const ci = (pulseCircleRef.current as unknown as Record<string, unknown>)._pulseInterval
          if (ci) clearInterval(ci as number)
        }
        map.remove()
      }
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers, polyline, and pulse ring
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    if (driverLat != null && driverLng != null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng])
      }
      if (pulseCircleRef.current) {
        pulseCircleRef.current.setLatLng([driverLat, driverLng])
      }
    }

    if (customerLat != null && customerLng != null) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLat, customerLng])
      }
    }

    if (polylineRef.current && driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
      if (routeCoords && routeCoords.length > 1) {
        polylineRef.current.setLatLngs(routeCoords)
        polylineRef.current.setStyle({ dashArray: undefined, opacity: 0.85, weight: 4 })
      } else {
        polylineRef.current.setLatLngs([[driverLat, driverLng], [customerLat, customerLng]])
        polylineRef.current.setStyle({ dashArray: "8 6", opacity: 0.6, weight: 3 })
      }
    }

    // Re-fit bounds if both points exist
    if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
      try {
        map.fitBounds(
          [[driverLat, driverLng], [customerLat, customerLng]],
          { padding: [50, 50], maxZoom: 16 },
        )
      } catch { /* bounds fitting might fail during rapid updates */ }
    }
  }, [driverLat, driverLng, customerLat, customerLng, routeCoords])

  if (driverLat == null && driverLng == null) {
    return <MapLoading />
  }

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden border border-border/40 shadow-2xl bg-card/50 backdrop-blur-3xl">
      <div ref={mapRef} className="w-full h-80" />
      <EtaBadge etaLabel={etaLabel} distanceKm={distanceKm} lastUpdated={lastUpdated} />
    </div>
  )
}
