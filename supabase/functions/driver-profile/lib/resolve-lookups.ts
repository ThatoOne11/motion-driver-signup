// deno-lint-ignore-file no-explicit-any
import type { DriverProfileInput } from "../config/schema.ts";

export async function resolveLookupNames(
  supabaseAdmin: any,
  input: DriverProfileInput
) {
  const [province, city, platforms, bike, years] = await Promise.all([
    supabaseAdmin
      .from("provinces")
      .select("name")
      .eq("id", input.provinceId)
      .maybeSingle(),
    supabaseAdmin
      .from("cities")
      .select("name")
      .eq("id", (input as any).cityId)
      .maybeSingle(),
    input.platforms.length
      ? supabaseAdmin.from("platforms").select("name").in("id", input.platforms)
      : Promise.resolve({ data: [] as any[], error: null } as any),
    supabaseAdmin
      .from("bike_ownership_types")
      .select("name")
      .eq("id", input.bikeOwnershipId)
      .maybeSingle(),
    supabaseAdmin
      .from("years_driving_options")
      .select("label")
      .eq("id", input.yearsDrivingId)
      .maybeSingle(),
  ]);

  const platformNames = Array.isArray((platforms as any).data)
    ? (((platforms as any).data as { name?: string }[])
        .map((p) => p?.name)
        .filter(Boolean) as string[])
    : [];

  return {
    provinceName: (province as any)?.data?.name as string | undefined,
    cityName: (city as any)?.data?.name as string | undefined,
    platformNames,
    bikeOwnershipName: (bike as any)?.data?.name as string | undefined,
    yearsDrivingLabel: (years as any)?.data?.label as string | undefined,
    daysPerWeekValue: input.daysPerWeek,
  };
}
