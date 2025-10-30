// deno-lint-ignore-file no-explicit-any
import type { AirtableFieldMap } from "../config/airtable.config.ts";
import type { DriverProfileInput } from "../config/schema.ts";

export type ResolvedNames = {
  provinceName?: string;
  platformNames?: string[];
  bikeOwnershipName?: string;
  yearsDrivingLabel?: string;
  daysPerWeekValue?: number | string;
};

export function buildAirtableFields(
  fieldMap: AirtableFieldMap,
  input: DriverProfileInput,
  motionId: string,
  resolved?: ResolvedNames
) {
  const fields: Record<string, any> = {};
  fields[fieldMap.fullName] = input.fullName;
  fields[fieldMap.email] = input.email.toLowerCase().trim();
  fields[fieldMap.phone] = input.phone;
  fields[fieldMap.motionId] = motionId;
  fields[fieldMap.province] = resolved?.provinceName ?? input.provinceId;
  fields[fieldMap.platforms] = resolved?.platformNames ?? input.platforms;
  fields[fieldMap.bikeOwnership] =
    resolved?.bikeOwnershipName ?? input.bikeOwnershipId;
  fields[fieldMap.yearsDriving] =
    resolved?.yearsDrivingLabel ?? input.yearsDrivingId;
  fields[fieldMap.daysPerWeek] =
    resolved?.daysPerWeekValue ?? input.daysPerWeek;
  return fields;
}
