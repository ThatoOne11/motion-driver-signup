import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { Router } from '@angular/router';
import { AccountRoutePaths } from '@core/constants/routes.constants';
import { DriverSignUpFormGroupBuilder } from '@account/models/form-groups/driver-sign-up-form-group-builder';
import { AuthService } from '@core/services/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-driver-sign-up-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './driver-sign-up-form.html',
  styleUrl: './driver-sign-up-form.scss',
})
export class DriverSignUpForm implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseClientService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private formBuilder = new DriverSignUpFormGroupBuilder(this.fb);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup = this.formBuilder.buildForm();
  isSubmitting = false;

  platforms = signal<{ id: string; name: string }[]>([]);
  suburbs = signal<{ id: string; name: string }[]>([]);
  cities = signal<{ id: string; name: string }[]>([]);
  provinces = signal<{ id: string; name: string }[]>([]);
  bikeOwnershipTypes = signal<{ id: string; name: string }[]>([]);
  yearsDrivingOptions = signal<{ id: string; label: string }[]>([]);
  daysPerWeek = signal<{ value: number }[]>([]);
  isFreeTextSuburb = signal(false);
  submitError: string | null = null;

  async ngOnInit() {
    await this.loadStaticOptions();
    this.setupDependentDropdowns();
  }

  private async loadStaticOptions() {
    const client = this.supabase.supabaseClient;
    const [platforms, provinces, bikeTypes, years, days] = await Promise.all([
      client
        .from('platforms')
        .select('id, name')
        .order('name', { ascending: true }),
      client
        .from('provinces')
        .select('id, name')
        .order('name', { ascending: true }),
      client
        .from('bike_ownership_types')
        .select('id, name')
        .order('name', { ascending: true }),
      client
        .from('years_driving_options')
        .select('id, label')
        .order('label', { ascending: true }),
      client
        .from('days_per_week_options')
        .select('value')
        .order('value', { ascending: true }),
    ]);

    this.platforms.set(platforms.data ?? []);
    this.provinces.set(provinces.data ?? []);
    this.bikeOwnershipTypes.set(bikeTypes.data ?? []);
    this.yearsDrivingOptions.set(years.data ?? []);
    this.daysPerWeek.set(days.data ?? []);
  }

  private setupDependentDropdowns() {
    const provinceCtrl = this.form.get('province');
    const cityCtrl = this.form.get('city');
    const suburbCtrl = this.form.get('suburb');

    // Province -> Cities
    provinceCtrl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (provinceId: string | null) => {
        // Reset dependent controls and lists
        this.cities.set([]);
        cityCtrl?.reset();
        cityCtrl?.disable();

        this.suburbs.set([]);
        suburbCtrl?.reset();
        suburbCtrl?.disable();
        this.isFreeTextSuburb.set(false);

        if (provinceId) {
          try {
            await this.loadCitiesForProvince(provinceId);
          } finally {
            cityCtrl?.enable();
          }
        }
      });

    // City -> Suburb
    cityCtrl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (cityId: string | null) => {
        this.suburbs.set([]);
        suburbCtrl?.reset();
        suburbCtrl?.disable();

        // Determine if Province and City are both 'Other'
        const provinceId = provinceCtrl?.value as string | null;
        const isProvinceOther = !!this.provinces().find(
          (p) => p.id === provinceId && p.name.toLowerCase() === 'other',
        );
        const isCityOther = !!this.cities().find(
          (c) => c.id === cityId && c.name.toLowerCase() === 'other',
        );

        if (provinceId && cityId && isProvinceOther && isCityOther) {
          this.isFreeTextSuburb.set(true);
          suburbCtrl?.enable();
          return;
        }

        this.isFreeTextSuburb.set(false);
        if (cityId) {
          await this.loadSuburbForCity(cityId);
          suburbCtrl?.enable();
        }
      });

    // In case values are preselected (or immediately selected before subs bind)
    const initialProvince = provinceCtrl?.value as string | null;
    if (initialProvince) {
      cityCtrl?.disable();
      this.loadCitiesForProvince(initialProvince)
        .catch(() => {})
        .finally(() => cityCtrl?.enable());
    }
    const initialCity = cityCtrl?.value as string | null;
    if (initialCity) {
      // Evaluate free text state on initial load as well
      const initialProvince = provinceCtrl?.value as string | null;
      const isProvinceOther = !!this.provinces().find(
        (p) => p.id === initialProvince && p.name.toLowerCase() === 'other',
      );
      const isCityOther = !!this.cities().find(
        (c) => c.id === initialCity && c.name.toLowerCase() === 'other',
      );
      if (isProvinceOther && isCityOther) {
        this.isFreeTextSuburb.set(true);
        suburbCtrl?.enable();
      } else {
        this.isFreeTextSuburb.set(false);
        this.loadSuburbForCity(initialCity).then(() => suburbCtrl?.enable());
      }
    }
  }

  private async loadCitiesForProvince(provinceId: string) {
    const { data } = await this.supabase.supabaseClient
      .from('cities')
      .select('id, name')
      .eq('province_id', provinceId)
      .order('name', { ascending: true });
    this.cities.set(data ?? []);
  }

  private async loadSuburbForCity(cityId: string) {
    const { data } = await this.supabase.supabaseClient
      .from('suburbs')
      .select('id, name')
      .eq('city_id', cityId)
      .order('name', { ascending: true });
    this.suburbs.set(data ?? []);
  }

  async logout() {
    await this.auth.signOut();
  }

  async saveAndContinue() {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    const value = this.form.getRawValue();
    // Fetch current user profile details for required fields
    const { data: session } =
      await this.supabase.supabaseClient.auth.getSession();
    const userId = session.session?.user?.id;
    const email = session.session?.user?.email ?? '';
    let fullName = '';
    let phone = '';
    if (userId) {
      const { data: userRow } = await this.supabase.supabaseClient
        .from('users')
        .select('display_name, phone_number')
        .eq('id', userId)
        .maybeSingle();
      fullName = userRow?.display_name ?? '';
      phone = userRow?.phone_number ?? '';
    }
    // Build payload expected by the edge function
    const payload = {
      fullName,
      email,
      phone,
      provinceId: value.province as string,
      cityId: value.city as string,
      suburbId: value.suburb as string,
      platforms: (value.platforms as string[]) ?? [],
      bikeOwnershipId: value.bikeOwnership as string,
      yearsDrivingId: value.yearsDriving as string,
      daysPerWeek: Number(value.daysPerWeek),
    };
    this.submitError = null;
    try {
      const invokePromise = this.supabase.supabaseClient.functions.invoke(
        'driver-profile',
        { body: payload },
      );
      const raced: any = await Promise.race([
        invokePromise,
        new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 20000),
        ),
      ]);

      if (raced?.timeout) {
        // Force change detection update even if the promise resolved outside Angular zone
        this.submitError =
          'The request took too long. Please try again. or if the error persists please contact MotionAds support.';
        console.error('driver-profile timeout');
        this.cdr.detectChanges();
        return;
      }

      const { data, error } = raced as {
        data: any;
        error: { message?: string } | null;
      };
      if (error || data?.HasErrors) {
        const msg = this.friendlyErrorMessage(error?.message, data);
        this.submitError = msg;
        console.error('driver-profile failed', { error, data });
        this.cdr.detectChanges();
        return;
      }
      // Navigate to documents page on success
      await this.router.navigate([AccountRoutePaths.DRIVER_DOCUMENTS_UPLOAD]);
    } catch (e: any) {
      console.error('driver-profile exception', e);
      this.submitError =
        this.friendlyErrorMessage(e?.message, undefined) ||
        'Unexpected error. Please try again.';
      this.cdr.detectChanges();
    } finally {
      // Stop spinner and re-enable button immediately
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  private friendlyErrorMessage(raw?: string, data?: any): string {
    if (data?.Message) return String(data.Message);
    if (data?.Error) return String(data.Error);
    const m = raw || '';
    if (/non-2xx status code/i.test(m)) {
      return 'We could not save your profile. Please try again, or if the error persists please contact MotionAds support.';
    }
    if (/UNKNOWN_FIELD_NAME/i.test(m)) {
      return 'A configuration error occurred. Please try again later, or if the error persists please contact MotionAds support.';
    }
    if (/INVALID_MULTIPLE_CHOICE_OPTIONS/i.test(m)) {
      return 'One of the selected options is not allowed. Please select a different option, or if the error persists please contact MotionAds support.';
    }
    if (/timeout/i.test(m)) {
      return 'The request timed out. Please try again, or if the error persists please contact MotionAds support.';
    }
    return (
      m ||
      'Something went wrong. Please try again, or if the error persists please contact MotionAds support.'
    );
  }
}
