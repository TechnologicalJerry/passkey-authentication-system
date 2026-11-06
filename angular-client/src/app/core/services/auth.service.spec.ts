import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import type { UserSummary } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  const mockUser: UserSummary = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    displayName: 'Test User',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should be created with initial unauthenticated state', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('should set session and update signals and localStorage', () => {
    service.setSession('token-123', mockUser);

    expect(service.accessToken()).toBe('token-123');
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('passkey_access_token')).toBe('token-123');
  });

  it('should clear session and remove items from localStorage', () => {
    service.setSession('token-123', mockUser);
    service.clearSession();

    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('passkey_access_token')).toBeNull();
  });

  it('should call backend to generate registration options', () => {
    const dto = { email: 'new@example.com', displayName: 'New User' };
    const mockRes = { challengeId: 'c-1', options: {} as any };

    service.getRegistrationOptions(dto).subscribe((res) => {
      expect(res).toEqual(mockRes);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/auth/passkeys/registration/options'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockRes);
  });

  it('should call backend to generate authentication options', () => {
    const dto = { email: 'test@example.com' };
    const mockRes = { challengeId: 'c-2', options: {} as any };

    service.getAuthenticationOptions(dto).subscribe((res) => {
      expect(res).toEqual(mockRes);
    });

    const req = httpTesting.expectOne((r) =>
      r.url.endsWith('/auth/passkeys/authentication/options'),
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockRes);
  });
});
