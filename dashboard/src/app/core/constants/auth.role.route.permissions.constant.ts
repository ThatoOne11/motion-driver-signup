import { Roles } from '@core/constants/auth.role.constants';
import { RoutePaths } from '@core/constants/routes.constants';

export const RoleRoutePermissions: Record<string, string[]> = {
  [Roles.SUPER_ADMIN]: [RoutePaths.ACCOUNT, RoutePaths.DASHBOARD],
  [Roles.ADMIN]: [RoutePaths.ACCOUNT, RoutePaths.DASHBOARD],
  [Roles.DRIVER]: [RoutePaths.ACCOUNT, RoutePaths.DASHBOARD],
};
