"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { History, ChevronLeft, ChevronRight, RefreshCw, Eye, X } from "lucide-react"
import { fetchApi } from "@/lib/tenant"
import { logger } from "@/lib/logger"
import { useTranslation } from "@/lib/use-translation"
import { motion, AnimatePresence } from "framer-motion"
import type { AuditLogRow } from "@/app/api/admin/audit-log/route"

const OPERATION_STYLES: Record<string, string> = {
  INSERT: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  UPDATE: "text-neutral-300 bg-neutral-500/10 border-neutral-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  TOGGLE_RESTAURANT_STATUS: "text-amber-400 bg-amber-500/10 border-amber-500/20",
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function getOperationKey(row: AuditLogRow): string {
  if (row.operation === "UPDATE" && (row.new_data as Record<string, unknown>)?.action === "status_toggle") {
    return "TOGGLE_RESTAURANT_STATUS"
  }
  return row.operation
}

function parseData(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return {} } }
  if (typeof raw === "object") return raw as Record<string, unknown>
  return {}
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  admin: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  cashier: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  driver: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><line x1="15" y1="9" x2="19" y2="9" /><polyline points="9 17 9 5 3 5" /><path d="M3 5l4 4 3-4" /></svg>,
  customer: <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
}

export function AuditLog() {
  const { t } = useTranslation()

  const TABLE_LABELS: Record<string, string> = useMemo(() => ({
    all: t("audit.allTables"),
    orders: t("audit.tableOrders"),
    produits: t("audit.tableProduits"),
    categories: t("audit.tableCategories"),
    tenants: t("audit.tableTenants"),
    order_items: t("audit.tableOrderItems"),
  }), [t])

  const ACTION_LABELS: Record<string, string> = useMemo(() => ({
    all: t("audit.allActions"),
    INSERT: t("audit.actionInsert"),
    UPDATE: t("audit.actionUpdate"),
    DELETE: t("audit.actionDelete"),
    TOGGLE_RESTAURANT_STATUS: t("audit.actionToggleStatus"),
  }), [t])

  const KEY_LABELS: Record<string, string> = useMemo(() => ({
    nom: t("audit.keyNom"),
    name: t("audit.keyName"),
    description: t("audit.keyDescription"),
    price: t("audit.keyPrice"),
    image_url: t("audit.keyImageUrl"),
    categorie_id: t("audit.keyCategorieId"),
    sizesCount: t("audit.keySizesCount"),
    is_open: t("audit.keyIsOpen"),
    is_available: t("audit.keyIsAvailable"),
    status: t("audit.keyStatus"),
    total: t("audit.keyTotal"),
    order_type: t("audit.keyOrderType"),
    order_number: t("audit.keyOrderNumber"),
    customer_name: t("audit.keyCustomerName"),
    itemCount: t("audit.keyItemCount"),
    action: t("audit.keyAction"),
    driver_id: t("audit.keyDriverId"),
    cashier_id: t("audit.keyCashierId"),
  }), [t])

  const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = useMemo(() => ({
    owner: { label: t("audit.roleOwner"), icon: ROLE_ICONS.owner },
    admin: { label: t("audit.roleAdmin"), icon: ROLE_ICONS.admin },
    cashier: { label: t("audit.roleCashier"), icon: ROLE_ICONS.cashier },
    driver: { label: t("audit.roleDriver"), icon: ROLE_ICONS.driver },
    customer: { label: t("audit.roleCustomer"), icon: ROLE_ICONS.customer },
  }), [t])

  const getActionLabel = useCallback((row: AuditLogRow): string => {
    return ACTION_LABELS[getOperationKey(row)] || row.operation
  }, [ACTION_LABELS])

  const renderValue = useCallback((key: string, val: unknown): { text: string; color: string } => {
    if (val === null || val === undefined || val === "") return { text: "—", color: "text-neutral-600" }

    if (key === "is_open") {
      return val === true
        ? { text: t("audit.open"), color: "text-emerald-400" }
        : { text: t("audit.closed"), color: "text-rose-400" }
    }

    if (key === "is_available") {
      return val === true
        ? { text: t("audit.available"), color: "text-emerald-400" }
        : { text: t("audit.unavailable"), color: "text-rose-400" }
    }

    if (key === "status") {
      const statusMap: Record<string, { text: string; color: string }> = {
        pending: { text: t("audit.statusPending"), color: "text-amber-400" },
        confirmed: { text: t("audit.statusConfirmed"), color: "text-emerald-400" },
        preparing: { text: t("audit.statusPreparing"), color: "text-sky-400" },
        ready: { text: t("audit.statusReady"), color: "text-emerald-400" },
        out_for_delivery: { text: t("audit.statusOutForDelivery"), color: "text-blue-400" },
        delivered: { text: t("audit.statusDelivered"), color: "text-emerald-400" },
        completed: { text: t("audit.statusCompleted"), color: "text-emerald-400" },
        cancelled: { text: t("audit.statusCancelled"), color: "text-rose-400" },
      }
      const sv = String(val).toLowerCase()
      return statusMap[sv] || { text: String(val), color: "text-neutral-300" }
    }

    if (typeof val === "boolean") {
      return val
        ? { text: t("common.yes"), color: "text-emerald-400" }
        : { text: t("common.no"), color: "text-rose-400" }
    }

    if (typeof val === "number") {
      return { text: val.toLocaleString("ar-DZ"), color: "text-neutral-100" }
    }

    return { text: String(val), color: "text-neutral-100" }
  }, [t])

  function DataGridLocal({ data, label, kLabels }: { data: Record<string, unknown>; label: string; kLabels: Record<string, string> }) {
    const entries = Object.entries(parseData(data)).filter(([k]) => k !== "action")
    if (entries.length === 0) return null
    return (
      <div>
        <span className="text-[10px] text-neutral-600 block mb-2">{label}</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {entries.map(([key, val]) => {
            const displayKey = kLabels[key] || key
            const { text, color } = renderValue(key, val)
            return (
              <div key={key} className="flex flex-col gap-1 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <span className="text-[11px] text-neutral-500">{displayKey}</span>
                <span className={`text-sm font-medium ${color}`}>{text}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function RoleBadgeLocal({ role }: { role: string }) {
    const rl = ROLE_LABELS[role.toLowerCase()]
    if (!rl) return <span className="text-[10px] text-neutral-600">{role}</span>
    return (
      <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-md text-[11px] font-medium w-max px-2 py-0.5">
        {rl.icon}
        {rl.label}
      </span>
    )
  }

  const [raw, setRaw] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [tableFilter, setTableFilter] = useState("all")
  const [operationFilter, setOperationFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const perPage = 50

  const fetchLogs = useCallback(async () => {
    queueMicrotask(() => setLoading(true))
    try {
      const params = new URLSearchParams({ limit: String(500), offset: "0" })
      const res = await fetchApi(`/api/admin/audit-log?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setRaw(json.data || [])
    } catch (e) { logger.warn("Failed to fetch audit log", e) } finally { queueMicrotask(() => setLoading(false)) }
  }, [])

  useEffect(() => { queueMicrotask(() => fetchLogs()) }, [fetchLogs])

  const filtered = useMemo(() => {
    let result = raw
    if (tableFilter !== "all") {
      result = result.filter(r => r.table_name === tableFilter)
    }
    if (operationFilter !== "all") {
      if (operationFilter === "TOGGLE_RESTAURANT_STATUS") {
        result = result.filter(r => getOperationKey(r) === "TOGGLE_RESTAURANT_STATUS")
      } else {
        result = result.filter(r => r.operation === operationFilter)
      }
    }
    return result
  }, [raw, tableFilter, operationFilter])

  const paginated = useMemo(() => {
    return filtered.slice(page * perPage, (page + 1) * perPage)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / perPage)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-neutral-500/10 text-neutral-400 flex items-center justify-center">
            <History className="size-4" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t("admin.auditLog")}</h3>
          <span className="text-[10px] text-muted-foreground bg-neutral-500/10 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <button
          onClick={fetchLogs}
          className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-neutral-400 hover:bg-white/[0.10] hover:text-neutral-300 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/40"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.04]">
          {(["all", "orders", "produits", "categories"] as const).map((tbl) => {
            const active = tableFilter === tbl
            return (
              <button
                key={tbl}
                onClick={() => { setTableFilter(tbl); setPage(0) }}
                className={`relative px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                  active
                    ? "bg-neutral-800 text-white border border-neutral-700 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] border border-transparent"
                }`}
                style={{ minHeight: 36 }}
              >
                {TABLE_LABELS[tbl] || tbl}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.04]">
          {(["all", "INSERT", "UPDATE", "DELETE", "TOGGLE_RESTAURANT_STATUS"] as const).map((op) => {
            const active = operationFilter === op
            return (
              <button
                key={op}
                onClick={() => { setOperationFilter(op); setPage(0) }}
                className={`relative px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                  active
                    ? "bg-neutral-800 text-white border border-neutral-700 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] border border-transparent"
                }`}
                style={{ minHeight: 36 }}
              >
                {ACTION_LABELS[op] || op}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4"
          >
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-white/[0.04] " />
            ))}
          </motion.div>
        ) : paginated.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center"
          >
            <svg className="size-10 mx-auto text-neutral-500/40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm text-neutral-500">{t("audit.noLogs")}</p>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden backdrop-blur-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium text-[10px] uppercase tracking-wider">{t("admin.time")}</th>
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium text-[10px] uppercase tracking-wider">{t("admin.table")}</th>
                    <th className="text-center px-4 py-3 text-neutral-500 font-medium text-[10px] uppercase tracking-wider">{t("admin.operation")}</th>
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium text-[10px] uppercase tracking-wider">{t("admin.user")}</th>
                    <th className="text-right px-4 py-3 text-neutral-500 font-medium text-[10px] uppercase tracking-wider">{t("admin.details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row) => {
                    const opKey = getOperationKey(row)
                    const opStyle = OPERATION_STYLES[opKey] || "text-neutral-400 bg-neutral-500/10 border-neutral-500/20"
                    return (
                      <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-[11px] text-neutral-500 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-neutral-300">{TABLE_LABELS[row.table_name] || row.table_name}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${opStyle}`}>
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              {opKey === "INSERT" ? <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></> : null}
                              {opKey === "UPDATE" ? <><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" /><polygon points="18 2 22 6 12 16 8 16 8 12 18 2" /></> : null}
                              {opKey === "DELETE" ? <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> : null}
                              {opKey === "TOGGLE_RESTAURANT_STATUS" ? <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> : null}
                            </svg>
                            {getActionLabel(row)}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="flex flex-col gap-1.5">
                            {row.changed_by_role && <RoleBadgeLocal role={row.changed_by_role} />}
                            <span className="text-sm font-medium text-neutral-300 truncate">{row.changed_by || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                            className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.08] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/40"
                            style={{ minHeight: 44, minWidth: 44 }}
                          >
                            <Eye className="size-3.5" strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > perPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                <span className="text-[11px] text-neutral-500">
                  {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} / {filtered.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.08] disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/40"
                    style={{ minHeight: 44, minWidth: 44 }}
                  >
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.08] disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/40"
                    style={{ minHeight: 44, minWidth: 44 }}
                  >
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (() => {
          const row = [...raw].find(r => r.id === expanded)
          if (!row) return null
          const newData = parseData(row.new_data)
          const oldData = parseData(row.old_data)
          return (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-5 text-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-neutral-300">{t("audit.details")}</h4>
                <button
                  onClick={() => setExpanded(null)}
                  className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] transition-all"
                  style={{ minHeight: 44, minWidth: 44 }}
                >
                  <X className="size-3.5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Meta info row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-neutral-600 block mb-0.5">{t("audit.recordId")}</span>
                  <span className="text-xs text-neutral-300 font-mono">{row.record_id || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block mb-0.5">IP</span>
                  <span className="text-xs text-neutral-300 font-mono">{row.ip_address || "—"}</span>
                </div>
              </div>

              {/* Changed by */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 block">{t("admin.user")}</span>
                <div className="flex items-center gap-2.5">
                  {row.changed_by_role && <RoleBadgeLocal role={row.changed_by_role} />}
                  <span className="text-sm text-neutral-300">{row.changed_by || "—"}</span>
                </div>
              </div>

              {/* New values grid */}
              <DataGridLocal data={newData} label={t("audit.newValues")} kLabels={KEY_LABELS} />

              {/* Old values grid */}
              <DataGridLocal data={oldData} label={t("audit.oldValues")} kLabels={KEY_LABELS} />
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
