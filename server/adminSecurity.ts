import type { Request } from 'express';
import { enforceAdminGeoIp } from './middleware/adminGeoIp';

export type AdminLoginSignals = {
  latitude?: unknown;
  longitude?: unknown;
  device?: unknown;
};

export type AdminSecurityCheck =
  | { ok: true }
  | { ok: false; status: 401 | 403; body: { error: string; requiresAdminVerification?: boolean } };

/**
 * Validate defense-in-depth signals before issuing an admin session. Browser
 * identity headers and coordinates are spoofable, so they never replace role
 * authorization, WebAuthn user verification, or rotating server-side sessions.
 * Desktop Chrome does not provide a reliable manufacturer identity, therefore
 * Dell ownership is proved through the enrolled platform passkey instead of a
 * fabricated User-Agent marker.
 */
export async function checkAdminLoginSecurity(req: Request, signals: AdminLoginSignals): Promise<AdminSecurityCheck> {
  const { latitude, longitude } = signals;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'Admin security verification required. Please allow location access.',
        requiresAdminVerification: true,
      },
    };
  }

  const geoIpResult = await enforceAdminGeoIp(req);
  if (!geoIpResult.allowed) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Admin login is outside the allowed network or location policy' },
    };
  }

  const ua = req.get('user-agent') || '';
  const isWindows = /windows nt|win32/i.test(ua);
  const isChrome = /(?:chrome|crios)\//i.test(ua) && !/(?:edg|edge|opr|opera|firefox|fxios)\//i.test(ua);
  if (!isWindows || !isChrome) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Admin login is restricted to Windows Chrome with the enrolled Windows Hello passkey.' },
    };
  }

  return { ok: true };
}
