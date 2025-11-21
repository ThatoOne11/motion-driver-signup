import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { SupabaseEdgeFunctions } from '@core/constants/supabase.constants';
import { InspectorRegisterDetails } from '../config/inspector-search.config';

type RegisterDriverResponse = {
  HasErrors: boolean;
  ErrorMessage?: string;
};

@Injectable({
  providedIn: 'root',
})
export class InspectorSignUpService {
  private readonly supabase = inject(SupabaseClientService);

  private readonly GENERIC_ERROR =
    'There was a system error while signing up this driver. Please contact the tech support team for help.';

  private formatError(message?: string): string {
    if (!message) {
      return this.GENERIC_ERROR;
    }
    if (message.includes('Edge Function returned a non-2xx status code')) {
      return this.GENERIC_ERROR;
    }
    return message;
  }

  async registerInspectorDriver(
    details: InspectorRegisterDetails,
  ): Promise<void> {
    try {
      const { error, data } =
        await this.supabase.supabaseClient.functions.invoke<RegisterDriverResponse>(
          SupabaseEdgeFunctions.REGISTER_DRIVER,
          {
            body: details,
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.HasErrors) {
        throw new Error(data.ErrorMessage ?? this.GENERIC_ERROR);
      }
    } catch (err) {
      throw new Error(this.formatError((err as Error)?.message));
    }
  }
}
