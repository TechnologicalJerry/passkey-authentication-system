import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let authReq = req.clone({
    withCredentials: true,
  });

  const token = authService.accessToken();
  if (token && !req.headers.has('Authorization')) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/token/refresh') &&
        !req.url.includes('/auth/passkeys/authentication') &&
        !req.url.includes('/auth/passkeys/registration')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;

          return authService.refreshToken().pipe(
            switchMap((rotateRes) => {
              isRefreshing = false;
              if (rotateRes.tokens?.accessToken) {
                authService.setSession(
                  rotateRes.tokens.accessToken,
                  rotateRes.session as unknown as import('../models/auth.models').UserSummary,
                );

                const retryReq = req.clone({
                  withCredentials: true,
                  setHeaders: {
                    Authorization: `Bearer ${rotateRes.tokens.accessToken}`,
                  },
                });
                return next(retryReq);
              }
              authService.clearSession();
              router.navigate(['/auth/login']);
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authService.clearSession();
              router.navigate(['/auth/login']);
              return throwError(() => refreshErr);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
