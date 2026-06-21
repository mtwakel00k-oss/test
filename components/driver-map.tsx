"use client"

import { useEffect, useRef } from "react"
import type L from "leaflet"
import { useTheme } from "@/lib/theme"

interface DriverMapProps {
  driverLat: number
  driverLng: number
  customerLat: number
  customerLng: number
}

export default function DriverMap({ driverLat, driverLng, customerLat, customerLng }: DriverMapProps) {
  const isDark = useTheme().resolved === "dark"
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const leafletRef = useRef<typeof L | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let cancelled = false

    ;(async () => {
      const leaflet = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      if (cancelled || !mapRef.current) return
      const L = leaflet.default
      leafletRef.current = L

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([driverLat, driverLng], 14)

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map)

      const driverIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;">D</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const customerIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;">C</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map)
      L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map)

      polylineRef.current = L.polyline(
        [[driverLat, driverLng], [customerLat, customerLng]],
        { color: "#22c55e", weight: 2, dashArray: "8, 8" },
      ).addTo(map)

      const bounds = L.latLngBounds([driverLat, driverLng], [customerLat, customerLng])
      map.fitBounds(bounds, { padding: [50, 50] })

      mapInstanceRef.current = map
    })()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapInstanceRef.current || !driverMarkerRef.current) return
    driverMarkerRef.current.setLatLng([driverLat, driverLng])
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([[driverLat, driverLng], [customerLat, customerLng]])
    }
  }, [driverLat, driverLng, customerLat, customerLng])

  return <div ref={mapRef} className="w-full h-full rounded-b-2xl" />
}
