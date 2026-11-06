export interface PasskeySummary {
  id: string;
  credentialId: string;
  label: string;
  deviceType: string | null;
  backedUp: boolean;
  transports: string[] | null;
  createdAt: string;
  lastUsedAt: string | null;
  isRevoked: boolean;
}

export interface RenamePasskeyDto {
  label: string;
}
