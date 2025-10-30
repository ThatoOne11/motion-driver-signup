import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private supabase = inject(SupabaseClientService).supabaseClient;
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMsg: string | null = null;

  // Auth + basic user profile
  authEmail: string | null = null;
  userId: string | null = null;
  profile: any = null; // { display_name, phone_number, documents_uploaded, ... }
  topBoxImageUrl: string | null = null;

  // Extraction rows for display
  extractions: Array<{
    id: string;
    document_type_id: string;
    driver_document_id: string;
    created_at: string;
    fields_json: any;
    doc_type_name?: string;
    storage_path?: string;
    extraction_data_error?: boolean;
    image_url?: string;
  }> = [];

  async ngOnInit() {
    try {
      const { data: authRes, error: authErr } =
        await this.supabase.auth.getUser();
      if (authErr) throw new Error(authErr.message);
      this.userId = authRes.user?.id ?? null;
      this.authEmail = authRes.user?.email ?? null;
      if (!this.userId) throw new Error('Not authenticated');

      // Load basic profile
      const { data: profile } = await this.supabase
        .from('users')
        .select('display_name, phone_number, documents_uploaded')
        .eq('id', this.userId)
        .maybeSingle();
      this.profile = profile ?? null;

      // Load document type names for mapping
      const { data: typeRows } = await this.supabase
        .from('document_types')
        .select('id, name');
      const typeMap = new Map<string, string>();
      for (const t of typeRows ?? []) typeMap.set(t.id, t.name);

      // Load extraction rows for this user
      const { data: rows, error: exErr } = await this.supabase
        .from('document_upload_extraction')
        .select(
          'id, document_type_id, driver_document_id, fields_json, created_at',
        )
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });
      if (exErr) throw new Error(exErr.message);

      // Load related driver_documents for storage path and error flag
      const ids = (rows ?? []).map((r: any) => r.driver_document_id);
      let docs: any[] = [];
      if (ids.length) {
        const { data: docRows } = await this.supabase
          .from('driver_documents')
          .select('id, document_storage_path, extraction_data_error')
          .in('id', ids);
        docs = docRows ?? [];
      }
      const docMap = new Map<string, any>();
      for (const d of docs) docMap.set(d.id, d);

      this.extractions = (rows ?? []).map((r: any) => ({
        id: r.id,
        document_type_id: r.document_type_id,
        driver_document_id: r.driver_document_id,
        created_at: r.created_at,
        fields_json: r.fields_json,
        doc_type_name: typeMap.get(r.document_type_id) ?? r.document_type_id,
        storage_path: docMap.get(r.driver_document_id)?.document_storage_path,
        extraction_data_error:
          docMap.get(r.driver_document_id)?.extraction_data_error ?? false,
      }));

      // Generate signed URLs for Top Box images where available
      for (const item of this.extractions) {
        const isTopBox =
          (item.doc_type_name || '').toLowerCase() === 'top box photo';
        if (isTopBox && item.storage_path) {
          try {
            const { data, error } = await this.supabase.storage
              .from('driver-document-uploads')
              .createSignedUrl(item.storage_path, 60 * 60); // 1 hour
            if (!error) item.image_url = data?.signedUrl;
          } catch {
            // ignore image URL errors; keep page loading
          }
        }
      }

      // Also fetch latest Top Box Photo even if it has no extraction row
      const topType = (typeRows ?? []).find((t: any) => {
        const n = (t?.name || '').toLowerCase();
        return n.includes('top') && n.includes('box');
      });
      if (topType) {
        const { data: topDoc } = await this.supabase
          .from('driver_documents')
          .select('document_storage_path')
          .eq('user_id', this.userId)
          .eq('document_type_id', topType.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const path = topDoc?.document_storage_path as string | undefined;
        if (path) {
          try {
            const { data, error } = await this.supabase.storage
              .from('driver-document-uploads')
              .createSignedUrl(path, 60 * 60);
            if (!error) this.topBoxImageUrl = data?.signedUrl ?? null;
          } catch {
            this.topBoxImageUrl = null;
          }
        }
      }

      this.errorMsg = null;
    } catch (e: any) {
      this.errorMsg = e?.message || 'Failed to load dashboard';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
