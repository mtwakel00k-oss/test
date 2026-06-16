type Level = "INFO" | "WARN" | "ERROR"

function formatData(data: unknown): string {
  if (data instanceof Error) return data.message
  try { return JSON.stringify(data) } catch { return String(data) }
}

function log(level: Level, msg: string, data?: unknown) {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level}] ${msg}${data !== undefined ? " " + formatData(data) : ""}`
  if (level === "ERROR") console.error(line)
  else if (level === "WARN") console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (msg: string, data?: unknown) => log("INFO", msg, data),
  warn: (msg: string, data?: unknown) => log("WARN", msg, data),
  error: (msg: string, data?: unknown) => log("ERROR", msg, data),
}
