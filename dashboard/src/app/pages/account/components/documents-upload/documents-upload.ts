import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DocumentUploaderComponent } from './document-uploader/document-uploader';
import { DocumentUploadService } from '@core/services/document-upload.service';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { Router } from '@angular/router';
import { RoutePaths } from '@core/constants/routes.constants';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { InformationRoutePaths } from '@core/constants/routes.constants';
import { SupportCalloutComponent } from '@core/components/support-callout/support-callout';
import { AuthService } from '@core/services/auth/auth.service';
import {
  DriverProgressComponent,
  DriverProgressStep,
} from '../driver-progress/driver-progress.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-documents-upload',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    DocumentUploaderComponent,
    MotionBackgroundComponent,
    SupportCalloutComponent,
    DriverProgressComponent,
    RouterLink,
  ],
  templateUrl: './documents-upload.html',
  styleUrl: './documents-upload.scss',
})
export class DocumentsUploadComponent implements OnInit {
  private fb = inject(FormBuilder);
  private uploadSvc = inject(DocumentUploadService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private supabase = inject(SupabaseClientService).supabaseClient;
  private router = inject(Router);
  private auth = inject(AuthService);

  protected readonly moreInformationRoute =
    InformationRoutePaths.MORE_INFORMATION;

  form: FormGroup = this.fb.group({
    driversLicence: [null, Validators.required],
    licenceDisc: [null, Validators.required],
    idProof: [null, Validators.required],
    bankingProof: [null, Validators.required],
    topBoxPhoto: [null, Validators.required],
  });

  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;
  protected progressSteps: DriverProgressStep[] = [
    { controlName: 'driversLicence', message: 'Please upload your documents.' },
    { controlName: 'licenceDisc', message: 'Please upload your documents.' },
    { controlName: 'idProof', message: 'Please upload your documents.' },
    {
      controlName: 'bankingProof',
      message: 'Please upload your documents.',
    },
    { controlName: 'topBoxPhoto', message: 'Please upload your documents.' },
  ];
  private readonly formValueSignal = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  protected readonly progressState = computed(() => {
    const values = this.formValueSignal();
    const totalSteps = this.progressSteps.length;
    if (!totalSteps)
      return { percent: 0, message: 'Please upload your documents.' };

    const completed = this.progressSteps.filter((step) =>
      this.hasValue(values?.[step.controlName as keyof typeof values]),
    ).length;

    return {
      percent: this.percentFrom(completed, totalSteps),
      message:
        completed === totalSteps
          ? 'All documents uploaded!'
          : 'Please upload your documents.',
    };
  });

  async ngOnInit() {
    await this.uploadSvc.ensureDocTypeMap();
  }

  async onFileSelected(kind: string, file: File) {
    this.errorMsg = null;
    try {
      await this.uploadSvc.upload(kind, file);
      // Ensure we re-enter Angular zone after async upload so
      // change detection runs and the button state updates.
      this.zone.run(() => {
        this.form.get(kind)?.setValue('uploaded', { emitEvent: true });
        this.form.updateValueAndValidity({ emitEvent: true });
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      console.error('upload failed', e);
      this.errorMsg = e?.message || 'Upload failed';
    }
  }

  async onRemove(kind: string) {
    this.errorMsg = null;
    try {
      await this.uploadSvc.remove(kind);
      // Similar to upload, ensure state updates trigger CD immediately.
      this.zone.run(() => {
        this.form.get(kind)?.reset();
        this.form.updateValueAndValidity({ emitEvent: true });
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      console.error('remove failed', e);
      this.errorMsg = e?.message || 'Remove failed';
    }
  }

  async onContinue() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase.functions.invoke(
        'document-llm-extraction',
        { body: {} },
      );
      if (error) {
        this.errorMsg = error?.message || 'Document extraction failed.';
        return;
      }
      if (data?.HasErrors) {
        this.errorMsg =
          data?.Message || 'Document extraction could not extract all fields.';
        return;
      }

      await this.router.navigate([`/${RoutePaths.DASHBOARD}`]);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Unexpected error.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async onCompleteLater() {
    if (this.loading) return;
    this.loading = true;
    this.errorMsg = null;
    this.cdr.detectChanges();

    try {
      const { data } = await this.supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) {
        this.errorMsg = 'Unable to identify user. Please log in again.';
        return;
      }

      const { error } = await this.supabase
        .from('users')
        .update({ documents_uploaded: true })
        .eq('id', userId);
      if (error) {
        this.errorMsg = error.message || 'Unable to complete later.';
        return;
      }
      await this.router.navigate([`/${RoutePaths.DASHBOARD}`]);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Unexpected error.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async onLogout() {
    await this.auth.signOut();
  }

  // allUploaded no longer needed; rely on form.valid

  private percentFrom(completed: number, total: number) {
    if (!total) return 0;
    if (completed >= total) return 100;
    const perStep = Math.floor(100 / total);
    return completed * perStep;
  }

  private hasValue(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  }
}
