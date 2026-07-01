type Level = "DEBUG" | "INFO" | "WARN" | "ERROR"

const IS_DEV = typeof process !== "undefined" && process.env?.NODE_ENV === "development"

function formatData(data: unknown): string {
  if (data instanceof Error) return data.message
  try { return JSON.stringify(data) } catch { return String(data) }
}

function log(level: Level, msg: string, data?: unknown) {
  if (level === "DEBUG" && !IS_DEV) return
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level}] ${msg}${data !== undefined ? " " + formatData(data) : ""}`
  if (level === "ERROR") console.error(line)
  else if (level === "WARN") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (msg: string, data?: unknown) => log("DEBUG", msg, data),
  info: (msg: string, data?: unknown) => log("INFO", msg, data),
  warn: (msg: string, data?: unknown) => log("WARN", msg, data),
  error: (msg: string, data?: unknown) => log("ERROR", msg, data),
}
