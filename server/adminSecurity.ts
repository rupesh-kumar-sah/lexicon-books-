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
 * Validate the defense-in-depth signals required before issuing an admin session.
 * Device strings and browser coordinates are spoofable; they never replace role
 * authorization, WebAuthn user verification, or rotating server-side sessions.
 */
export async function checkAdminLoginSecurity(req: Request, signals: AdminLoginSignals): Promise<AdminSecurityCheck> {
  const { latitude, longitude, device } = signals;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || typeof device !== 'string' || !device.trim()) {
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

  const ua = device.toLowerCase();
  const isWindows = /windows nt|win32/.test(ua);
  const isChrome = /(?:chrome|crios)\//.test(ua) && !/(?:edg|edge|opr|opera|firefox|fxios)\//.test(ua);
  const isDellLaptop = /\bdell(?:\s+inc\.?)?\b/.test(ua) || /\bdell[\s_-]+laptop\b/.test(ua);
  if (!isWindows || !isChrome || !isDellLaptop) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Admin login is restricted to a Dell laptop running Chrome' },
    };
  }

  return { ok: true };
}
