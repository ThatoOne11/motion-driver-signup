// deno-lint-ignore-file no-explicit-any
import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class DocumentUploadService {
  private supabase = inject(SupabaseClientService).supabaseClient;
  private docTypeMap: Record<string, string> | null = null;
  private static readonly BUCKET_ID = 'driver-document-uploads';

  async ensureDocTypeMap() {
    if (this.docTypeMap) return;
    const map: Record<string, string> = {};
    const { data, error } = await this.supabase
      .from('document_types')
      .select('id,name');
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const key = this.keyForName(row.name);
      map[key] = row.id;
    }
    this.docTypeMap = map;
  }

  private keyForName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private keyForKind(kind: string): string {
    // Map UI keys to canonical names used in document_types
    const map: Record<string, string> = {
      driversLicence: "driver's licence",
      licenceDisc: 'licence disc',
      idProof: 'id proof',
      bankingProof: 'banking proof',
      topBoxPhoto: 'top box photo',
    };
    return this.keyForName(map[kind] ?? kind);
  }

  private pathFor(userId: string, kind: string, file: File) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const ts = Date.now();
    // Must start with user/{uid}/ to satisfy RLS policy
    return `user/${userId}/${kind}/${ts}.${ext}`;
  }

  async upload(kind: string, file: File) {
    await this.ensureDocTypeMap();
    const { data: sessionRes, error: sessErr } =
      await this.supabase.auth.getSession();
    if (sessErr) throw new Error(sessErr.message);
    const userId = sessionRes.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    // Preflight: ensure a public.users row exists for this auth user (FK requirement)
    const { data: userRow, error: userErr } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!userRow) {
      throw new Error(
        'Your profile has not been created yet. Please complete your profile before uploading documents.',
      );
    }

    const canonKey = this.keyForKind(kind);
    const docTypeId = this.docTypeMap![canonKey];
    if (!docTypeId) throw new Error(`Unknown document type for '${kind}'`);

    const path = this.pathFor(userId, canonKey, file);
    const bucket = this.supabase.storage.from(DocumentUploadService.BUCKET_ID);
    const { error: upErr } = await bucket.upload(path, file, { upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: insertErr } = await this.supabase
      .from('driver_documents')
      .insert({
        user_id: userId,
        document_type_id: docTypeId,
        document_storage_path: path,
      });
    if (insertErr) throw new Error(insertErr.message);
  }

  async remove(kind: string) {
    await this.ensureDocTypeMap();
    const { data: sessionRes, error: sessErr } =
      await this.supabase.auth.getSession();
    if (sessErr) throw new Error(sessErr.message);
    const userId = sessionRes.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    // Verify profile row exists to avoid FK surprises
    const { data: userRow, error: userErr } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message);
    if (!userRow) return; // nothing to remove if profile row is missing

    const canonKey = this.keyForKind(kind);
    const docTypeId = this.docTypeMap![canonKey];
    if (!docTypeId) throw new Error(`Unknown document type for '${kind}'`);

    // Find latest uploaded document for this kind
    const { data: rows, error: selErr } = await this.supabase
      .from('driver_documents')
      .select('id, document_storage_path')
      .eq('user_id', userId)
      .eq('document_type_id', docTypeId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (selErr) throw new Error(selErr.message);
    const row = rows?.[0];
    if (!row) return; // nothing to remove

    const path = row.document_storage_path as string;
    // Best-effort delete from storage (ignore if missing)
    await this.supabase.storage
      .from(DocumentUploadService.BUCKET_ID)
      .remove([path]);
    // Delete DB row
    const { error: delErr } = await this.supabase
      .from('driver_documents')
      .delete()
      .eq('id', row.id);
    if (delErr) throw new Error(delErr.message);
  }
}
