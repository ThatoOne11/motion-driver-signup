export function normalizePhoneZA(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return "+27" + digits.slice(1);
  if (digits.startsWith("27")) return "+" + digits;
  if (raw.startsWith("+")) return raw;
  return raw;
}

