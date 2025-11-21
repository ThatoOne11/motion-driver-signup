import { inject, Injectable } from '@angular/core';

import { SupabaseClientService } from '@core/services/supabase-client.service';
import { DriverSignUpFormModel } from '@account/models/driver-sign-up/driver-sign-up-form.types';

export type DriverSignUpSubmissionResult =
  | { ok: true }
  | { ok: false; kind: 'server' | 'timeout'; message: string };

@Injectable({
  providedIn: 'root',
})
export class DriverSignUpSubmissionService {
  private readonly supabase = inject(SupabaseClientService);

  async submit(
    value: DriverSignUpFormModel,
  ): Promise<DriverSignUpSubmissionResult> {
    const { data: session } =
      await this.supabase.supabaseClient.auth.getSession();
    const userId = session.session?.user?.id;
    const email = session.session?.user?.email ?? '';

    let fullName = '';
    let phone = '';
    if (userId) {
      const { data: userRow } = await this.supabase.supabaseClient
        .from('users')
        .select('display_name, phone_number')
        .eq('id', userId)
        .maybeSingle();
      fullName = userRow?.display_name ?? '';
      phone = userRow?.phone_number ?? '';
    }

    const payload = {
      fullName,
      email,
      phone,
      provinceId: value.province,
      cityId: value.city,
      suburbId: value.suburb,
      platforms: value.platforms,
      bikeOwnershipId: value.bikeOwnership,
      yearsDrivingId: value.yearsDriving,
      daysPerWeek: Number(value.daysPerWeek),
    };

    try {
      const invokePromise = this.supabase.supabaseClient.functions.invoke(
        'driver-profile',
        { body: payload },
      );
      const raced: any = await Promise.race([
        invokePromise,
        new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 20000),
        ),
      ]);

      if (raced?.timeout) {
        const message =
          'The request took too long. Please try again. or if the error persists please contact MotionAds support.';
        return { ok: false, kind: 'timeout', message };
      }

      const { data, error } = raced as {
        data: any;
        error: { message?: string } | null;
      };

      if (error || data?.HasErrors) {
        const message = this.friendlyErrorMessage(error?.message, data);
        return { ok: false, kind: 'server', message };
      }

      return { ok: true };
    } catch (e: any) {
      const message =
        this.friendlyErrorMessage(e?.message, undefined) ||
        'Unexpected error. Please try again.';
      return { ok: false, kind: 'server', message };
    }
  }

  private friendlyErrorMessage(raw?: string, data?: any): string {
    if (data?.Message) return String(data.Message);
    if (data?.Error) return String(data.Error);
    const m = raw || '';
    if (/non-2xx status code/i.test(m)) {
      return 'We could not save your profile. Please try again, or if the error persists please contact MotionAds support.';
    }
    if (/UNKNOWN_FIELD_NAME/i.test(m)) {
      return 'A configuration error occurred. Please try again later, or if the error persists please contact MotionAds support.';
    }
    if (/INVALID_MULTIPLE_CHOICE_OPTIONS/i.test(m)) {
      return 'One of the selected options is not allowed. Please select a different option, or if the error persists please contact MotionAds support.';
    }
    if (/timeout/i.test(m)) {
      return 'The request timed out. Please try again, or if the error persists please contact MotionAds support.';
    }
    return (
      m ||
      'Something went wrong. Please try again, or if the error persists please contact MotionAds support.'
    );
  }
}
