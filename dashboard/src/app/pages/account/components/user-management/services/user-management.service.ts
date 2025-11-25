import { inject, Injectable } from '@angular/core';
import { Observable, from, map, of, catchError, switchMap } from 'rxjs';
import {
  BankingDetails,
  DriverProfile,
  DriversLicence,
  IdProof,
  LicenceDisc,
} from '@account/models/user-management.models';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import {
  SupabaseBuckets,
  SupabaseEdgeFunctions,
  SupabaseTables,
} from '@core/constants/supabase.constants';

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private supabase = inject(SupabaseClientService).supabaseClient;

  getProfile(): Observable<DriverProfile | null> {
    return from(
      this.supabase.functions.invoke(SupabaseEdgeFunctions.DRIVER_PROFILE),
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error fetching profile:', response.error);
          return null;
        }

        const responseBody = response.data;
        if (responseBody && responseBody.Data) {
          return responseBody.Data as DriverProfile;
        }

        return responseBody as DriverProfile;
      }),
      catchError((err) => {
        console.error('Profile fetch error', err);
        return of(null);
      }),
    );
  }

  // Helper to fetch and map data
  private getDocumentExtraction<T>(
    docTypeName: string,
    mapper: (json: any) => T,
  ): Observable<T | null> {
    return from(
      this.supabase
        .from(SupabaseTables.DOCUMENT_UPLOAD)
        .select(
          `
          fields_json,
          document_types!inner(name)
        `,
        )
        .eq('document_types.name', docTypeName)
        .maybeSingle(),
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error(`Error fetching ${docTypeName}:`, error);
          return null;
        }
        if (!data || !data.fields_json) return null;

        try {
          return mapper(data.fields_json);
        } catch (e) {
          console.error(`Error mapping ${docTypeName}:`, e);
          return null;
        }
      }),
    );
  }

  getLicenceDisc(): Observable<LicenceDisc | null> {
    return this.getDocumentExtraction<LicenceDisc>('Licence Disc', (json) => ({
      bikeMake: json.make || '',
      expiryDate: json.expiry_date || '',
      licenceNo: json.licence_number || '',
    }));
  }

  getDriversLicence(): Observable<DriversLicence | null> {
    return this.getDocumentExtraction<DriversLicence>(
      "Driver's Licence",
      (json) => ({
        name: json.name || '',
        codes: Array.isArray(json.codes)
          ? json.codes.join(', ')
          : json.codes || '',
        validTo: json.valid_to || '',
        idNo: json.id_number || '',
        validFrom: json.valid_from || '',
        firstIssueDate: json.first_issue_date || '',
      }),
    );
  }

  getIdProof(): Observable<IdProof | null> {
    return this.getDocumentExtraction<IdProof>('ID Proof', (json) => ({
      fullName: json.full_name || '',
      idNo: json.id_number || '',
      nationality: json.nationality || '',
      dateOfBirth: json.date_of_birth || '',
      dateOfIssue: json.date_of_issue || '',
    }));
  }

  getBankingDetails(): Observable<BankingDetails | null> {
    return this.getDocumentExtraction<BankingDetails>(
      'Banking Proof',
      (json) => ({
        bank: json.bank_name || '',
        branchCode: json.branch_code || '',
        accountType: json.account_type || '',
        accountHolder: json.account_holder || '',
        accountNumber: json.account_number || '',
        paymentReference: 'MotionAds',
      }),
    );
  }

  getTopBoxPhotoUrl(): Observable<string | null> {
    return from(
      this.supabase
        .from(SupabaseTables.DRIVER_DOCUMENTS)
        .select(
          `
          document_storage_path,
          document_types!inner(name)
        `,
        )
        .eq('document_types.name', 'Top Box Photo')
        .maybeSingle(),
    ).pipe(
      switchMap(({ data }) => {
        if (data && data.document_storage_path) {
          // Create a signed URL valid for 1 hour (3600 seconds)
          return from(
            this.supabase.storage
              .from(SupabaseBuckets.DRIVER_DOCUMENT_UPLOADS)
              .createSignedUrl(data.document_storage_path, 3600),
          ).pipe(
            map(({ data: signedData, error }) => {
              if (error) {
                console.error('Error creating signed URL:', error);
                return null;
              }
              return signedData?.signedUrl || null;
            }),
          );
        }
        return of(null);
      }),
    );
  }
}
