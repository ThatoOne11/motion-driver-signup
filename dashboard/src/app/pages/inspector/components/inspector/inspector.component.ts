import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Field } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { AuthService } from '@core/services/auth/auth.service';
import {
  InspectorFormModel,
  createInspectorForm,
} from '../../models/forms/inspector-form.config';
import {
  InspectorOptionsService,
  InspectorOption,
} from '../../service/inspector-options.service';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InspectorSearchService } from '../../service/inspector-search.service';
import {
  InspectorMatch,
  InspectorSearchType,
} from '../../config/inspector-search.config';
import { InspectorSearchComponent } from '../inspector-search/inspector-search';
import { InspectorSignUpService } from '../../service/inspector-sign-up.service';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Field,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MotionBackgroundComponent,
    MatProgressSpinnerModule,
    InspectorSearchComponent,
  ],
})
export class InspectorComponent {
  private readonly authService = inject(AuthService);
  private readonly inspectorOptionsService = inject(InspectorOptionsService);
  private readonly inspectorSearchService = inject(InspectorSearchService);
  private readonly inspectorSignUpService = inject(InspectorSignUpService);

  private readonly inspectorModel = signal<InspectorFormModel>({
    identifierId: '',
    searchTerm: '',
  });
  protected readonly inspectorForm = createInspectorForm(this.inspectorModel);

  protected readonly inspectorOptions = signal<InspectorOption[]>([]);
  protected readonly loadingInspectorOptions = signal(true);
  protected readonly matches = signal<InspectorMatch[]>([]);
  protected readonly matchCount = signal(0);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly selectedRecordId = signal<string | null>(null);
  protected readonly registeringDriver = signal(false);
  protected readonly registerError = signal<string | null>(null);
  protected readonly registerSuccess = signal<string | null>(null);

  constructor() {
    void this.loadInspectorOptions();
  }

  private async loadInspectorOptions(): Promise<void> {
    this.loadingInspectorOptions.set(true);
    try {
      const options = await this.inspectorOptionsService.getInspectorOptions();
      this.inspectorOptions.set(options);
    } catch (error) {
      console.error('Failed to fetch inspector options', error);
    } finally {
      this.loadingInspectorOptions.set(false);
    }
  }

  protected async searchDriver(): Promise<void> {
    if (this.inspectorForm().invalid()) {
      return;
    }
    const { identifierId, searchTerm } = this.inspectorModel();
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) {
      this.searchError.set('Please enter a value to search.');
      return;
    }
    const selectedOption = this.inspectorOptions().find(
      (option) => option.id === identifierId,
    );

    if (!selectedOption) {
      this.searchError.set('Please select an identifier to search.');
      return;
    }

    const searchType = this.getSearchType(selectedOption.name);
    if (!searchType) {
      this.searchError.set('Identifier type is not supported yet.');
      return;
    }

    this.searching.set(true);
    this.searchError.set(null);
    try {
      const result = await this.inspectorSearchService.searchInspectorMatches(
        searchType,
        trimmedSearch,
      );

      this.matches.set(result.matches);
      this.matchCount.set(result.matchCount);
      this.selectedRecordId.set(result.matches[0]?.recordId ?? null);
      this.registerSuccess.set(null);
      this.registerError.set(null);
    } catch (error) {
      this.searchError.set(
        (error as Error).message ?? 'Unable to complete the search.',
      );
      this.matches.set([]);
      this.matchCount.set(0);
      this.selectedRecordId.set(null);
      this.registerSuccess.set(null);
      this.registerError.set(null);
    } finally {
      this.searching.set(false);
    }
  }

  protected onMatchSelected(recordId: string): void {
    this.selectedRecordId.set(recordId);
    this.registerSuccess.set(null);
    this.registerError.set(null);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  protected hasError(
    errors: readonly { kind?: string }[] | undefined,
    kind: string,
  ): boolean {
    return !!errors?.some((error) => error.kind === kind);
  }

  private getSearchType(optionName: string): InspectorSearchType | null {
    const normalized = optionName.trim().toLowerCase();
    switch (normalized) {
      case 'name':
        return 'name';
      case 'email address':
        return 'email';
      case 'motion id':
        return 'motionId';
      default:
        return null;
    }
  }

  protected async registerSelectedDriver(): Promise<void> {
    const selectedId = this.selectedRecordId();
    if (!selectedId) {
      return;
    }

    const match = this.matches().find((m) => m.recordId === selectedId);
    if (!match) {
      this.registerError.set('Please select a driver to register.');
      return;
    }

    if (!match.email || !match.phone || !match.motionId) {
      this.registerError.set(
        'This driver is missing required contact details. Please select another match.',
      );
      return;
    }

    const payload = {
      fullName: match.name,
      phone: match.phone,
      email: match.email,
      password: this.generateTempPassword(),
      inspector: true,
      inspectorDetails: [
        {
          airtableRecordId: match.recordId,
          motionId: match.motionId,
        },
      ],
    };

    this.registeringDriver.set(true);
    this.registerError.set(null);
    this.registerSuccess.set(null);
    try {
      await this.inspectorSignUpService.registerInspectorDriver(payload);
      this.registerSuccess.set(
        'Driver registered successfully. They will receive onboarding instructions via WhatsApp or SMS shortly.',
      );
    } catch (error) {
      this.registerError.set(
        (error as Error).message ??
          'Unable to register this driver. Please try again.',
      );
    } finally {
      this.registeringDriver.set(false);
    }
  }

  private generateTempPassword(length: number = 16): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const cryptoObj = globalThis.crypto || (globalThis as any).msCrypto;
    if (cryptoObj?.getRandomValues) {
      const randomValues = new Uint32Array(length);
      cryptoObj.getRandomValues(randomValues);
      return Array.from(
        randomValues,
        (value) => charset[value % charset.length],
      ).join('');
    }
    return Array.from({ length })
      .map(() => charset[Math.floor(Math.random() * charset.length)])
      .join('');
  }
}
