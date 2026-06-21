"use client"

import { useEffect, useRef } from "react"
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
  driverLat,
  driverLng,
  customerLat,
  customerLng,
  lastUpdated,
}: LiveMapProps) {
  let eta = ""
  let km = 0
  if (driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
    km = haversineKm(driverLat, driverLng, customerLat, customerLng)
    const minutes = Math.round((km / 30) * 60)
    eta = minutes <= 1 ? "أقل من دقيقة" : `~${minutes} دقيقة`
  }

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
          {eta && <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">يصل خلال {eta}</p>}
        </div>
      </div>
      {lastUpdated && (
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">آخر تحديث</p>
          <p className="text-[10px] font-bold tabular-nums">
            {new Date(lastUpdated).toLocaleTimeString("ar")}
          </p>
        </div>
      )}
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

  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (driverLat != null && driverLng != null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng])
      } else {
        const L = leafletRef.current
        if (L && mapInstanceRef.current) {
          const icon = L.divIcon({
            html: `<div style="width:28px;height:28px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;">D</div>`,
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          driverMarkerRef.current = L.marker([driverLat, driverLng], { icon }).addTo(mapInstanceRef.current)
        }
      }
    }
    if (customerLat != null && customerLng != null) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLat, customerLng])
      }
    }
    if (polylineRef.current && driverLat != null && driverLng != null && customerLat != null && customerLng != null) {
      polylineRef.current.setLatLngs([[driverLat, driverLng], [customerLat, customerLng]])
    }
  }, [driverLat, driverLng, customerLat, customerLng])

  if (driverLat == null && driverLng == null) {
    return <MapLoading />
  }

  return (
    <div className="rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl bg-card/50 backdrop-blur-3xl">
      <EtaBanner driverLat={driverLat} driverLng={driverLng} customerLat={customerLat} customerLng={customerLng} lastUpdated={lastUpdated} />
      <div ref={mapRef} className="w-full h-80" />
    </div>
  )
}
