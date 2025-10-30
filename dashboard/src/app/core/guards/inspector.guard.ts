import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { Roles } from '@core/constants/auth.role.constants';
import {
  ADMIN_LANDING_PAGE,
  INSPECTOR_LANDING_PAGE,
} from '@core/constants/routes.constants';

export const inspectorGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const userRole = getItem(AuthConstants.USER_ROLE);

  const isInspector = userRole === Roles.INSPECTOR;
  const isTargetingInspectorPage = state.url.startsWith(INSPECTOR_LANDING_PAGE);

  if (isInspector) {
    if (isTargetingInspectorPage) {
      return true;
    }
    // Inspector is trying to access a non-inspector page
    router.navigate([INSPECTOR_LANDING_PAGE]);
    return false;
  }

  // User is NOT an inspector
  if (isTargetingInspectorPage) {
    // Non-inspector trying to access inspector page
    router.navigate([ADMIN_LANDING_PAGE]);
    return false;
  }

  return true;
};
