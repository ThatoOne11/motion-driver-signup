import {
  Component,
  OnInit,
  NgZone,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-documents-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    DocumentUploaderComponent,
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

  // allUploaded no longer needed; rely on form.valid
}
