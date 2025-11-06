import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import { loadingInterceptor } from '@core/interceptors/loading.interceptor';
import { hydrateSessionStore } from '@core/store/session.store';
import { AuthService } from '@core/services/auth/auth.service';
import { provideMarkdown } from 'ngx-markdown';

function appInitializer() {
  const auth = inject(AuthService);

  try {
    hydrateSessionStore();
  } catch (e) {
    // keep bootstrap resilient
    console.warn('[appInitializer] hydrateSessionStore failed:', e);
  }

  // If async, return a Promise (Angular will await it)
  return typeof auth.initialiseSession === 'function'
    ? Promise.resolve(auth.initialiseSession())
    : undefined;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor])),
    provideRouter(routes),
    provideAppInitializer(appInitializer),
    provideMarkdown(),
  ],
};
