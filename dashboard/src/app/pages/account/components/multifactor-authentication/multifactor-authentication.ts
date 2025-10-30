import { DialogNeedHelp } from '@account/dialogs/dialog-need-help/dialog-need-help';
import { DialogNoAuthenticator } from '@account/dialogs/dialog-no-authenticator/dialog-no-authenticator';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MfaAuthService } from '@core/services/auth/auth.mfa.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RoutesService } from '@core/services/routes.service';

@Component({
  selector: 'app-multifactor-authentication',
  imports: [
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
  ],
  templateUrl: './multifactor-authentication.html',
  styleUrl: './multifactor-authentication.scss',
  standalone: true,
})
export class MultifactorAuthentication implements OnInit {
  private mfaAuthService = inject(MfaAuthService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  protected qrCodeImageUrl: string | null = null;
  private route = inject(ActivatedRoute);
  private routesService = inject(RoutesService);

  protected svgDataUrl!: SafeUrl;
  protected authAppChallengeCode!: string;
  protected isEnrolledWithMfa: boolean = true;

  protected isSubmitting = false;
  protected errorMessage = signal<string>('');

  constructor(
    private dialog: MatDialog,
    private cdRef: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.isEnrolledWithMfa = await this.mfaAuthService.hasTotpLinked();

    if (!this.isEnrolledWithMfa) {
      const rawSvg = await this.mfaAuthService.getQrCodeForMfa();
      this.svgDataUrl = this.sanitizer.bypassSecurityTrustUrl(rawSvg!);
      this.cdRef.detectChanges();
    }
  }
  protected isSafeReturnUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }

  protected submitAuthChallengeCode() {
    // Prevent double submissions
    if (this.isSubmitting) return;

    this.errorMessage.set('');

    if (this.isEnrolledWithMfa) {
      this.verifyMfaAuth();
    } else {
      this.addMfaAuth();
    }
  }

  protected async addMfaAuth() {
    this.isSubmitting = true;
    this.errorMessage.set('');
    try {
      const enableMfa = await this.mfaAuthService.enableMfaWithTotp(
        this.authAppChallengeCode.trim(),
      );

      if (!enableMfa) {
        this.errorMessage.set(
          'That was the incorrect code. Please scan the barcode and try again.',
        );
      } else {
        this.navigateOnSuccess();
      }
      // If the call above throws, we won't get here. Consider success if no error.
    } catch (err: any) {
      console.error('MFA enroll failed:', err);
      this.errorMessage.set(
        err?.message ||
          'We could not enable MFA with that code. Please try again.',
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async verifyMfaAuth() {
    this.isSubmitting = true;
    this.errorMessage.set('');

    try {
      const code = (this.authAppChallengeCode ?? '').trim();

      if (code.length !== 6) {
        this.errorMessage.set('Please enter the 6‑digit code to continue.');
        this.isSubmitting = false;
        return;
      }

      // Ask service to verify the code.
      const isVerified = await this.mfaAuthService.verifyMfa(code);

      if (!isVerified) {
        this.errorMessage.set('The code was not accepted. Please try again.');
        this.isSubmitting = false;
        return;
      }

      // If the service exposes an AAL2 check, require it before navigating.
      let hasElevatedSession: boolean | undefined = undefined;
      try {
        // Optional chaining because older service versions may not provide this helper.
        if ((this.mfaAuthService as any).hasElevatedSession) {
          hasElevatedSession = await (
            this.mfaAuthService as any
          ).hasElevatedSession();
        }
      } catch {
        // ignore — we'll fall back to isVerified only
      }

      if (
        isVerified &&
        (hasElevatedSession === true || hasElevatedSession === undefined)
      ) {
        this.navigateOnSuccess();
      } else {
        this.errorMessage.set('The code was not accepted. Please try again.');
      }
    } catch (err: any) {
      console.error('MFA verify failed:', err);
      this.errorMessage.set(
        err?.message || 'The code was not accepted. Please try again.',
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  protected navigateOnSuccess() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.router.navigateByUrl(
      this.isSafeReturnUrl(returnUrl)
        ? returnUrl
        : this.routesService.getLandingPage(),
    );
  }

  protected openNeedHelpDialog() {
    this.dialog.open(DialogNeedHelp);
  }

  protected openNoAuthenticatorDialog() {
    this.dialog.open(DialogNoAuthenticator);
  }
}
