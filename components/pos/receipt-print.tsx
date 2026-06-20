"use client"

import type { PosOrder } from "@/lib/pos-types"
import { useTranslation } from "@/lib/use-translation"

interface ReceiptPrintProps {
  order: PosOrder | null
  paid?: number
  change?: number
}

export function ReceiptPrint({ order, paid, change }: ReceiptPrintProps) {
  const { t, lang } = useTranslation()

  if (!order) return null

  const cur = lang === "ar" ? "د.ج" : "DA"
  const date = order.createdAt.toLocaleString(lang === "fr" ? "fr-FR" : "en-US")
  const typeLabel =
    order.orderType === "takeaway" ? t("pos.takeaway") :
    order.orderType === "delivery" ? "LIVRAISON / توصيل" :
    `${t("pos.table")} ${order.tableNumber || "—"}`

  return (
    <div id="receipt-print" className="print-only" aria-hidden="true">
      <div className="receipt-content">
        <div className="receipt-header">
          <div className="receipt-logo">{t("receipt.header")}</div>
          <p className="receipt-number">#{order.orderNumber}</p>
          <p className="receipt-meta">{typeLabel}</p>
          <p className="receipt-meta">{date}</p>
        </div>

        <div className="receipt-divider" />

        <table className="receipt-items">
          <thead>
            <tr>
              <th className="receipt-th-left">{t("receipt.qty")}</th>
              <th className="receipt-th-left">{t("receipt.item")}</th>
              <th className="receipt-th-right">{t("receipt.price")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="receipt-td-left">{item.quantity}x</td>
                <td className="receipt-td-left">{item.name}</td>
                <td className="receipt-td-right">{(item.price * item.quantity).toFixed(2)} {cur}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div className="receipt-total-row">
            <span>{t("pos.total")}</span>
            <span className="receipt-amount">{order.total.toFixed(2)} {cur}</span>
          </div>
          {paid !== undefined && change !== undefined && (
            <>
              <div className="receipt-total-row">
                <span>{t("pos.paid")}</span>
                <span>{paid.toFixed(2)} {cur}</span>
              </div>
              <div className="receipt-total-row">
                <span>{t("pos.change")}</span>
                <span className="receipt-change">{change.toFixed(2)} {cur}</span>
              </div>
            </>
          )}
        </div>

        <p className="receipt-footer">{t("pos.thankYou")}</p>
        {order.orderType === "delivery" && order.customerPhone && (
          <p className="receipt-delivery-phone">
            {String(order.customerPhone ?? "")}
          </p>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print {
            position: fixed; inset: 0; display: flex;
            align-items: center; justify-content: center;
          }
          @page { margin: 0; size: 80mm auto; }
        }
        .print-only { display: none; }
        .receipt-content {
          width: 72mm; margin: 0 auto;
          padding: 4mm 2mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px; color: #000;
          line-height: 1.35;
        }
        .receipt-header { text-align: center; margin-bottom: 4px; }
        .receipt-logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
        .receipt-number { font-size: 11px; font-weight: bold; margin: 1px 0; }
        .receipt-meta { font-size: 9px; color: #333; margin: 1px 0; }
        .receipt-divider { border-top: 1px dashed #000; margin: 4px 0; }
        .receipt-items { width: 100%; border-collapse: collapse; }
        .receipt-items td, .receipt-items th { padding: 1px 2px; font-size: 9px; }
        .receipt-th-left { text-align: left; font-size: 8px; text-transform: uppercase; color: #555; }
        .receipt-th-right { text-align: right; font-size: 8px; text-transform: uppercase; color: #555; }
        .receipt-td-left { text-align: left; }
        .receipt-td-right { text-align: right; white-space: nowrap; }
        .receipt-total-row { display: flex; justify-content: space-between; padding: 1px 2px; font-size: 9px; }
        .receipt-amount { font-weight: bold; font-size: 10px; }
        .receipt-change { color: #000; }
        .receipt-footer { text-align: center; margin-top: 8px; font-size: 9px; color: #555; }
        .receipt-delivery-phone { text-align: center; margin-top: 4px; font-size: 14px; font-weight: bold; }
      `}</style>
    </div>
  )
}
