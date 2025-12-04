import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { SupportService } from '@core/services/support.service';
import { SupportType } from '../config/support.config';

type SupportDialogData = {
  preMessage?: string;
  name?: string;
  motionId?: string;
  sourceTag?: string;
  initialUserEmail?: string | null;
  initialUserName?: string | null;
  initialMotionId?: string | null;
};

@Component({
  selector: 'app-support-callout-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './support-callout-dialog.html',
  styleUrl: './support-callout-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportCalloutDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supportService = inject(SupportService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dialogRef = inject(MatDialogRef<SupportCalloutDialogComponent>);

  form = this.fb.nonNullable.group({
    userMessage: ['', [Validators.required, Validators.maxLength(500)]],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: SupportDialogData) {
    // If we have initial user context, prefer those values in payload defaults.
    if (data?.initialUserName) {
      this.data.name = this.data.name || data.initialUserName;
    }
    if (data?.initialMotionId) {
      this.data.motionId = this.data.motionId || data.initialMotionId;
    }
  }

  loading = false;
  errorMsg: string | null = null;

  get userMessageControl() {
    return this.form.get('userMessage');
  }

  close() {
    if (this.loading) return;
    this.dialogRef.close();
  }

  async onSend() {
    if (this.loading) return;
    this.errorMsg = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    const payload: SupportType = {
      preMessage: this.data?.preMessage ?? '',
      userMessage: this.form.value.userMessage ?? '',
      name: this.data?.name || this.data?.initialUserName || '',
      motionId: this.data?.motionId || this.data?.initialMotionId || '',
      userEmail: this.data?.initialUserEmail || '',
      sourceTag: this.data?.sourceTag || '',
    };

    try {
      const result = await this.supportService.sendSupportRequest(payload);
      if (result.HasErrors) {
        this.errorMsg =
          result.UserError ||
          result.Error ||
          'Unable to submit your support request.';
        return;
      }

      const link = result.Data?.link as string | undefined;
      if (link) {
        window.open(link, '_blank');
      }

      this.dialogRef.close({ ok: true, message: result.Data?.message });
    } catch (e: any) {
      this.errorMsg = e?.message || 'Unexpected error sending support request.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
