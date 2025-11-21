import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  DriversLicence,
  IdProof,
  LicenceDisc,
} from '@account/models/user-management.models';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './documents-tab.component.html',
  styleUrl: './documents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsTabComponent {
  licenceDisc = input.required<LicenceDisc | null>();
  driversLicence = input.required<DriversLicence | null>();
  idProof = input.required<IdProof | null>();
  topBoxPhotoUrl = input.required<string | null>();
}
