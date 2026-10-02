export type AuthMode = 'legacy' | 'hybrid' | 'broker';

export const INNOVACOIN_PLATFORM_TAG = 'innovacoin';

/** Bracket access so Docker/runtime AUTH_MODE is not inlined at `next build`. */
function env(name: string): string | undefined {
  return process.env[name];
}

export function getAuthMode(): AuthMode {
  const mode = (env('AUTH_MODE') || 'legacy').trim().toLowerCase();
  if (mode === 'legacy' || mode === 'hybrid' || mode === 'broker') {
    return mode;
  }
  return 'legacy';
}

export function brokerEnabled(mode: AuthMode = getAuthMode()) {
  return mode === 'hybrid' || mode === 'broker';
}

export function brokerOnly(mode: AuthMode = getAuthMode()) {
  return mode === 'broker';
}

export function credentialsEnabled(mode: AuthMode = getAuthMode()) {
  return mode === 'legacy' || mode === 'hybrid';
}

export function centralOidcConfigured() {
  return Boolean(process.env['CENTRAL_OIDC_CLIENT_SECRET']?.trim());
}

export function ssoEnabled(mode: AuthMode = getAuthMode()) {
  return brokerEnabled(mode) && centralOidcConfigured();
}

export function centralAuthEnabled(mode: AuthMode = getAuthMode()) {
  return ssoEnabled(mode);
}

export function unauthenticatedLoginPath(mode: AuthMode = getAuthMode()) {
  if (ssoEnabled(mode)) {
    return '/auth/login';
  }
  return '/login';
}
