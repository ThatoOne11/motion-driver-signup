export function normalizePhoneNumber(
  raw: string,
  defaultCountryCode?: string
): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const ccClean = (defaultCountryCode ?? "").replace(/^\+/, "");
  if (digitsOnly.length === 0) return "";

  // Honor an explicit international prefix
  if (trimmed.startsWith("+")) {
    return digitsOnly ? `+${digitsOnly}` : "+";
  }
  if (trimmed.startsWith("00")) {
    return digitsOnly.slice(2) ? `+${digitsOnly.slice(2)}` : "+";
  }

  // Remove a single leading zero for local numbers and prepend the default CC when available
  const local = digitsOnly.startsWith("0") ? digitsOnly.slice(1) : digitsOnly;

  if (ccClean) return `+${ccClean}${local}`;
  return local;
}
