import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { AuthConstants } from '@core/constants/auth.constants';
import { RoleRoutePermissions } from '@core/constants/auth.role.route.permissions.constant';
import { getItem } from '@core/store/session.store';
import { filter } from 'rxjs';
import {
  RoutePaths,
  AccountRoutePaths,
} from '@core/constants/routes.constants';
import { AuthService } from '@core/services/auth/auth.service';
import { Roles } from '@core/constants/auth.role.constants';

@Component({
  selector: 'app-navbar',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  standalone: true,
})
export class Navbar {
  protected showNavbar = false;
  protected userRole = '';
  protected displayName = '';
  protected allowedRoutes: string[] = [];
  protected routePaths = RoutePaths;

  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const currentUrl = event.urlAfterRedirects;
        const isAccountSection = currentUrl.includes(`/${RoutePaths.ACCOUNT}`);
        const isUserManagement = currentUrl.includes(
          AccountRoutePaths.USER_MANAGEMENT,
        );
        // Show navbar everywhere except account pages, with an exception for user management
        this.showNavbar = !isAccountSection || isUserManagement;
        this.userRole = getItem(AuthConstants.USER_ROLE)!;
        this.displayName = getItem(AuthConstants.DISPLAY_NAME)!;
        this.allowedRoutes = RoleRoutePermissions[this.userRole] || [];
      });
  }

  protected shouldShowNavOptions() {
    const userRole = getItem(AuthConstants.USER_ROLE);

    if (!userRole || userRole === Roles.DRIVER) {
      return false;
    }
    return true;
  }

  protected navigateTo(location: string) {
    this.router.navigate([location]);
  }

  protected async logout() {
    await this.authService.signOut();
  }

  protected goToAccount() {
    this.router.navigate([AccountRoutePaths.USER_MANAGEMENT]);
  }
}
