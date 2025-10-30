/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '@core/services/auth/auth.service';
import { MfaAuthService } from '@core/services/auth/auth.mfa.service';
import { Router } from '@angular/router';
import { AccountRoutePaths } from '@core/constants/routes.constants';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private mfaAuthService = inject(MfaAuthService);
  private router = inject(Router);

  protected displayName = getItem(AuthConstants.DISPLAY_NAME) ?? '';
  protected email = signal<string>('');
  protected mfaEnabled = signal<boolean>(false);
  protected working = signal<boolean>(false);

  async ngOnInit() {
    try {
      const user = await this.authService.getAuthenticatedUser();
      this.email.set(user?.email ?? '');
    } catch (e) {
      this.email.set('');
    }
    await this.refreshMfaStatus();
  }

  async logout() {
    await this.authService.signOut();
  }

  async refreshMfaStatus() {
    try {
      const enabled = await this.mfaAuthService.hasTotpLinked();
      this.mfaEnabled.set(enabled);
    } catch {
      this.mfaEnabled.set(false);
    }
  }

  enableMfa() {
    this.router.navigate([AccountRoutePaths.MFA], {
      queryParams: { returnUrl: AccountRoutePaths.USER_MANAGEMENT },
    });
  }

  async disableMfa() {
    if (this.working()) return;
    this.working.set(true);
    try {
      const ok = await this.mfaAuthService.disableTotp();
      if (ok) {
        await this.refreshMfaStatus();
      }
    } finally {
      this.working.set(false);
    }
  }
}
