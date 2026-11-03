import { EARTH_RADIUS_KM, EARTH_FLATTENING } from '../../constants/defaults';

/**
 * Great-circle surface distance in km using the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates 3D Geocentric / Geodetic distance in km between two (lat, lon, alt)
 * positions by converting to WGS-84 Earth-Centered, Earth-Fixed (ECEF) coordinates.
 *
 * e^2 = 2f - f^2 (WGS-84 eccentricity squared)
 * N(phi) = a / sqrt(1 - e^2 * sin^2(phi)) (prime vertical radius of curvature)
 * X = (N(phi) + h) * cos(phi) * cos(lambda)
 * Y = (N(phi) + h) * cos(phi) * sin(lambda)
 * Z = (N(phi) * (1 - e^2) + h) * sin(phi)
 */
export function geodesic3dDistanceKm(
  lat1: number,
  lon1: number,
  alt1Km: number,
  lat2: number,
  lon2: number,
  alt2Km: number
): { surfaceDistanceKm: number; total3dDistanceKm: number; deltaAltKm: number } {
  const a = EARTH_RADIUS_KM;
  const f = EARTH_FLATTENING;
  const e2 = 2 * f - f * f;

  const toEcef = (latDeg: number, lonDeg: number, hKm: number) => {
    const phi = (latDeg * Math.PI) / 180;
    const lambda = (lonDeg * Math.PI) / 180;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);

    const x = (N + hKm) * cosPhi * Math.cos(lambda);
    const y = (N + hKm) * cosPhi * Math.sin(lambda);
    const z = (N * (1 - e2) + hKm) * sinPhi;
    return { x, y, z };
  };

  const p1 = toEcef(lat1, lon1, alt1Km);
  const p2 = toEcef(lat2, lon2, alt2Km);

  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;

  const total3dDistanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const surfaceDistanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);
  const deltaAltKm = Math.abs(alt1Km - alt2Km);

  return {
    surfaceDistanceKm: Math.round(surfaceDistanceKm * 100) / 100,
    total3dDistanceKm: Math.round(total3dDistanceKm * 100) / 100,
    deltaAltKm: Math.round(deltaAltKm * 100) / 100,
  };
}

/**
 * Format coordinates as human-readable string (e.g. 32°28'57" S, 58°13'59" W).
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Format compass bearing with cardinal abbreviation (e.g. 45° NE).
 */
export function formatAzimuthWithCardinal(az: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(az / 22.5) % 16;
  return `${Math.round(az)}° (${cardinals[index]})`;
}

/**
 * Format relative countdown string (e.g. "in 4h 12m" or "passed").
 */
export function formatCountdown(targetDate: Date): string {
  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs < 0) return 'Ahora';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `en ${days}d ${hours}h`;
  if (hours > 0) return `en ${hours}h ${minutes}m`;
  return `en ${minutes}m`;
}
