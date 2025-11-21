import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { registerCustomSvgIcons } from '@core/utils/register-svg-icons';
import { Navbar } from '@core/components/navbar/navbar';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { LoaderComponent } from '@core/components/loader/loader';
import { ToastComponent } from '@core/components/toast/toast';
import { filter } from 'rxjs';
import { NAVBAR_HIDDEN_ROUTES } from '@core/constants/navbar.constants';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    MatIconModule,
    LoaderComponent,
    ToastComponent
],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App {
  private readonly router = inject(Router);
  private readonly matIconRegistry: MatIconRegistry;
  private readonly domSanitizer: DomSanitizer;

  //Signal to control the visibility of the main navbar.
  protected hideNavbar = signal(false);

  constructor(matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
    this.matIconRegistry = matIconRegistry;
    this.domSanitizer = domSanitizer;

    registerCustomSvgIcons(this.matIconRegistry, this.domSanitizer);

    this.subscribeToRouteChanges();
  }

  //Listens to router events to determine if the navbar should be hidden.
  private subscribeToRouteChanges(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;

        if (NAVBAR_HIDDEN_ROUTES.some((path) => url.startsWith(path))) {
          this.hideNavbar.set(true);
        } else {
          this.hideNavbar.set(false);
        }
      });
  }
}
