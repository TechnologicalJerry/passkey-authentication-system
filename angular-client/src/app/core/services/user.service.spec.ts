import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import type { UserProfile, PaginatedResult, AuditLog } from '../models/user.models';

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;

  const mockProfile: UserProfile = {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'User One',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    passkeyCount: 2,
    activeSessionCount: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch user profile', () => {
    service.getProfile().subscribe((res) => {
      expect(res).toEqual(mockProfile);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/users/me'));
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('should update display name', () => {
    service.updateProfile({ displayName: 'Updated Name' }).subscribe();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/users/me'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ displayName: 'Updated Name' });
    req.flush({ ...mockProfile, displayName: 'Updated Name' });
  });

  it('should fetch paginated audit logs', () => {
    const mockLogs: PaginatedResult<AuditLog> = {
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
      hasMore: false,
    };

    service.getAuditLogs(10, 0).subscribe((res) => {
      expect(res).toEqual(mockLogs);
    });

    const req = httpTesting.expectOne((r) => r.url.includes('/users/me/audit-logs'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('offset')).toBe('0');
    req.flush(mockLogs);
  });
});
