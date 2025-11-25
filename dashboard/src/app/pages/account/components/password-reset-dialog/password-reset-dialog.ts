import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'app-password-reset-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './password-reset-dialog.html',
  styleUrl: './password-reset-dialog.scss',
})
export class PasswordResetDialogComponent {
  private dialogRef = inject(MatDialogRef<PasswordResetDialogComponent>);
  private authService = inject(AuthService);

  phoneControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^0\d{9}$/)],
  });

  isSubmitting = signal(false);
  statusMessage = '';
  isError = false;

  async onSubmit() {
    if (this.phoneControl.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.statusMessage = '';
    this.isError = false;
    try {
      await this.authService.requestPasswordReset(this.phoneControl.value);
      this.statusMessage =
        'If the account exists, a reset link has been sent via WhatsApp/SMS.';
      this.isError = false;
    } catch (err: any) {
      this.statusMessage =
        err?.message &&
        err.message !== 'Edge Function returned a non-2xx status code'
          ? err.message
          : 'We could not process that request. Please check the phone number and try again.';
      this.isError = true;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
