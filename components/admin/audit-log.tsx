"use client"

import { useEffect, useState, useCallback } from "react"
import { History, ChevronLeft, ChevronRight, Filter, RefreshCw, Eye } from "lucide-react"
import { fetchApi } from "@/lib/tenant"
import { useTranslation } from "@/lib/use-translation"
import type { AuditLogRow } from "@/app/api/admin/audit-log/route"

const OPERATION_COLORS: Record<string, string> = {
  INSERT: "text-emerald-400 bg-emerald-500/10",
  UPDATE: "text-amber-400 bg-amber-500/10",
  DELETE: "text-rose-400 bg-rose-500/10",
}

const TABLE_LABELS: Record<string, string> = {
  produits: "Products",
  categories: "Categories",
  orders: "Orders",
  order_items: "Order Items",
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export function AuditLog() {
  const { t, lang, dir } = useTranslation()
  const [data, setData] = useState<AuditLogRow[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [tableFilter, setTableFilter] = useState("")
  const [operationFilter, setOperationFilter] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const perPage = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(perPage), offset: String(page * perPage) })
      if (tableFilter) params.set("table", tableFilter)
      if (operationFilter) params.set("operation", operationFilter)
      const res = await fetchApi(`/api/admin/audit-log?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json.data || [])
      setCount(json.count || 0)
    } catch {} finally { setLoading(false) }
  }, [page, tableFilter, operationFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(count / perPage)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{t("admin.auditLog")}</h3>
          <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
        </div>
        <button onClick={fetchLogs} className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button onClick={() => { setTableFilter(""); setPage(0) }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${!tableFilter ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}>
            {t("common.all")}
          </button>
          {["produits", "categories", "orders"].map((tbl) => (
            <button key={tbl} onClick={() => { setTableFilter(tbl); setPage(0) }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${tableFilter === tbl ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}>
              {TABLE_LABELS[tbl] || tbl}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 p-0.5 rounded-lg border border-white/5">
          {["", "INSERT", "UPDATE", "DELETE"].map((op) => (
            <button key={op} onClick={() => { setOperationFilter(op); setPage(0) }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${operationFilter === op ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}>
              {op || t("common.all")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t("admin.noAuditLogs")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{t("admin.time")}</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{t("admin.table")}</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{t("admin.operation")}</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{t("admin.user")}</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-[10px] uppercase tracking-wider">{t("admin.details")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-medium text-foreground">{TABLE_LABELS[row.table_name] || row.table_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${OPERATION_COLORS[row.operation] || ""}`}>
                        {row.operation}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-foreground">{row.changed_by || "—"}</div>
                      {row.changed_by_role && (
                        <div className="text-[10px] text-muted-foreground">{row.changed_by_role}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {count > perPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground">
              {page * perPage + 1}–{Math.min((page + 1) * perPage, count)} / {count}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="h-7 w-7 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="h-7 w-7 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {expanded && (() => {
        const row = data.find(r => r.id === expanded)
        if (!row) return null
        return (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">{t("admin.auditDetails")}</h4>
              <button onClick={() => setExpanded(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
                {t("common.close")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground block">{t("admin.recordId")}</span>
                <span className="text-xs text-foreground font-mono">{row.record_id || "—"}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">{t("admin.ipAddress")}</span>
                <span className="text-xs text-foreground font-mono">{row.ip_address || "—"}</span>
              </div>
            </div>
            {row.new_data && (
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.newValues")}</span>
                <pre className="text-[10px] text-foreground bg-white/5 rounded-lg p-3 overflow-x-auto max-h-48">
                  {JSON.stringify(row.new_data, null, 2)}
                </pre>
              </div>
            )}
            {row.old_data && (
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">{t("admin.oldValues")}</span>
                <pre className="text-[10px] text-foreground bg-white/5 rounded-lg p-3 overflow-x-auto max-h-48">
                  {JSON.stringify(row.old_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
