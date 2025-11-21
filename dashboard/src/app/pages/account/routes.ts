import { Routes } from '@angular/router';
import { PasswordReset } from '@account/components/password-reset/password-reset';
import { AccountAccessComponent } from '@account/components/auth-flow/auth.flow.component';
import { OnboardingSignUp } from './components/onboarding-sign-up/onboarding-sign-up';
import { MultifactorAuthentication } from './components/multifactor-authentication/multifactor-authentication';
import { Unauthorized } from './components/unauthorized/unauthorized';
import { AccountRouteSubPaths } from '@core/constants/routes.constants';
import { EmailPassthrough } from './components/email-passthrough/email-passthrough';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { DriverSignUpForm } from './components/sign-up-form/driver-sign-up-form';
import { DocumentsUploadComponent } from './components/documents-upload/documents-upload';

export const ACCOUNT_ROUTES_WITH_NO_GUARD: Routes = [
  {
    path: '',
    component: AccountAccessComponent,
  },
  {
    path: AccountRouteSubPaths.LOGIN,
    component: AccountAccessComponent,
  },
  {
    path: AccountRouteSubPaths.REGISTER,
    component: AccountAccessComponent,
  },
  {
    path: AccountRouteSubPaths.ONBOARDING_SIGN_UP,
    component: OnboardingSignUp,
  },
  {
    path: 'unauthorized',
    component: Unauthorized,
  },
  {
    path: AccountRouteSubPaths.PASSWORD_RESET,
    component: PasswordReset,
  },
  {
    path: AccountRouteSubPaths.EMAIL_PASSTHROUGH,
    component: EmailPassthrough,
  },
  {
    path: AccountRouteSubPaths.PENDING_VERIFICATION,
    component: OnboardingSignUp,
    data: { mode: 'pending-verification' },
  },
];

export const ACCOUNT_ROUTES_WITH_AUTH_GUARD: Routes = [
  {
    path: AccountRouteSubPaths.MFA,
    component: MultifactorAuthentication,
  },
  {
    path: AccountRouteSubPaths.USER_MANAGEMENT,
    component: UserManagementComponent,
  },
  {
    path: AccountRouteSubPaths.DRIVER_SIGN_UP_FORM,
    component: DriverSignUpForm,
  },
  {
    path: AccountRouteSubPaths.DRIVER_DOCUMENTS_UPLOAD,
    component: DocumentsUploadComponent,
  },
];

export const ACCOUNT_ROUTES_WITH_MFA_GUARD: Routes = [
  {
    path: AccountRouteSubPaths.PASSWORD_RESET,
    component: PasswordReset,
  },
];
