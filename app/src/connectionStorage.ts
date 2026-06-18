export const NAPOLEON_ENDPOINT_STORAGE_KEY = "napoleon_endpoint";
export const NAPOLEON_AUTH_TOKEN_STORAGE_KEY = "napoleon_auth_token";

export function readConfiguredEndpointFromStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(NAPOLEON_ENDPOINT_STORAGE_KEY);
}

export function readConfiguredAuthTokenFromStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem(NAPOLEON_AUTH_TOKEN_STORAGE_KEY);
  return token?.trim() ? token.trim() : null;
}
