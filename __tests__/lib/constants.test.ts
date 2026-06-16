import { describe, it, expect } from "vitest"
import {
  SIZES,
  ORDER_STATUSES,
  DB_STATUS_TO_POS,
  POS_STATUS_TO_DB,
  DB_STATUS_TO_KITCHEN,
  SAUCES,
} from "@/lib/constants"

describe("constants", () => {
  it("SIZES has correct values", () => {
    expect(SIZES).toEqual(["L", "XL", "XXL"])
  })

  it("ORDER_STATUSES has correct order", () => {
    expect(ORDER_STATUSES).toEqual(["pending", "preparing", "ready", "out_for_delivery", "completed", "cancelled"])
  })

  it("DB_STATUS_TO_POS maps correctly", () => {
    expect(DB_STATUS_TO_POS.preparing).toBe("preparing")
    expect(DB_STATUS_TO_POS.ready).toBe("ready")
    expect(DB_STATUS_TO_POS.out_for_delivery).toBe("out_for_delivery")
    expect(DB_STATUS_TO_POS.cancelled).toBe("cancelled")
  })

  it("POS_STATUS_TO_DB maps correctly", () => {
    expect(POS_STATUS_TO_DB.pending).toBe("pending")
    expect(POS_STATUS_TO_DB.preparing).toBe("preparing")
    expect(POS_STATUS_TO_DB.ready).toBe("ready")
    expect(POS_STATUS_TO_DB.completed).toBe("completed")
    expect(POS_STATUS_TO_DB.cancelled).toBe("cancelled")
  })

  it("DB_STATUS_TO_KITCHEN maps correctly", () => {
    expect(DB_STATUS_TO_KITCHEN.pending).toBe("pending")
    expect(DB_STATUS_TO_KITCHEN.preparing).toBe("preparing")
    expect(DB_STATUS_TO_KITCHEN.ready).toBe("ready")
  })

  it("SAUCES has correct entries", () => {
    expect(SAUCES).toHaveLength(2)
    expect(SAUCES[0]).toEqual({ id: 1, label: "Sauce Tomate" })
    expect(SAUCES[1]).toEqual({ id: 2, label: "Crème Fraîche" })
  })
})
