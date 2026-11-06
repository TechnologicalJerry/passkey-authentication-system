import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { SessionSummary } from '../models/session.models';
import type { SuccessMessageResponse } from '../models/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  listSessions(): Observable<SessionSummary[]> {
    return this.http.get<SessionSummary[]>(`${this.baseUrl}/sessions`, {
      withCredentials: true,
    });
  }

  revokeSession(id: string): Observable<SuccessMessageResponse> {
    return this.http.delete<SuccessMessageResponse>(`${this.baseUrl}/sessions/${id}`, {
      withCredentials: true,
    });
  }

  revokeAllOtherSessions(): Observable<SuccessMessageResponse> {
    return this.http.post<SuccessMessageResponse>(
      `${this.baseUrl}/logout/all`,
      {},
      { withCredentials: true },
    );
  }
}
