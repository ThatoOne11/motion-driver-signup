import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { RoleRoutePermissions } from '@core/constants/auth.role.route.permissions.constant';
import { AccountRoutePaths } from '@core/constants/routes.constants';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const token = getItem(AuthConstants.ACCESS_TOKEN_KEY);
  const userRole = getItem(AuthConstants.USER_ROLE);
  const allowedRoutes = RoleRoutePermissions[userRole] || [];

  if (!token || !allowedRoutes.includes(route.routeConfig!.path!)) {
    router.navigate([AccountRoutePaths.LOGIN]);
  }

  return true;
};
