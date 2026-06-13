"use client"

import { createContext, useContext, useState, useEffect, useCallback, startTransition, type ReactNode } from "react"
import { fetchApi } from "@/lib/tenant"

export interface StaffMember {
  id: string
  name: string
  role: string
  is_active: boolean
}

interface StaffCtx {
  activeStaff: StaffMember | null
  staffList: StaffMember[]
  setActiveStaff: (staff: StaffMember | null) => void
  loading: boolean
}

const STAFF_KEY = "active_staff"

const StaffCtx = createContext<StaffCtx | null>(null)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [activeStaff, setActiveStaffState] = useState<StaffMember | null>(null)
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    startTransition(() => setLoading(true))
    try {
      const saved = localStorage.getItem(STAFF_KEY)
      if (saved) startTransition(() => setActiveStaffState(JSON.parse(saved)))
    } catch {}
    fetchApi("/api/restaurant-staff")
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        startTransition(() => setStaffList(Array.isArray(data) ? data.filter((s: StaffMember) => s.is_active !== false) : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setActiveStaff = useCallback((staff: StaffMember | null) => {
    setActiveStaffState(staff)
    try {
      if (staff) localStorage.setItem(STAFF_KEY, JSON.stringify(staff))
      else localStorage.removeItem(STAFF_KEY)
    } catch {}
  }, [])

  return (
    <StaffCtx.Provider value={{ activeStaff, staffList, setActiveStaff, loading }}>
      {children}
    </StaffCtx.Provider>
  )
}

export function useStaff() {
  const c = useContext(StaffCtx)
  if (!c) throw new Error("useStaff must be used within StaffProvider")
  return c
}
