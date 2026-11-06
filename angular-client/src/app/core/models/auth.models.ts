import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSuccessResult {
  verified: boolean;
  user: UserSummary;
  tokens?: TokenPair;
}

export interface RegistrationOptionsDto {
  email: string;
  displayName?: string;
  invitationToken?: string;
}

export interface RegistrationOptionsResult {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface RegistrationVerifyDto {
  challengeId: string;
  response: RegistrationResponseJSON;
  label?: string;
}

export interface AuthenticationOptionsDto {
  email?: string;
}

export interface AuthenticationOptionsResult {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

export interface AuthenticationVerifyDto {
  challengeId: string;
  response: AuthenticationResponseJSON;
}
