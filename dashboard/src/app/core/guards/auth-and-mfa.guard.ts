import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { RoleRoutePermissions } from '@core/constants/auth.role.route.permissions.constant';
import { AccountRoutePaths, AccountRouteSubPaths, RoutePaths } from '@core/constants/routes.constants';
import { environment } from '@environments/environment';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { Roles } from '@core/constants/auth.role.constants';

export const authAndMfaGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const supabase = inject(SupabaseClientService);
  const token = getItem(AuthConstants.ACCESS_TOKEN_KEY);
  const userRole = getItem(AuthConstants.USER_ROLE);
  const mfaEnabled = getItem(AuthConstants.HAS_MFA_ENABLED_NAME);
  const mfaVerified = getItem(AuthConstants.HAS_MFA_VERIFIED_NAME);
  const allowedRoutes = RoleRoutePermissions[userRole] || [];

  // Require authentication and route access
  if (!token || !allowedRoutes.includes(route.routeConfig!.path!)) {
    router.navigate([AccountRoutePaths.LOGIN]);
    return false;
  }

  // Only enforce MFA if enabled
  if (environment.enforceMfa && mfaEnabled && !mfaVerified) {
    router.navigate([AccountRoutePaths.MFA], {
      queryParams: { returnUrl: route.routeConfig!.path! },
    });
    return false;
  }

  // Driver registration enforcement: progression gates
  try {
    if (userRole === Roles.DRIVER) {
      const { data: sessionRes } = await supabase.supabaseClient.auth.getSession();
      const userId = sessionRes.session?.user?.id;
      if (userId) {
        const { data } = await supabase.supabaseClient
          .from('users')
          .select('profile_completed, documents_uploaded')
          .eq('id', userId)
          .maybeSingle();
        if (!data) return true;

        const path = route.routeConfig?.path;
        const onProfile = path === AccountRouteSubPaths.DRIVER_SIGN_UP_FORM;
        const onDocuments = path === AccountRouteSubPaths.DRIVER_DOCUMENTS_UPLOAD;

        const profileDone = !!data.profile_completed;
        const docsDone = !!data.documents_uploaded;

        if (!profileDone) {
          if (!onProfile) {
            router.navigate([AccountRoutePaths.DRIVER_SIGN_UP_FORM]);
            return false;
          }
          return true;
        }

        if (profileDone && !docsDone) {
          if (!onDocuments) {
            router.navigate([AccountRoutePaths.DRIVER_DOCUMENTS_UPLOAD]);
            return false;
          }
          return true;
        }

        if (onProfile || onDocuments) {
          router.navigate([`/${RoutePaths.DASHBOARD}`]);
          return false;
        }
      }
    }
  } catch (e) {
    // On failure to check, fall back to allowing access
  }

  return true;
};
