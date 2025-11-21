// Page Tab Type
export type ActiveTab = 'profile' | 'documents' | 'details';

// Interfaces
export interface DriverProfile {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  motionId: string;
  province: string;
  city: string;
  suburb: string;
  platforms: string;
  bikeOwnership: string;
  yearsDriving: string;
}

export interface LicenceDisc {
  bikeMake: string;
  expiryDate: string;
  licenceNo: string;
}

export interface DriversLicence {
  name: string;
  codes: string;
  validTo: string;
  idNo: string;
  validFrom: string;
  firstIssueDate: string;
}

export interface IdProof {
  fullName: string;
  idNo: string;
  nationality: string;
  dateOfBirth: string;
  dateOfIssue: string;
}

export interface BankingDetails {
  bank: string;
  accountHolder: string;
  paymentReference: string;
  branchCode: string;
  accountNumber: string;
  accountType: string;
}
