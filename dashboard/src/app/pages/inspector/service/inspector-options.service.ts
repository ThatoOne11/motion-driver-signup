import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { SupabaseTables } from '@core/constants/supabase.constants';

export type InspectorOption = {
  id: string;
  name: string;
};

@Injectable({
  providedIn: 'root',
})
export class InspectorOptionsService {
  private readonly supabase = inject(SupabaseClientService);

  async getInspectorOptions(): Promise<InspectorOption[]> {
    const { data, error } = await this.supabase.supabaseClient
      .from(SupabaseTables.INSPECTOR_OPTIONS)
      .select('id, name')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Unable to load inspector options', error);
      return [];
    }

    return data ?? [];
  }
}
