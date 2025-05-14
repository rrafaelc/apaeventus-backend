export interface TokenPayload {
  id: number;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  id: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
