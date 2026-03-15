import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpClient
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { TokenService } from './token.service';

type RefreshResponse = { accessToken: string };

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isRefreshCall = req.url.includes('/auth/refresh');
    const isAuthCall = req.url.includes('/auth/') || req.url.includes('/users/login') || req.url.includes('/users/register');

    let requestToSend = req;

    const token = this.tokenService.getToken();
    const isApiCall = req.url.startsWith(environment.apiBaseUrl) || req.url.includes('/api/');

    // Contrainte: toujours envoyer/recevoir les cookies (refresh, etc.) sur les appels API.
    if (isApiCall && requestToSend.withCredentials !== true) {
      requestToSend = requestToSend.clone({ withCredentials: true });
    }

    // Ajoute Authorization si c'est une requête API et que le header n'existe pas déjà.
    if (token && isApiCall && !isAuthCall && !requestToSend.headers.has('Authorization')) {
      requestToSend = requestToSend.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(requestToSend).pipe(
      catchError((err: unknown) => {
        if (isRefreshCall) {
          return throwError(() => err);
        }

        const httpErr = err as HttpErrorResponse;
        const alreadyRetried = requestToSend.headers.get('X-Auth-Retry') === '1';

        if (httpErr?.status !== 401 || alreadyRetried) {
          return throwError(() => err);
        }

        // Tente une rotation du refresh token (cookie HttpOnly)
        return this.http
          .post<RefreshResponse>(`${environment.apiBaseUrl}/auth/refresh`, {}, { withCredentials: true })
          .pipe(
            switchMap((resp) => {
              if (!resp?.accessToken) {
                this.tokenService.clearToken();
                return throwError(() => err);
              }

              this.tokenService.setToken(resp.accessToken);

              const retried = requestToSend.clone({
                setHeaders: {
                  Authorization: `Bearer ${resp.accessToken}`,
                  'X-Auth-Retry': '1'
                }
              });

              return next.handle(retried);
            }),
            catchError((refreshErr) => {
              // Refresh KO → l'utilisateur doit se reconnecter
              this.tokenService.clearToken();
              return throwError(() => refreshErr);
            })
          );
      })
    );
  }
}
