import {
  AIRTABLE_USERS_FIELDS,
  AIRTABLE_FIELDS,
} from "../../driver-profile/config/airtable.config.ts";

export function buildUsersFormula(
  email?: string,
  phoneDigits?: string,
  esc: (v: string) => string = (v) => v
) {
  const parts: string[] = [];
  const hasEmail = !!email;
  const hasPhone = !!phoneDigits;
  if (email)
    parts.push(`LOWER({${AIRTABLE_USERS_FIELDS.email}})='${esc(email)}'`);
  if (phoneDigits)
    parts.push(
      `REGEX_REPLACE({${AIRTABLE_USERS_FIELDS.phone}}, '\\\\D', '')='${phoneDigits}'`
    );
  const formula = parts.length > 1 ? `OR(${parts.join(",")})` : parts[0];
  return { formula, hasEmail, hasPhone };
}

export function buildDriversFormula(
  email?: string,
  phoneDigits?: string,
  esc: (v: string) => string = (v) => v
) {
  const parts: string[] = [];
  const hasEmail = !!email;
  const hasPhone = !!phoneDigits;
  if (email) parts.push(`LOWER({${AIRTABLE_FIELDS.email}})='${esc(email)}'`);
  if (phoneDigits) {
    const phoneFields = [
      AIRTABLE_FIELDS.phone,
      AIRTABLE_FIELDS.secondaryPhone,
    ].filter(Boolean) as string[];
    for (const fieldId of phoneFields) {
      parts.push(`REGEX_REPLACE({${fieldId}}, '\\\\D', '')='${phoneDigits}'`);
    }
  }
  const formula = parts.length > 1 ? `OR(${parts.join(",")})` : parts[0];
  return { formula, hasEmail, hasPhone };
}
