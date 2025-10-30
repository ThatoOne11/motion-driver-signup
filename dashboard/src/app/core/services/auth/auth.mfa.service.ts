import { inject, Injectable } from '@angular/core';
import { SupabaseClientService } from '../supabase-client.service';
import { AuthConstants } from '@core/constants/auth.constants';
import { setItem } from '@core/store/session.store';

@Injectable({ providedIn: 'root' })
export class MfaAuthService {
  private supabase = inject(SupabaseClientService);

  public async getQrCodeForMfa(): Promise<string> {
    try {
      const {
        data: { session },
      } = await this.supabase.supabaseClient.auth.getSession();

      if (!session || !session.access_token) {
        throw new Error('User must be logged in to enroll MFA.');
      }

      await this.removeUnverifiedMfaApplications();

      const authMfaEnrollTOtpResponse =
        await this.supabase.supabaseClient.auth.mfa.enroll({
          factorType: AuthConstants.MFA_TOTP_NAME,
        });

      if (authMfaEnrollTOtpResponse.error) {
        console.error(
          'MFA enroll error:',
          authMfaEnrollTOtpResponse.error.message,
        );
        throw new Error(
          'MFA enroll error:' + authMfaEnrollTOtpResponse.error.message,
        );
      }
      return authMfaEnrollTOtpResponse.data?.totp?.qr_code;
    } catch (err) {
      console.error('Unexpected error:', err);
      throw new Error('Unexpected error:' + err);
    }
  }

  public async disableTotp(): Promise<boolean> {
    try {
      const { data, error } =
        await this.supabase.supabaseClient.auth.mfa.listFactors();
      if (error) {
        console.error('MFA listFactors error:', error.message);
        return false;
      }
      const totpFactors = data?.totp ?? [];
      for (const factor of totpFactors) {
        const res = await this.supabase.supabaseClient.auth.mfa.unenroll({
          factorId: factor.id,
        });
        if (res.error) {
          console.error('MFA unenroll error:', res.error.message);
          return false;
        }
      }
      setItem(AuthConstants.HAS_MFA_ENABLED_NAME, false);
      setItem(AuthConstants.HAS_MFA_VERIFIED_NAME, false);
      return true;
    } catch (err) {
      console.error('Unexpected MFA disable error:', err);
      return false;
    }
  }

  public async enableMfaWithTotp(code: string): Promise<boolean> {
    try {
      const { data: factors } =
        await this.supabase.supabaseClient.auth.mfa.listFactors();
      const allFactors = factors?.all ?? [];
      if (allFactors.length === 0) {
        console.error('No MFA factors found to enable');
        return false;
      }
      const requestedFactorId = allFactors[0].id;
      const challengeResult =
        await this.supabase.supabaseClient.auth.mfa.challenge({
          factorId: requestedFactorId,
        });

      if (challengeResult.error) {
        console.error('MFA challenge failed:', challengeResult.error.message);
        return false;
      }

      const challengeId = challengeResult.data?.id;
      if (!challengeId) {
        console.error('No challenge ID returned');
        return false;
      }

      const verifyResult = await this.supabase.supabaseClient.auth.mfa.verify({
        factorId: requestedFactorId,
        challengeId,
        code,
      });

      if (verifyResult.error) {
        console.error('MFA verification failed:', verifyResult.error.message);
        return false;
      }
      setItem(AuthConstants.HAS_MFA_ENABLED_NAME, true);
      setItem(AuthConstants.HAS_MFA_VERIFIED_NAME, true);
      return true;
    } catch (error) {
      console.error('Unexpected MFA enable error:', error);
      return false;
    }
  }

  public async hasVerifiedMfa(): Promise<boolean> {
    const authMFAGetAuthenticatorAssuranceLevelResponse =
      await this.supabase.supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
    let hasVerifiedMfa = false;
    if (
      authMFAGetAuthenticatorAssuranceLevelResponse.data?.currentLevel ==
      AuthConstants.VERIFIED_MFA_LEVEL_NAME
    ) {
      hasVerifiedMfa = true;
    }
    setItem(AuthConstants.HAS_MFA_VERIFIED_NAME, hasVerifiedMfa);
    return hasVerifiedMfa;
  }

  public async hasTotpLinked(): Promise<boolean> {
    const factors = await this.supabase.supabaseClient.auth.mfa.listFactors();
    if (factors.error) {
      throw factors.error;
    }
    let hasMfaEnabled = false;
    const totpFactor = factors.data.totp[0];

    if (totpFactor) {
      if (totpFactor.status == AuthConstants.VERIFIED_MFA_STATUS) {
        hasMfaEnabled = true;
      }
    }
    setItem(AuthConstants.HAS_MFA_ENABLED_NAME, hasMfaEnabled);
    return hasMfaEnabled;
  }

  public async verifyMfa(verifyCode: string): Promise<boolean> {
    try {
      const factorsRes =
        await this.supabase.supabaseClient.auth.mfa.listFactors();
      if (factorsRes.error) {
        console.error('MFA listFactors error:', factorsRes.error.message);
        return false;
      }

      const totpFactor = factorsRes.data?.totp?.[0];
      if (!totpFactor) {
        console.warn('No TOTP factors found for this user.');
        return false;
      }

      const factorId = totpFactor.id;
      const challengeRes =
        await this.supabase.supabaseClient.auth.mfa.challenge({ factorId });
      if (challengeRes.error) {
        console.error('MFA challenge error:', challengeRes.error.message);
        return false;
      }

      const challengeId = challengeRes.data?.id;
      if (!challengeId) {
        console.error('MFA challenge did not return an id.');
        return false;
      }

      const verifyRes = await this.supabase.supabaseClient.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      });
      if (verifyRes.error) {
        console.error('MFA verify error:', verifyRes.error.message);
        return false;
      }

      setItem(AuthConstants.HAS_MFA_VERIFIED_NAME, true);
      return true;
    } catch (err) {
      console.error('Unexpected MFA verification error:', err);
      return false;
    }
  }

  private async removeUnverifiedMfaApplications() {
    const { data: factors } =
      await this.supabase.supabaseClient.auth.mfa.listFactors();
    if (factors) {
      for (const factor of factors.all || []) {
        if (factor.status == AuthConstants.UNVERIFIED_MFA_STATUS) {
          await this.supabase.supabaseClient.auth.mfa.unenroll({
            factorId: factor.id,
          });
        }
      }
    }
  }
}
