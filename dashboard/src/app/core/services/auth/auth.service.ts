import { inject, Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { setItem, clearItem } from '@core/store/session.store';
import { SupabaseClientService } from '../supabase-client.service';
import { AuthConstants } from '@core/constants/auth.constants';
import { AuthTokenResponsePassword, Session } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { AccountRoutePaths } from '@core/constants/routes.constants';
import { SupabaseEdgeFunctions } from '@core/constants/supabase.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseClientService);
  private router = inject(Router);

  public async loginWithSupabaseClient(
    email: string,
    password: string,
  ): Promise<AuthTokenResponsePassword> {
    const credentials = { email, password };
    const authTokenResponsePassword =
      await this.supabase.supabaseClient.auth.signInWithPassword(credentials);
    if (authTokenResponsePassword.error) {
      return authTokenResponsePassword;
    }

    this.setAuthToken(authTokenResponsePassword.data.session);
    return authTokenResponsePassword;
  }

  public async loginWithInvitationLink() {
    const { error } = await this.supabase.supabaseClient.auth.initialize();
    const session = await this.supabase.supabaseClient.auth.getSession();
    this.setAuthToken(session.data.session!);
    if (error) {
      throw new Error(error.message);
    }
    return session.data.session;
  }

  public async refreshToken(refreshToken: string): Promise<void> {
    const currentSession = { refresh_token: refreshToken };
    const authTokenResponse =
      await this.supabase.supabaseClient.auth.refreshSession(currentSession);
    if (
      authTokenResponse.error ||
      authTokenResponse.data == null ||
      authTokenResponse.data.session == null
    ) {
      console.error('Failed to refresh token:', authTokenResponse.error);
      return;
    }

    this.clearAuthToken();
    this.setAuthToken(authTokenResponse.data.session);
  }

  private setAuthToken(session: Session): void {
    try {
      setItem(AuthConstants.ACCESS_TOKEN_KEY, session.access_token);
      setItem(AuthConstants.REFRESH_TOKEN_KEY, session.refresh_token);

      const decoded = jwtDecode<{ user_role?: string; display_name?: string }>(
        session.access_token,
      );
      if (decoded.user_role) {
        setItem(AuthConstants.USER_ROLE, decoded.user_role);
      }
      if (decoded.display_name) {
        setItem(AuthConstants.DISPLAY_NAME, decoded.display_name);
      }
    } catch (exception) {
      console.error('Failed to decode JWT:', exception);
    }
  }

  private clearAuthToken(): void {
    clearItem(AuthConstants.ACCESS_TOKEN_KEY);
    clearItem(AuthConstants.REFRESH_TOKEN_KEY);
    clearItem(AuthConstants.USER_ROLE);
    clearItem(AuthConstants.DISPLAY_NAME);
  }

  public async requestPasswordReset(phone: string): Promise<void> {
    const { data, error } =
      await this.supabase.supabaseClient.functions.invoke<{
        Message?: string;
        HasErrors?: boolean;
        Error?: string;
      }>(SupabaseEdgeFunctions.PASSWORD_RESET, {
        body: { phone },
      });

    if (error) {
      throw new Error(
        'We could not send the reset link right now. Please try again.'
      );
    }

    if (data?.HasErrors) {
      throw new Error(
        data?.Message ??
          data?.Error ??
          'We could not send the reset link. Please check the number and try again.'
      );
    }
  }

  private readonly registerDriverDefaultError =
    'Registration failed. Please try again.';

  private readonly registerDriverErrorMap = [
    /edge function returned a non-2xx/i,
  ];

  private sanitizeFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
  }

  public async registerDriver(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    password?: string,
  ): Promise<void> {
    const payload = {
      email,
      fullName: this.sanitizeFullName(firstName, lastName),
      phone,
      password: password ?? this.generateStrongPassword(),
      inspector: false,
    };

    const { data, error } =
      await this.supabase.supabaseClient.functions.invoke<{
        Message?: string;
        HasErrors?: boolean;
        Error?: string;
        ErrorMessage?: string;
      }>(SupabaseEdgeFunctions.REGISTER_DRIVER, {
        body: payload,
      });

    if (error) {
      throw new Error(this.mapRegisterError(error.message));
    }

    if (data?.HasErrors) {
      throw new Error(
        data?.ErrorMessage ??
          data?.Error ??
          data?.Message ??
          this.registerDriverDefaultError,
      );
    }
  }

  private mapRegisterError(rawMessage?: string): string {
    if (!rawMessage) {
      return this.registerDriverDefaultError;
    }
    const friendlyMatch = this.registerDriverErrorMap.some((regex) =>
      regex.test(rawMessage),
    );
    if (friendlyMatch) {
      return this.registerDriverDefaultError;
    }
    return rawMessage;
  }

  private generateStrongPassword(length: number = 16): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const result: string[] = [];
    const cryptoObj =
      (globalThis as any).crypto || (globalThis as any).msCrypto;
    if (cryptoObj?.getRandomValues) {
      const randomValues = new Uint32Array(length);
      cryptoObj.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        result.push(charset[randomValues[i] % charset.length]);
      }
    } else {
      for (let i = 0; i < length; i++) {
        result.push(charset[Math.floor(Math.random() * charset.length)]);
      }
    }
    return result.join('');
  }

  public async setPassword(password: string): Promise<void> {
    const { error } = await this.supabase.supabaseClient.auth.updateUser({
      password: password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Ensure JWT claims (e.g., user_role via custom_access_token_hook)
    // are present by refreshing the session and re-setting tokens locally.
    try {
      const refreshed =
        await this.supabase.supabaseClient.auth.refreshSession();
      if (refreshed.data?.session) {
        this.setAuthToken(refreshed.data.session);
      } else {
        // Fallback to current session if refresh did not return one
        const current = await this.supabase.supabaseClient.auth.getSession();
        if (current.data?.session) this.setAuthToken(current.data.session);
      }
    } catch (_) {
      // Non-fatal; navigation will still proceed, but claims may require a reload
    }
  }

  public async initialiseSession(): Promise<void> {
    const { data, error } =
      await this.supabase.supabaseClient.auth.getSession();
    if (error) {
      console.error(`Session initialisation failed: ${error.message}`);
      throw new Error(error.message);
    }
    if (data.session) {
      this.setAuthToken(data.session);
    }
  }

  public async signOut(): Promise<void> {
    await this.supabase.supabaseClient.auth.signOut();
    this.clearAuthToken();
    this.router.navigate([AccountRoutePaths.LOGIN]);
  }

  public async getAuthenticatedUser() {
    const { data, error } =
      await this.supabase.supabaseClient.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return data.session?.user;
  }
}
