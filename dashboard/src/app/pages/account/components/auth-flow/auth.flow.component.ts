import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
} from '@angular/core';
import { Field } from '@angular/forms/signals';
import { AuthService } from '@core/services/auth/auth.service';
import { inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MfaAuthService } from '@core/services/auth/auth.mfa.service';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  AccountRoutePaths,
  AccountRouteSubPaths,
  InformationRoutePaths,
} from '@core/constants/routes.constants';
import { RoutesService } from '@core/services/routes.service';
import { environment } from '@environments/environment';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import {
  LoginFormModel,
  RegisterFormModel,
  createLoginForm,
  createRegisterForm,
} from '@account/models/forms/auth-forms.config';

@Component({
  selector: 'app-account-access',
  standalone: true,
  imports: [
    Field,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MotionBackgroundComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth.flow.component.html',
  styleUrl: './auth.flow.component.scss',
})
export class AccountAccessComponent implements OnInit {
  private authService = inject(AuthService);
  private mfaAuthService = inject(MfaAuthService);
  private router = inject(Router);
  private routesService = inject(RoutesService);
  private route = inject(ActivatedRoute);

  private readonly loginModel = signal<LoginFormModel>({
    email: '',
    password: '',
  });
  private readonly registerModel = signal<RegisterFormModel>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  protected readonly loginForm = createLoginForm(this.loginModel);
  protected readonly registerForm = createRegisterForm(this.registerModel);
  protected readonly termsRoute = InformationRoutePaths.TERMS_OF_SERVICE;
  protected readonly privacyRoute = InformationRoutePaths.PRIVACY_POLICY;
  protected readonly moreInformationRoute =
    InformationRoutePaths.MORE_INFORMATION;

  constructor() {}
  async ngOnInit(): Promise<void> {
    this.authService.getAuthenticatedUser().then((user) => {
      if (user) this.router.navigate([this.routesService.getLandingPage()]);
    });
    this.setModeFromRoute();
  }

  hide = signal(true);
  resetPasswordMessage = signal('');
  isError = signal(false);
  registerMessage = signal('');
  registerError = signal(false);
  authMode = signal<'login' | 'register'>('login');
  togglePasswordVisibility(event: MouseEvent, input: HTMLInputElement) {
    event.stopPropagation();
    const next = !this.hide();
    this.hide.set(next);
    input.type = next ? 'password' : 'text';
  }

  switchMode(mode: 'login' | 'register') {
    if (this.authMode() === mode) return;
    this.authMode.set(mode);
    const targetPath =
      mode === 'login' ? AccountRoutePaths.LOGIN : AccountRoutePaths.REGISTER;
    this.router.navigate([targetPath]);
    if (mode === 'register') {
      this.registerMessage.set('');
      this.registerError.set(false);
    } else {
      this.resetPasswordMessage.set('');
      this.isError.set(false);
    }
  }

  private setModeFromRoute() {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === AccountRouteSubPaths.REGISTER) {
      this.authMode.set('register');
    } else {
      this.authMode.set('login');
    }
  }

  async onSubmit() {
    if (this.loginForm().invalid()) return;
    const { email, password } = this.loginModel();

    const { error } = await this.authService.loginWithSupabaseClient(
      email,
      password,
    );
    if (error) {
      console.error('Login failed:', error);
      this.resetPasswordMessage.set(error.message);
      this.isError.set(true);
    } else {
      if (environment.enforceMfa) {
        const hasTotpLinked = await this.mfaAuthService.hasTotpLinked();
        if (hasTotpLinked) {
          const hasVerifiedMfa = await this.mfaAuthService.hasVerifiedMfa();
          if (!hasVerifiedMfa) {
            this.router.navigate([AccountRoutePaths.MFA], {
              queryParams: { returnUrl: this.routesService.getLandingPage() },
            });
            return;
          }
        }
      }
      // If MFA not linked or already verified, go to landing page
      this.router.navigate([this.routesService.getLandingPage()]);
    }
  }

  requestPasswordReset() {
    const { email } = this.loginModel();
    if (!email) {
      this.resetPasswordMessage.set(
        'Email is required to request a password reset.',
      );
      this.isError.set(true);
    } else {
      this.authService
        .requestPasswordReset(email)
        .then(() => {
          this.resetPasswordMessage.set(
            'If the account exists a password reset email has been sent.',
          );
          this.isError.set(false);
        })
        .catch((err) => {
          console.error('Reset failed:', err);
          this.resetPasswordMessage.set(
            'There was an error requesting a password reset.',
          );
          this.isError.set(true);
        });
    }
  }

  async register() {
    this.registerMessage.set('');
    this.registerError.set(false);
    if (this.registerForm().invalid()) {
      return;
    }
    const { firstName, lastName, phone, email } = this.registerModel();

    try {
      await this.authService.registerDriver(email, firstName, lastName, phone);
      this.router.navigate([AccountRoutePaths.PENDING_VERIFICATION]);
    } catch (error: any) {
      console.error('Registration failed:', error);
      this.registerMessage.set(
        error?.message ?? 'There was an issue creating your account.',
      );
      this.registerError.set(true);
    }
  }

  protected hasError(
    errors: readonly { kind?: string }[] | undefined,
    kind: string,
  ): boolean {
    return !!errors?.some((error) => error.kind === kind);
  }
}
