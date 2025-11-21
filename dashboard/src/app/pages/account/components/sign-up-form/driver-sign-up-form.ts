import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Field, FieldState, submit } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  AccountRoutePaths,
  InformationRoutePaths,
} from '@core/constants/routes.constants';
import { AuthService } from '@core/services/auth/auth.service';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { DriverProgressComponent } from '../driver-progress/driver-progress.component';
import {
  DriverSignUpFormModel,
  DriverSignUpOption,
  DriverSignUpYearsOption,
  DRIVER_SIGN_UP_PROGRESS_STEPS,
} from '@account/models/driver-sign-up/driver-sign-up-form.types';
import { createDriverSignUpForm } from '@account/models/driver-sign-up/driver-sign-up-form.config';
import { DriverSignUpDataService } from '@account/services/driver-sign-up/driver-sign-up-data.service';
import { DriverSignUpSubmissionService } from '@account/services/driver-sign-up/driver-sign-up-submission.service';

@Component({
  selector: 'app-driver-sign-up-form',
  standalone: true,
  imports: [
    Field,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MotionBackgroundComponent,
    RouterLink,
    DriverProgressComponent,
  ],
  templateUrl: './driver-sign-up-form.html',
  styleUrl: './driver-sign-up-form.scss',
})
export class DriverSignUpForm implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly dataService = inject(DriverSignUpDataService);
  private readonly submissionService = inject(DriverSignUpSubmissionService);

  protected readonly moreInformationRoute =
    InformationRoutePaths.MORE_INFORMATION;

  private readonly formModel = signal<DriverSignUpFormModel>({
    province: '',
    city: '',
    suburb: '',
    platforms: [],
    bikeOwnership: '',
    yearsDriving: '',
    daysPerWeek: null,
  });

  protected readonly driverForm = createDriverSignUpForm({
    model: this.formModel,
    hasValue: (value: unknown) => this.hasValue(value),
  });

  private readonly progressSteps = DRIVER_SIGN_UP_PROGRESS_STEPS;

  platforms = signal<DriverSignUpOption[]>([]);
  suburbs = signal<DriverSignUpOption[]>([]);
  cities = signal<DriverSignUpOption[]>([]);
  provinces = signal<DriverSignUpOption[]>([]);
  bikeOwnershipTypes = signal<DriverSignUpOption[]>([]);
  yearsDrivingOptions = signal<DriverSignUpYearsOption[]>([]);
  daysPerWeek = signal<{ value: number }[]>([]);
  isFreeTextSuburb = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private cityFetchToken = 0;
  private suburbFetchToken = 0;
  private lastProvinceId: string | null = null;
  private lastCityId: string | null = null;

  constructor() {
    this.setupFormReactivity();
  }

  private setupFormReactivity() {
    effect(
      () => {
        const provinceId = this.driverForm.province().value();
        this.handleProvinceChange(provinceId);
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const provinceId = this.driverForm.province().value();
        const cityId = this.driverForm.city().value();
        this.handleCityChange(provinceId, cityId);
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (!this.hasValue(this.driverForm.suburb().value())) {
          this.resetField(this.driverForm.platforms(), [] as string[]);
          this.resetField(this.driverForm.bikeOwnership(), '');
          this.resetField(this.driverForm.yearsDriving(), '');
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (!this.hasValue(this.driverForm.platforms().value())) {
          this.resetField(this.driverForm.bikeOwnership(), '');
          this.resetField(this.driverForm.yearsDriving(), '');
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        if (!this.hasValue(this.driverForm.bikeOwnership().value())) {
          this.resetField(this.driverForm.yearsDriving(), '');
        }
      },
      { allowSignalWrites: true },
    );
  }

  protected readonly progressState = computed(() => {
    const totalSteps = this.progressSteps.length;
    if (!totalSteps) {
      return { percent: 0, message: '' };
    }

    let completed = 0;
    for (const step of this.progressSteps) {
      const field = this.fieldFor(step.controlName);
      if (this.hasValue(field.value())) {
        completed += 1;
        continue;
      }

      return {
        percent: this.percentFrom(completed, totalSteps),
        message: step.message,
      };
    }

    return {
      percent: 100,
      message: 'All done! Save and continue.',
    };
  });

  async ngOnInit() {
    await this.loadStaticOptions();
  }

  private async loadStaticOptions() {
    const options = await this.dataService.loadStaticOptions();
    this.platforms.set(options.platforms);
    this.provinces.set(options.provinces);
    this.bikeOwnershipTypes.set(options.bikeOwnershipTypes);
    this.yearsDrivingOptions.set(options.yearsDrivingOptions);
    this.daysPerWeek.set(options.daysPerWeek);
  }

  private handleProvinceChange(provinceId: string | null) {
    if (provinceId === this.lastProvinceId) {
      return;
    }
    this.lastProvinceId = provinceId;

    this.cities.set([]);
    this.resetField(this.driverForm.city(), '');
    this.resetSuburbState();

    if (!provinceId) {
      return;
    }

    void this.loadCitiesForProvince(provinceId);
  }

  private handleCityChange(provinceId: string | null, cityId: string | null) {
    if (cityId === this.lastCityId) {
      return;
    }
    this.lastCityId = cityId;

    queueMicrotask(() => {
      this.resetSuburbState();
      if (!provinceId || !cityId) {
        return;
      }

      const isFreeText = this.shouldUseFreeTextSuburb(provinceId, cityId);
      this.isFreeTextSuburb.set(isFreeText);
      if (!isFreeText) {
        void this.loadSuburbForCity(cityId);
      }
    });
  }

  private async loadCitiesForProvince(provinceId: string) {
    const token = ++this.cityFetchToken;
    const data = await this.dataService.loadCities(provinceId);
    if (token !== this.cityFetchToken) {
      return;
    }
    this.cities.set(data);
  }

  private async loadSuburbForCity(cityId: string) {
    const token = ++this.suburbFetchToken;
    const data = await this.dataService.loadSuburbs(cityId);
    if (token !== this.suburbFetchToken) {
      return;
    }
    this.suburbs.set(data);
  }

  private resetSuburbState() {
    this.suburbs.set([]);
    this.isFreeTextSuburb.set(false);
    this.resetField(this.driverForm.suburb(), '');
  }

  private shouldUseFreeTextSuburb(provinceId: string, cityId: string) {
    const province = this.provinces().find((p) => p.id === provinceId);
    const city = this.cities().find((c) => c.id === cityId);
    if (!province || !city) {
      return false;
    }
    return (
      province.name.toLowerCase() === 'other' &&
      city.name.toLowerCase() === 'other'
    );
  }

  private resetField<T>(field: FieldState<T>, fallback: T) {
    const current = field.value();
    if (Array.isArray(current) && Array.isArray(fallback)) {
      if (current.length === 0 && fallback.length === 0) {
        return;
      }
      field.value.set(fallback);
      return;
    }

    if (current === fallback) {
      return;
    }

    field.value.set(fallback);
  }

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

  private fieldFor(
    controlName: keyof DriverSignUpFormModel,
  ): FieldState<unknown> {
    return (this.driverForm[controlName] as () => FieldState<unknown>)();
  }

  async logout() {
    await this.auth.signOut();
  }

  async saveAndContinue(event?: SubmitEvent) {
    event?.preventDefault();
    if (this.driverForm().invalid()) {
      return;
    }

    await submit(this.driverForm, async () => {
      this.submitError.set(null);
      const result = await this.submissionService.submit(this.formModel());

      if (!result.ok) {
        this.submitError.set(result.message);
        return [
          {
            kind: result.kind,
            message: result.message,
          },
        ];
      }

      await this.router.navigate([AccountRoutePaths.DRIVER_DOCUMENTS_UPLOAD]);
      return undefined;
    });
  }
}
