import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '@core/services/loading.service';
import { finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const loaderService = inject(LoaderService);
  loaderService.loadingOn();
  return next(req).pipe(
    finalize(() => {
      loaderService.loadingOff();
    })
  );
};
