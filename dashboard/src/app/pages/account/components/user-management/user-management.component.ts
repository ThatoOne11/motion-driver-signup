import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { ProfileTabComponent } from './profile-tab/profile-tab.component';
import { DocumentsTabComponent } from './documents-tab/documents-tab.component';
import { AccountDetailsTabComponent } from './account-details-tab/account-details-tab.component';
import {
  ActiveTab,
  BankingDetails,
  DriverProfile,
  DriversLicence,
  IdProof,
  LicenceDisc,
} from '@account/models/user-management.models';
import { UserManagementService } from './services/user-management.service';

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MotionBackgroundComponent,
    ProfileTabComponent,
    DocumentsTabComponent,
    AccountDetailsTabComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private userManagementService = inject(UserManagementService);

  //Signal to track the currently active tab view.
  protected activeTab = signal<ActiveTab>('profile');

  // Signals for view state
  protected displayName = getItem(AuthConstants.DISPLAY_NAME) ?? 'Driver';
  protected profile = signal<DriverProfile | null>(null);
  protected licenceDisc = signal<LicenceDisc | null>(null);
  protected driversLicence = signal<DriversLicence | null>(null);
  protected idProof = signal<IdProof | null>(null);
  protected topBoxPhotoUrl = signal<string | null>(null);
  protected bankingDetails = signal<BankingDetails | null>(null);

  ngOnInit() {
    this.userManagementService.getProfile().subscribe((data) => {
      this.profile.set(data);
    });

    this.userManagementService.getLicenceDisc().subscribe((data) => {
      this.licenceDisc.set(data);
    });

    this.userManagementService.getDriversLicence().subscribe((data) => {
      this.driversLicence.set(data);
    });

    this.userManagementService.getIdProof().subscribe((data) => {
      this.idProof.set(data);
    });

    this.userManagementService.getBankingDetails().subscribe((data) => {
      this.bankingDetails.set(data);
    });

    this.userManagementService.getTopBoxPhotoUrl().subscribe((url) => {
      this.topBoxPhotoUrl.set(url);
    });
  }

  //Sets the active tab view.
  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    window.scrollTo(0, 0);
  }

  async signOut() {
    await this.authService.signOut();
  }

  resetPassword() {
    // TODO: Update with correct route constant
    this.router.navigate(['/auth/forgot-password']);
  }

  motionSupport() {
    // TODO: Update with correct route constant
    this.router.navigate(['/support']);
  }
}
