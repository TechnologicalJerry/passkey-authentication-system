import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  UserProfile,
  UpdateProfileDto,
  AuditLog,
  PaginatedResult,
} from '../models/user.models';
import type { SuccessMessageResponse } from '../models/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users/me`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.baseUrl, { withCredentials: true });
  }

  updateProfile(dto: UpdateProfileDto): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.baseUrl, dto, {
      withCredentials: true,
    });
  }

  deactivateAccount(): Observable<SuccessMessageResponse> {
    return this.http.post<SuccessMessageResponse>(
      `${this.baseUrl}/deactivate`,
      {},
      { withCredentials: true },
    );
  }

  deleteAccount(): Observable<SuccessMessageResponse> {
    return this.http.delete<SuccessMessageResponse>(this.baseUrl, {
      withCredentials: true,
    });
  }

  getAuditLogs(limit = 20, offset = 0): Observable<PaginatedResult<AuditLog>> {
    const params = new HttpParams().set('limit', limit.toString()).set('offset', offset.toString());

    return this.http.get<PaginatedResult<AuditLog>>(`${this.baseUrl}/audit-logs`, {
      params,
      withCredentials: true,
    });
  }
}
