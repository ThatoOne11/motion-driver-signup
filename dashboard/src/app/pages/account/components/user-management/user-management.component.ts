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
import { forkJoin, finalize } from 'rxjs';
import { LoaderComponent } from '@core/components/loader/loader';
import { LoaderService } from '@core/services/loading.service';

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
    LoaderComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private userManagementService = inject(UserManagementService);
  private loaderService = inject(LoaderService);

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

  // Loading State
  protected isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loaderService.loadingOn();

    //forkjoin to load stuff in parallel and handle the loading state once
    forkJoin({
      profile: this.userManagementService.getProfile(),
      licenceDisc: this.userManagementService.getLicenceDisc(),
      driversLicence: this.userManagementService.getDriversLicence(),
      idProof: this.userManagementService.getIdProof(),
      bankingDetails: this.userManagementService.getBankingDetails(),
      topBoxPhotoUrl: this.userManagementService.getTopBoxPhotoUrl(),
    })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.loaderService.loadingOff();
        }),
      )
      .subscribe((results) => {
        this.profile.set(results.profile);
        this.licenceDisc.set(results.licenceDisc);
        this.driversLicence.set(results.driversLicence);
        this.idProof.set(results.idProof);
        this.bankingDetails.set(results.bankingDetails);
        this.topBoxPhotoUrl.set(results.topBoxPhotoUrl);
      });
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 0);
  }

  async signOut() {
    await this.authService.signOut();
  }

  motionSupport() {
    this.router.navigate(['/support']);
  }
}
