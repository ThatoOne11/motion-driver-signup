import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { SupabaseEdgeFunctions } from '@core/constants/supabase.constants';
import {
  InspectorMatch,
  InspectorSearchResult,
  InspectorSearchType,
} from '../config/inspector-search.config';

type InspectorSearchResponse = {
  Matches?: InspectorMatch[];
  MatchCount?: number;
  HasErrors: boolean;
  ErrorMessage?: string;
};

@Injectable({
  providedIn: 'root',
})
export class InspectorSearchService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly GENERIC_ERROR =
    'There was a system error while searching. Please contact the tech support team for help.';

  private formatError(message?: string): string {
    if (!message) {
      return this.GENERIC_ERROR;
    }
    if (message.includes('Edge Function returned a non-2xx status code')) {
      return this.GENERIC_ERROR;
    }
    return message;
  }

  async searchInspectorMatches(
    type: InspectorSearchType,
    searchValue: string,
  ): Promise<InspectorSearchResult> {
    try {
      const { data, error } =
        await this.supabase.supabaseClient.functions.invoke<InspectorSearchResponse>(
          SupabaseEdgeFunctions.INSPECTOR_SEARCH,
          {
            body: { type, searchValue },
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.HasErrors) {
        throw new Error(data.ErrorMessage);
      }

      const matches = data?.Matches ?? [];
      const matchCount =
        typeof data?.MatchCount === 'number' ? data.MatchCount : matches.length;

      return {
        matches,
        matchCount,
        hasErrors: data?.HasErrors ?? false,
        errorMessage: data?.ErrorMessage,
      };
    } catch (err) {
      throw new Error(this.formatError((err as Error)?.message));
    }
  }
}
