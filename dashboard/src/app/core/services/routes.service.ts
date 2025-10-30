import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { Roles } from '@core/constants/auth.role.constants';
import {
  ADMIN_LANDING_PAGE,
  CLIENT_LANDING_PAGE,
} from '@core/constants/routes.constants';

@Injectable({
  providedIn: 'root',
})
export class RoutesService {
  auth = inject(AuthService);

  getLandingPage() {
    const userRole = getItem(AuthConstants.USER_ROLE);

    if (userRole === Roles.ADMIN || userRole === Roles.SUPER_ADMIN) {
      return ADMIN_LANDING_PAGE;
    } else {
      return CLIENT_LANDING_PAGE;
    }
  }
}
