import { Injectable, inject } from '@angular/core';

import {
  SupabaseEdgeFunctions,
  SupabaseTables,
} from '@core/constants/supabase.constants';
import {
  SupportReturn,
  SupportType,
} from '../components/support-callout/config/support.config';
import { SupabaseClientService } from './supabase-client.service';

type SupportCalloutResponse = {
  HasErrors: boolean;
  Error?: string;
  UserError?: string;
  Message?: string;
  Link?: string;
  Data?: { link?: string; supportPhone?: string; userPhone?: string };
};

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private readonly supabase = inject(SupabaseClientService).supabaseClient;
  private readonly userErrorMessage =
    'There was an issue logging a support ticket. Please contact MotionAds directly for assistance.';

  async getOptionalUserContext(): Promise<{
    phone: string | null;
    name: string | null;
    motionId: string | null;
    email: string | null;
  }> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      const user = session.session?.user;
      const userId = user?.id;
      const email = user?.email ?? null;

      // Pull quick metadata fallbacks from the auth session
      const metaPhone =
        (user?.user_metadata?.['phone'] as string | undefined) ||
        (user?.user_metadata?.['phone_number'] as string | undefined) ||
        null;
      const metaName =
        (user?.user_metadata?.['full_name'] as string | undefined) ||
        (user?.user_metadata?.['display_name'] as string | undefined) ||
        null;
      const metaMotionId =
        (user?.user_metadata?.['airtable_motion_id'] as string | undefined) ||
        null;

      if (!userId) {
        return {
          phone: metaPhone,
          name: metaName,
          motionId: metaMotionId,
          email,
        };
      }

      const { data, error } = await this.supabase
        .from(SupabaseTables.USERS)
        .select('phone_number, display_name, airtable_motion_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return {
          phone: metaPhone,
          name: metaName,
          motionId: metaMotionId,
          email,
        };
      }
      return {
        phone: data?.phone_number || metaPhone || null,
        name: data?.display_name || metaName || null,
        motionId: data?.airtable_motion_id || null,
        email,
      };
    } catch {
      return { phone: null, name: null, motionId: null, email: null };
    }
  }

  async getSupportPhoneNumber(): Promise<SupportReturn> {
    try {
      const { data, error } = await this.supabase
        .from(SupabaseTables.MOTION_SUPPORT)
        .select('phone_number')
        .maybeSingle();

      if (error) {
        return {
          HasErrors: true,
          Error:
            error.message ||
            'There was a problem fetching the support phone number.',
          UserError: this.userErrorMessage,
        };
      }

      if (!data?.phone_number) {
        return {
          HasErrors: true,
          Error: 'Support phone number not configured.',
          UserError: this.userErrorMessage,
        };
      }

      return {
        HasErrors: false,
        Data: { phoneNumber: data.phone_number },
      };
    } catch (e: any) {
      return {
        HasErrors: true,
        Error:
          e?.message || 'Unexpected error while fetching support phone number.',
        UserError: this.userErrorMessage,
      };
    }
  }

  private async getUserPhoneNumber(): Promise<SupportReturn> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      const userId = session.session?.user?.id;

      if (!userId) {
        return {
          HasErrors: true,
          Error: 'No authenticated user found.',
          UserError: 'Please sign in again to contact support.',
        };
      }

      const { data, error } = await this.supabase
        .from(SupabaseTables.USERS)
        .select('phone_number')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return {
          HasErrors: true,
          Error: error.message || 'Unable to fetch your phone number.',
          UserError: this.userErrorMessage,
        };
      }

      if (!data?.phone_number) {
        return {
          HasErrors: true,
          Error: 'User phone number is missing.',
          UserError: this.userErrorMessage,
        };
      }

      return {
        HasErrors: false,
        Data: { phoneNumber: data.phone_number },
      };
    } catch (e: any) {
      return {
        HasErrors: true,
        Error:
          e?.message || 'Unexpected error while fetching your phone number.',
        UserError: this.userErrorMessage,
      };
    }
  }

  async sendSupportRequest(payload: SupportType): Promise<SupportReturn> {
    const supportNumberResult = await this.getSupportPhoneNumber();
    if (supportNumberResult.HasErrors) return supportNumberResult;
    const supportPhoneNumber = supportNumberResult.Data?.phoneNumber;

    const context = await this.getOptionalUserContext();

    const resolvedName = payload.name || context.name || '';
    const resolvedMotionId = payload.motionId || context.motionId || '';
    const resolvedEmail = payload.userEmail || context.email || '';

    let userPhoneNumber = payload.userPhoneNumber?.trim() || '';
    if (!userPhoneNumber) {
      userPhoneNumber = context.phone || '';
    }

    if (!userPhoneNumber) {
      const userPhoneResult = await this.getUserPhoneNumber();
      if (userPhoneResult.HasErrors) return userPhoneResult;
      userPhoneNumber = userPhoneResult.Data?.phoneNumber;
    }

    try {
      const { data, error } =
        await this.supabase.functions.invoke<SupportCalloutResponse>(
          SupabaseEdgeFunctions.SUPPORT_CALLOUT,
          {
            body: {
              preMessage: payload.preMessage,
              userMessage: payload.userMessage,
              name: resolvedName,
              motionId: resolvedMotionId,
              supportPhoneNumber,
              userPhoneNumber,
              sourceTag: payload.sourceTag || '',
              userEmail: resolvedEmail,
            },
          },
        );

      if (error) {
        return {
          HasErrors: true,
          Error: error.message || 'Support function error.',
          UserError: this.userErrorMessage,
        };
      }

      if (data?.HasErrors) {
        return {
          HasErrors: true,
          Error: data?.Error || 'Support function reported an error.',
          UserError: data?.UserError || this.userErrorMessage,
        };
      }

      const link = data?.Link || data?.Data?.link;
      return {
        HasErrors: false,
        Data: link
          ? { link }
          : data?.Message
            ? { message: data.Message }
            : { phoneNumber: supportPhoneNumber },
      };
    } catch (e: any) {
      return {
        HasErrors: true,
        Error: e?.message || 'Unexpected error while contacting support.',
        UserError: this.userErrorMessage,
      };
    }
  }
}
