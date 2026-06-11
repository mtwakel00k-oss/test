const COUNTRY_PREFIXES: Record<string, string> = {
  dz: "213",
  fr: "33",
  us: "1",
  gb: "44",
};

export function formatPhone(
  raw: string,
  country: keyof typeof COUNTRY_PREFIXES = "dz",
): string {
  const digits = raw.replace(/[^0-9]/g, "")
  const prefix = COUNTRY_PREFIXES[country] ?? "213"

  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.startsWith(prefix)) return digits
  if (digits.startsWith("0")) return prefix + digits.slice(1)

  return prefix + digits
}
