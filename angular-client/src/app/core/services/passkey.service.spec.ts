import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PasskeyService } from './passkey.service';
import type { PasskeySummary } from '../models/passkey.models';

describe('PasskeyService', () => {
  let service: PasskeyService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PasskeyService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PasskeyService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch list of user passkeys', () => {
    const mockList: PasskeySummary[] = [
      {
        id: 'pk-1',
        credentialId: 'cred-1',
        label: 'MacBook Touch ID',
        deviceType: 'platform',
        backedUp: true,
        transports: ['internal'],
        createdAt: '2026-01-01T00:00:00.000Z',
        lastUsedAt: null,
        isRevoked: false,
      },
    ];

    service.listPasskeys().subscribe((data) => {
      expect(data).toEqual(mockList);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/passkeys'));
    expect(req.request.method).toBe('GET');
    req.flush(mockList);
  });

  it('should rename passkey', () => {
    service.renamePasskey('pk-1', 'Renamed Key').subscribe();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/passkeys/pk-1'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ label: 'Renamed Key' });
    req.flush({ id: 'pk-1', label: 'Renamed Key' });
  });

  it('should revoke passkey', () => {
    service.revokePasskey('pk-1').subscribe();

    const req = httpTesting.expectOne((r) => r.url.endsWith('/passkeys/pk-1'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'Passkey revoked' });
  });
});
