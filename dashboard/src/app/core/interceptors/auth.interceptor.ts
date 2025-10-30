import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { getItem } from '@core/store/session.store';
import { AuthConstants } from '@core/constants/auth.constants';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(
    httpRequest: HttpRequest<any>,
    next: HttpHandler | HttpHandlerFn
  ): Observable<HttpEvent<any>> {
    const isLoginRequest =
      httpRequest.method === AuthConstants.POST_METHOD &&
      httpRequest.url.includes(AuthConstants.TOKEN_ENDPOINT) &&
      httpRequest.body?.grant_type === AuthConstants.PASSWORD_GRANT_TYPE;

    if (isLoginRequest) {
      return typeof next === 'function'
        ? next(httpRequest)
        : next.handle(httpRequest);
    }

    const token = getItem(AuthConstants.ACCESS_TOKEN_KEY);

    if (token) {
      const authReq = httpRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return typeof next === 'function' ? next(authReq) : next.handle(authReq);
    }

    return typeof next === 'function'
      ? next(httpRequest)
      : next.handle(httpRequest);
  }
}
