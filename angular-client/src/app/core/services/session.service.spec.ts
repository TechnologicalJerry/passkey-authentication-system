import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionService } from './session.service';
import type { SessionSummary } from '../models/session.models';

describe('SessionService', () => {
  let service: SessionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SessionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch list of active sessions', () => {
    const mockSessions: SessionSummary[] = [
      {
        id: 'sess-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-01-08T00:00:00.000Z',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Chrome',
        deviceLabel: 'Chrome on macOS',
        isCurrent: true,
        isRevoked: false,
      },
    ];

    service.listSessions().subscribe((data) => {
      expect(data).toEqual(mockSessions);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/auth/sessions'));
    expect(req.request.method).toBe('GET');
    req.flush(mockSessions);
  });

  it('should revoke a specific session', () => {
    service.revokeSession('sess-1').subscribe();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/auth/sessions/sess-1'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'Session revoked' });
  });

  it('should revoke all other sessions', () => {
    service.revokeAllOtherSessions().subscribe();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/auth/logout/all'));
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'All sessions revoked', revokedCount: 2 });
  });
});
