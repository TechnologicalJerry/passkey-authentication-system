export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface SuccessMessageResponse {
  success: boolean;
  message: string;
  revokedCount?: number;
}
