export function normalizeEmail(raw?: string | null) {
  if (!raw) return undefined;
  return String(raw).trim().toLowerCase();
}

export function normalizePhoneZA(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0"))
    return "+27" + digits.slice(1);
  if (digits.startsWith("27")) return "+" + digits;
  if (String(raw).startsWith("+")) return String(raw);
  return String(raw);
}

export function phoneDigits(raw?: string | null) {
  if (!raw) return undefined;
  const d = String(raw).replace(/\D/g, "");
  return d.length ? d : undefined;
}
