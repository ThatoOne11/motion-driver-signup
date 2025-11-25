import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountRoutePaths } from '@core/constants/routes.constants';
import { AuthService } from '@core/services/auth/auth.service';
import { environment } from '@environments/environment';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';

import { SupportCalloutComponent } from '@core/components/support-callout/support-callout';
import { Location } from '@angular/common';

@Component({
  selector: 'app-onboarding-sign-up',
  imports: [MatIconModule, MotionBackgroundComponent, SupportCalloutComponent],
  templateUrl: './onboarding-sign-up.html',
  styleUrl: './onboarding-sign-up.scss',
  standalone: true,
})
export class OnboardingSignUp {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  errorMessage = signal<string>('');
  mode = signal<'invitation' | 'pending'>('invitation');

  constructor(private readonly location: Location) {}

  async ngOnInit() {
    const modeFromRoute = this.route.snapshot.data['mode'];
    if (modeFromRoute === 'pending-verification') {
      this.mode.set('pending');
      return;
    }

    try {
      const session = await this.authService.loginWithInvitationLink();
      if (!session) {
        this.errorMessage.set(
          'There was a problem verifying your email address. Please contact support as your invitation may have expired.',
        );
      }
    } catch (e) {
      this.errorMessage.set(
        'There was a problem verifying your email address. Please contact support as your invitation may have expired.',
      );
    }
  }

  protected ResetPassword() {
    if (environment.enforceMfa) {
      this.router.navigate([AccountRoutePaths.MFA], {
        queryParams: { returnUrl: AccountRoutePaths.PASSWORD_RESET },
      });
    } else {
      this.router.navigate([AccountRoutePaths.PASSWORD_RESET]);
    }
  }

  protected toLogin() {
    this.router.navigate([AccountRoutePaths.LOGIN]);
  }

  close(): void {
    this.location.back();
  }
}
