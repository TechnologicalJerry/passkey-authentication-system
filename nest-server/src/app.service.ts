import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; description: string; status: string } {
    return {
      name: 'Passkey Authentication API',
      description:
        'Production-grade passwordless authentication backend using WebAuthn/FIDO2 passkeys',
      status: 'running',
    };
  }
}
