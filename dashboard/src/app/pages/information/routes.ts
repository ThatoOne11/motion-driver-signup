import { Routes } from '@angular/router';
import { TermsOfService } from './components/terms-of-service/terms-of-service';
import { InformationRouteSubPaths } from '@core/constants/routes.constants';
import { PrivacyPolicy } from './components/privacy-policy/privacy-policy';
import { MoreInformation } from './components/more-information/more-information';

export const INFORMATION_ROUTES_WITH_NO_GUARD: Routes = [
  {
    path: InformationRouteSubPaths.TERMS_OF_SERVICE,
    component: TermsOfService,
  },
  {
    path: InformationRouteSubPaths.PRIVACY_POLICY,
    component: PrivacyPolicy,
  },
  {
    path: InformationRouteSubPaths.MORE_INFORMATION,
    component: MoreInformation,
  },
];
