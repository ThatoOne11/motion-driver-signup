import { inject, Injectable } from "@angular/core";

import { SupabaseClientService } from "@core/services/supabase-client.service";
import {
  DriverSignUpOption,
  DriverSignUpYearsOption,
} from "@account/models/driver-sign-up/driver-sign-up-form.types";

export type DriverSignUpStaticOptions = {
  platforms: DriverSignUpOption[];
  provinces: DriverSignUpOption[];
  bikeOwnershipTypes: DriverSignUpOption[];
  yearsDrivingOptions: DriverSignUpYearsOption[];
  daysPerWeek: { value: number }[];
};

@Injectable({
  providedIn: "root",
})
export class DriverSignUpDataService {
  private readonly supabase = inject(SupabaseClientService);

  async loadStaticOptions(): Promise<DriverSignUpStaticOptions> {
    const client = this.supabase.supabaseClient;
    const [platforms, provinces, bikeTypes, years, days] = await Promise.all([
      client
        .from("platforms")
        .select("id, name")
        .order("name", { ascending: true }),
      client
        .from("provinces")
        .select("id, name")
        .order("name", { ascending: true }),
      client
        .from("bike_ownership_types")
        .select("id, name")
        .order("name", { ascending: true }),
      client
        .from("years_driving_options")
        .select("id, label")
        .order("label", { ascending: true }),
      client
        .from("days_per_week_options")
        .select("value")
        .order("value", { ascending: true }),
    ]);

    return {
      platforms: platforms.data ?? [],
      provinces: provinces.data ?? [],
      bikeOwnershipTypes: bikeTypes.data ?? [],
      yearsDrivingOptions: years.data ?? [],
      daysPerWeek: days.data ?? [],
    };
  }

  async loadCities(provinceId: string): Promise<DriverSignUpOption[]> {
    const { data } = await this.supabase.supabaseClient
      .from("cities")
      .select("id, name")
      .eq("province_id", provinceId)
      .order("name", { ascending: true });
    return data ?? [];
  }

  async loadSuburbs(cityId: string): Promise<DriverSignUpOption[]> {
    const { data } = await this.supabase.supabaseClient
      .from("suburbs")
      .select("id, name")
      .eq("city_id", cityId)
      .order("name", { ascending: true });
    return data ?? [];
  }
}
