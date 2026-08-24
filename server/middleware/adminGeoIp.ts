import { Request } from 'express';

const cache = new Map<string, { expiresAt: number; country?: string; latitude?: number; longitude?: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '').trim();
  return normalized === '127.0.0.1' || normalized === '::1' || normalized.startsWith('10.') || normalized.startsWith('192.168.') || normalized.startsWith('172.16.') || normalized.startsWith('172.17.') || normalized.startsWith('172.18.') || normalized.startsWith('172.19.') || normalized.startsWith('172.2') || normalized.startsWith('172.30.') || normalized.startsWith('172.31.');
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function lookup(ip: string) {
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const provider = process.env.GEOIP_PROVIDER_URL;
  if (!provider) return null;
  const url = provider.includes('{ip}') ? provider.replace('{ip}', encodeURIComponent(ip)) : `${provider.replace(/\/$/, '')}/${encodeURIComponent(ip)}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (process.env.GEOIP_PROVIDER_TOKEN) headers.authorization = `Bearer ${process.env.GEOIP_PROVIDER_TOKEN}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`GeoIP provider returned ${response.status}`);
  const data = await response.json() as Record<string, unknown>;
  const result = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    country: String(data.countryCode || data.country_code || data.country || '').toUpperCase() || undefined,
    latitude: Number(data.latitude ?? data.lat),
    longitude: Number(data.longitude ?? data.lon ?? data.lng),
  };
  if (!Number.isFinite(result.latitude)) result.latitude = undefined;
  if (!Number.isFinite(result.longitude)) result.longitude = undefined;
  cache.set(ip, result);
  return result;
}

export async function enforceAdminGeoIp(req: Request): Promise<{ allowed: boolean; reason?: string }> {
  const allowedCountry = process.env.ADMIN_ALLOWED_COUNTRY?.trim().toUpperCase();
  const targetLat = Number(process.env.ADMIN_ALLOWED_LATITUDE);
  const targetLng = Number(process.env.ADMIN_ALLOWED_LONGITUDE);
  const radiusKm = Number(process.env.ADMIN_ALLOWED_RADIUS_KM);
  const countryEnabled = Boolean(allowedCountry);
  const radiusEnabled = Number.isFinite(targetLat) && Number.isFinite(targetLng) && Number.isFinite(radiusKm) && radiusKm > 0;
  if (!countryEnabled && !radiusEnabled) return { allowed: true };

  const ip = String(req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (!ip || isPrivateIp(ip)) return { allowed: false, reason: 'GeoIP unavailable for private or missing client IP' };
  try {
    const location = await lookup(ip);
    if (!location) return { allowed: false, reason: 'GeoIP provider is not configured' };
    if (countryEnabled && location.country !== allowedCountry) return { allowed: false, reason: 'Client country is outside the admin policy' };
    if (radiusEnabled && location.latitude !== undefined && location.longitude !== undefined) {
      const distance = distanceKm(targetLat, targetLng, location.latitude, location.longitude);
      if (distance > radiusKm) return { allowed: false, reason: 'Client IP is outside the admin radius' };
    } else if (radiusEnabled) {
      return { allowed: false, reason: 'GeoIP coordinates are unavailable' };
    }
    return { allowed: true };
  } catch (error) {
    console.error('[GeoIP] Lookup failed:', error instanceof Error ? error.message : error);
    return { allowed: false, reason: 'GeoIP lookup failed' };
  }
}
