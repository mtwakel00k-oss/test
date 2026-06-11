"use client"

import { useEffect, useRef } from "react"

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
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-emerald-600 to-emerald-500 rounded-t-2xl text-white">
      <div className="flex items-center gap-2">
        <span className="text-xl animate-bounce">🛵</span>
        <div>
          <p className="text-sm font-bold">السائق في الطريق</p>
          {eta && <p className="text-xs opacity-90">يصل خلال {eta}</p>}
        </div>
      </div>
      {lastUpdated && (
        <p className="text-[10px] opacity-70">
          آخر تحديث: {new Date(lastUpdated).toLocaleTimeString("ar")}
        </p>
      )}
    </div>
  )
}

function MapLoading() {
  return (
    <div className="h-64 rounded-2xl bg-muted/30 flex flex-col items-center justify-center gap-3 border border-border">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">جاري تحديد موقع السائق...</p>
    </div>
  )
}

export default function LiveDriverMap(props: LiveMapProps) {
  const { driverLat, driverLng, customerLat, customerLng, lastUpdated } = props
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const customerMarkerRef = useRef<L.Marker | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let map: L.Map | null = null

    async function init() {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      })

      map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      const redIcon = L.divIcon({
        html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      const greenIcon = L.divIcon({
        html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🛵</div>`,
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
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (driverLat != null && driverLng != null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLat, driverLng])
      } else {
        const L = (window as any).L
        if (L && mapInstanceRef.current) {
          const icon = L.divIcon({
            html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))">🛵</div>`,
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
    <div className="rounded-2xl overflow-hidden border border-border shadow-[0_0_20px_rgba(34,197,94,0.08)]">
      <EtaBanner driverLat={driverLat} driverLng={driverLng} customerLat={customerLat} customerLng={customerLng} lastUpdated={lastUpdated} />
      <div ref={mapRef} className="w-full h-64 rounded-b-2xl" />
    </div>
  )
}
