import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  BankingDetails,
  DriverProfile,
  DriversLicence,
  IdProof,
  LicenceDisc,
} from '@account/models/user-management.models';

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  // TODO: Remove mock data and replace with real service calls
  private mockProfile: DriverProfile = {
    firstName: 'Name',
    lastName: 'Surname',
    phoneNumber: '+27 00 000 0000',
    email: 'name@email.com',
    motionId: '0000000',
    province: 'Gauteng',
    city: 'Johannesburg',
    suburb: 'Rosebank',
    platforms: 'UberEats, Mr D',
    bikeOwnership: 'Rent',
    yearsDriving: '1-2 years',
  };

  private mockLicenceDisc: LicenceDisc = {
    bikeMake: 'Make Name',
    expiryDate: '0000/00/00',
    licenceNo: '0000000',
  };

  private mockDriversLicence: DriversLicence = {
    name: 'Name',
    codes: '0',
    validTo: '0000/00/00',
    idNo: '0000000000000',
    validFrom: '0000/00/00',
    firstIssueDate: '0000/00/00',
  };

  private mockIdProof: IdProof = {
    fullName: 'Full Name',
    idNo: '0000000000000',
    nationality: 'Country',
    dateOfBirth: '0000/00/00',
    dateOfIssue: '0000/00/00',
  };

  private mockBankingDetails: BankingDetails = {
    bank: 'Bank Name',
    accountHolder: 'Name Surname',
    paymentReference: 'MotionAds',
    branchCode: '00000000',
    accountNumber: '000000000',
    accountType: 'Current Account',
  };

  private mockTopBoxPhotoUrl = 'assets/images/mock-top-box.png';

  getProfile(): Observable<DriverProfile> {
    return of(this.mockProfile);
  }

  getLicenceDisc(): Observable<LicenceDisc> {
    return of(this.mockLicenceDisc);
  }

  getDriversLicence(): Observable<DriversLicence> {
    return of(this.mockDriversLicence);
  }

  getIdProof(): Observable<IdProof> {
    return of(this.mockIdProof);
  }

  getBankingDetails(): Observable<BankingDetails> {
    return of(this.mockBankingDetails);
  }

  getTopBoxPhotoUrl(): Observable<string> {
    return of(this.mockTopBoxPhotoUrl);
  }
}
