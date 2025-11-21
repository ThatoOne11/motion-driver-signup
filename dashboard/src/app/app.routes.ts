import { Routes } from '@angular/router';
import { RoutePaths } from '@core/constants/routes.constants';
import { authGuard } from '@core/guards/auth.guard';
import { authAndMfaGuard } from '@core/guards/auth-and-mfa.guard';
import { driverRegistrationGuard } from '@core/guards/driver-registration.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authAndMfaGuard, driverRegistrationGuard],
  },
  {
    path: RoutePaths.ACCOUNT,
    loadChildren: () =>
      import('@account/routes').then((m) => m.ACCOUNT_ROUTES_WITH_NO_GUARD),
  },
  {
    path: RoutePaths.ACCOUNT,
    loadChildren: () =>
      import('@account/routes').then((m) => m.ACCOUNT_ROUTES_WITH_AUTH_GUARD),
    canActivate: [authGuard, driverRegistrationGuard],
  },
  {
    path: RoutePaths.ACCOUNT,
    loadChildren: () =>
      import('@account/routes').then((m) => m.ACCOUNT_ROUTES_WITH_MFA_GUARD),
    canActivate: [authAndMfaGuard, driverRegistrationGuard],
  },

  {
    path: RoutePaths.DASHBOARD,
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authAndMfaGuard, driverRegistrationGuard],
  },
  {
    path: RoutePaths.INSPECTOR,
    loadComponent: () =>
      import('./pages/inspector/components/inspector/inspector.component').then(
        (m) => m.InspectorComponent,
      ),
    canActivate: [authAndMfaGuard],
  },
  {
    path: RoutePaths.INFORMATION,
    loadChildren: () =>
      import('@information/routes').then(
        (m) => m.INFORMATION_ROUTES_WITH_NO_GUARD,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
