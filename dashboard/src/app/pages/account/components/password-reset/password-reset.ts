import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { RoutesService } from '@core/services/routes.service';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { SupportCalloutComponent } from '@core/components/support-callout/support-callout';

@Component({
  selector: 'app-password-reset',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MotionBackgroundComponent,
    SupportCalloutComponent,
  ],
  templateUrl: './password-reset.html',
  styleUrl: './password-reset.scss',
})
export class PasswordReset implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private routesService = inject(RoutesService);

  async ngOnInit() {
    // Exchange the recovery code/token in the URL for a session
    await this.authService.initialiseSession();
  }

  hidePassword = signal(true);
  hideConfirm = signal(true);
  errorMessage = signal('');

  password = '';
  confirmPassword = '';

  get isFormValid(): boolean {
    return (
      this.password.length >= 8 &&
      this.confirmPassword.length >= 8 &&
      this.password === this.confirmPassword
    );
  }

  toggleVisibility(type: 'password' | 'confirm', event: MouseEvent) {
    if (type === 'password') this.hidePassword.set(!this.hidePassword());
    else this.hideConfirm.set(!this.hideConfirm());
    event.stopPropagation();
  }

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      return;
    }

    this.authService
      .setPassword(this.password)
      .then(() => {
        this.router.navigate([this.routesService.getLandingPage()]);
      })
      .catch(async (err) => {
        console.error('Reset failed:', err);
        this.errorMessage.set(err.message);
      });
  }
}
