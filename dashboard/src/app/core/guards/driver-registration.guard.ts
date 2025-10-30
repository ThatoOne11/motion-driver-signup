import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/supabase-client.service';
import { Roles } from '@core/constants/auth.role.constants';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';
import { AccountRoutePaths, RoutePaths } from '@core/constants/routes.constants';

export const driverRegistrationGuard: CanActivateFn = async (
  _route,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const supabase = inject(SupabaseClientService);

  const role = getItem(AuthConstants.USER_ROLE);
  if (role !== Roles.DRIVER) return true;

  try {
    const { data: sessionRes } = await supabase.supabaseClient.auth.getSession();
    const userId = sessionRes.session?.user?.id;
    if (!userId) return true; // not logged in; other guards will handle

    const { data } = await supabase.supabaseClient
      .from('users')
      .select('profile_completed, documents_uploaded')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return true;

    const onProfile = state.url.startsWith(
      AccountRoutePaths.DRIVER_SIGN_UP_FORM,
    );
    const onDocuments = state.url.startsWith(
      AccountRoutePaths.DRIVER_DOCUMENTS_UPLOAD,
    );

    const profileDone = !!data.profile_completed;
    const docsDone = !!data.documents_uploaded;

    // If profile not done, force profile page
    if (!profileDone) {
      if (!onProfile) {
        router.navigate([AccountRoutePaths.DRIVER_SIGN_UP_FORM]);
        return false;
      }
      return true;
    }

    // If profile done but docs not done, force documents page
    if (profileDone && !docsDone) {
      if (!onDocuments) {
        router.navigate([AccountRoutePaths.DRIVER_DOCUMENTS_UPLOAD]);
        return false;
      }
      return true;
    }

    // If both done and user is trying to access onboarding pages, send to dashboard
    if (onProfile || onDocuments) {
      router.navigate([`/${RoutePaths.DASHBOARD}`]);
      return false;
    }
  } catch {
    // On error, don't block navigation
  }

  return true;
};
