import * as satellite from 'satellite.js';
import { SatelliteRecord, SatellitePosition, ObserverLocation, GroundTrackPoint } from '../../types/satellite';
import { EARTH_RADIUS_KM } from '../../constants/defaults';

export class Sgp4Engine {
  private satrecCache: Map<number, satellite.SatRec> = new Map();

  /**
   * Initializes or retrieves a cached SatRec object from satellite data.
   */
  public getSatRec(sat: SatelliteRecord): satellite.SatRec | null {
    if (this.satrecCache.has(sat.id)) {
      return this.satrecCache.get(sat.id)!;
    }

    try {
      let satrec: satellite.SatRec;
      if (sat.rawData && typeof sat.rawData === 'object' && !sat.line1) {
        // OMM / JSON format
        satrec = satellite.json2satrec(sat.rawData);
      } else {
        // TLE format (Standard 2-line format)
        satrec = satellite.twoline2satrec(sat.line1, sat.line2);
      }

      if (satrec && satrec.error === 0) {
        this.satrecCache.set(sat.id, satrec);
        return satrec;
      }
      return null;
    } catch (err) {
      console.warn(`[SGP4] Failed to initialize SatRec for sat ${sat.id}:`, err);
      return null;
    }
  }

  /**
   * Calculates real-time position, velocity, and look angles from observer.
   */
  public getPosition(
    sat: SatelliteRecord,
    time: Date = new Date(),
    observer?: ObserverLocation
  ): SatellitePosition | null {
    const satrec = this.getSatRec(sat);
    if (!satrec) return null;

    try {
      const positionAndVelocity = satellite.propagate(satrec, time);
      if (
        !positionAndVelocity ||
        !positionAndVelocity.position ||
        !positionAndVelocity.velocity ||
        typeof positionAndVelocity.position === 'boolean' ||
        typeof positionAndVelocity.velocity === 'boolean'
      ) {
        return null;
      }

      const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
      const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;

      const gmst = satellite.gstime(time);
      const geodetic = satellite.eciToGeodetic(positionEci, gmst);

      const latDeg = satellite.degreesLat(geodetic.latitude);
      const lonDeg = satellite.degreesLong(geodetic.longitude);
      const altKm = geodetic.height;

      // Speed in km/s: ||v|| = sqrt(vx^2 + vy^2 + vz^2)
      const speedKmS = Math.sqrt(
        velocityEci.x * velocityEci.x +
        velocityEci.y * velocityEci.y +
        velocityEci.z * velocityEci.z
      );

      // Check shadow / sunlit
      const isSunlit = this.isSatelliteSunlit(positionEci, time);

      const result: SatellitePosition = {
        satId: sat.id,
        name: sat.name,
        timestamp: time,
        latitude: latDeg,
        longitude: lonDeg,
        altitude: altKm,
        velocity: speedKmS,
        isSunlit,
      };

      // If observer is provided, compute Azimuth, Elevation, Range, and Range Rate
      if (observer) {
        const observerGd: satellite.GeodeticLocation = {
          latitude: satellite.degreesToRadians(observer.latitude),
          longitude: satellite.degreesToRadians(observer.longitude),
          height: (observer.altitudeMeters || 0) / 1000.0,
        };

        const positionEcf = satellite.eciToEcf(positionEci, gmst);
        const observerEcf = satellite.geodeticToEcf(observerGd);
        const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

        const azDeg = satellite.radiansToDegrees(lookAngles.azimuth);
        const elDeg = satellite.radiansToDegrees(lookAngles.elevation);
        const rangeKm = lookAngles.rangeSat;

        // Range rate calculation (Doppler)
        const rangeRate = this.computeRangeRate(positionEcf, observerEcf, velocityEci, gmst);

        result.azimuth = (azDeg + 360) % 360;
        result.elevation = elDeg;
        result.range = rangeKm;
        result.rangeRate = rangeRate;
      }

      return result;
    } catch (err) {
      console.warn(`[SGP4] Propagation error for sat ${sat.id}:`, err);
      return null;
    }
  }

  /**
   * Evaluates if satellite is in sunlight or Earth's shadow.
   */
  public isSatelliteSunlit(positionEci: satellite.EciVec3<number>, time: Date): boolean {
    try {
      const nowJday = satellite.jday(time);
      const sunResult = satellite.sunPos(nowJday);
      if (!sunResult || !sunResult.rsun) return true;

      const sunEci = sunResult.rsun;
      // Earth-centered vectors
      // Sun unit vector
      const sunDist = Math.sqrt(sunEci.x * sunEci.x + sunEci.y * sunEci.y + sunEci.z * sunEci.z);
      const sunUnit = { x: sunEci.x / sunDist, y: sunEci.y / sunDist, z: sunEci.z / sunDist };

      // Satellite distance
      const satDist = Math.sqrt(positionEci.x * positionEci.x + positionEci.y * positionEci.y + positionEci.z * positionEci.z);

      // Dot product: proj of sat along Sun vector
      const dot = positionEci.x * sunUnit.x + positionEci.y * sunUnit.y + positionEci.z * sunUnit.z;

      // If satellite is on the sunward side of Earth, it's illuminated
      if (dot > 0) return true;

      // Distance perpendicular to Earth-Sun line
      const perpDist = Math.sqrt(Math.max(0, satDist * satDist - dot * dot));
      return perpDist > EARTH_RADIUS_KM;
    } catch {
      return true;
    }
  }

  /**
   * Computes approximate range rate in km/s (positive = receding, negative = approaching).
   */
  private computeRangeRate(
    posEcf: satellite.EcfVec3<number>,
    obsEcf: satellite.EcfVec3<number>,
    velEci: satellite.EciVec3<number>,
    gmst: number
  ): number {
    const rhoX = posEcf.x - obsEcf.x;
    const rhoY = posEcf.y - obsEcf.y;
    const rhoZ = posEcf.z - obsEcf.z;
    const rhoMag = Math.sqrt(rhoX * rhoX + rhoY * rhoY + rhoZ * rhoZ);
    if (rhoMag === 0) return 0;

    // Earth angular velocity (rad/s)
    const omegaE = 7.292115e-5;
    // Velocity in ECF
    const velEcfX = velEci.x + omegaE * posEcf.y;
    const velEcfY = velEci.y - omegaE * posEcf.x;
    const velEcfZ = velEci.z;

    const dotProduct = (rhoX * velEcfX + rhoY * velEcfY + rhoZ * velEcfZ) / rhoMag;
    return dotProduct;
  }

  /**
   * Generates ground track polyline segments over at least one full orbit,
   * dividing the polyline when crossing the antimeridian (|lon_diff| > 180°).
   */
  public getGroundTrackSegments(
    sat: SatelliteRecord,
    centerTime: Date = new Date(),
    pastMinutes: number = 45,
    futureMinutes: number = 95,
    stepSeconds: number = 45
  ): GroundTrackPoint[][] {
    const satrec = this.getSatRec(sat);
    if (!satrec) return [];

    const segments: GroundTrackPoint[][] = [];
    let currentSegment: GroundTrackPoint[] = [];

    const startTime = centerTime.getTime() - pastMinutes * 60 * 1000;
    const endTime = centerTime.getTime() + futureMinutes * 60 * 1000;
    const stepMs = stepSeconds * 1000;

    let previousLon: number | null = null;

    for (let t = startTime; t <= endTime; t += stepMs) {
      const pointDate = new Date(t);
      const posAndVel = satellite.propagate(satrec, pointDate);
      if (!posAndVel || !posAndVel.position || typeof posAndVel.position === 'boolean') {
        continue;
      }

      const gmst = satellite.gstime(pointDate);
      const geodetic = satellite.eciToGeodetic(posAndVel.position as satellite.EciVec3<number>, gmst);
      const lat = satellite.degreesLat(geodetic.latitude);
      const lon = satellite.degreesLong(geodetic.longitude);
      const alt = geodetic.height;

      // Antimeridian split check: if lon jumps across +/- 180°
      if (previousLon !== null) {
        const deltaLon = Math.abs(lon - previousLon);
        if (deltaLon > 180) {
          // Antimeridian crossed! End current segment and start a new segment
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        }
      }

      currentSegment.push({
        latitude: lat,
        longitude: lon,
        timestamp: t,
        altitude: alt,
      });

      previousLon = lon;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Computes footprint polygon coordinates (coverage circle) for a satellite
   * given its altitude and minimum elevation angle threshold.
   *
   * Formula:
   * Re = 6378.137 km
   * beta = acos( (Re / (Re + h)) * cos(minElevation) ) - minElevation
   * Ground radius = Re * beta (in radians)
   */
  public getFootprintPolygon(
    lat: number,
    lon: number,
    altKm: number,
    minElevationDeg: number = 10,
    numPoints: number = 48
  ): { latitude: number; longitude: number }[] {
    const Re = EARTH_RADIUS_KM;
    const h = Math.max(altKm, 100);
    const thetaMinRad = (minElevationDeg * Math.PI) / 180;

    // Angular radius beta (in radians)
    const cosArg = (Re / (Re + h)) * Math.cos(thetaMinRad);
    if (cosArg > 1.0) return [];
    const beta = Math.acos(cosArg) - thetaMinRad;
    if (beta <= 0) return [];

    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const points: { latitude: number; longitude: number }[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const bearing = (2 * Math.PI * i) / numPoints;

      // Spherical law of cosines for destination point
      const pLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(beta) +
        Math.cos(latRad) * Math.sin(beta) * Math.cos(bearing)
      );

      const pLonRad =
        lonRad +
        Math.atan2(
          Math.sin(bearing) * Math.sin(beta) * Math.cos(latRad),
          Math.cos(beta) - Math.sin(latRad) * Math.sin(pLatRad)
        );

      // Convert back to degrees and normalize longitude to [-180, 180]
      const pLat = (pLatRad * 180) / Math.PI;
      let pLon = (pLonRad * 180) / Math.PI;
      pLon = ((pLon + 180) % 360) - 180;

      points.push({ latitude: pLat, longitude: pLon });
    }

    return points;
  }

  /**
   * Calculates footprint coverage radius in kilometers on the Earth surface.
   */
  public getFootprintRadiusKm(altKm: number, minElevationDeg: number = 10): number {
    const Re = EARTH_RADIUS_KM;
    const h = Math.max(altKm, 100);
    const thetaMinRad = (minElevationDeg * Math.PI) / 180;
    const cosArg = (Re / (Re + h)) * Math.cos(thetaMinRad);
    if (cosArg > 1.0) return 0;
    const beta = Math.acos(cosArg) - thetaMinRad;
    return Math.max(0, Re * beta);
  }

  /**
   * Helper to compute epoch age in hours from TLE line 1.
   */
  public getEpochAgeHours(sat: SatelliteRecord): number {
    if (sat.epoch) {
      return (Date.now() - sat.epoch.getTime()) / (1000 * 3600);
    }

    try {
      if (sat.line1 && sat.line1.length >= 32) {
        const epochStr = sat.line1.substring(18, 32).trim();
        const yearPrefix = parseInt(epochStr.substring(0, 2), 10);
        const dayOfYear = parseFloat(epochStr.substring(2));
        const fullYear = yearPrefix < 57 ? 2000 + yearPrefix : 1900 + yearPrefix;

        // January 1 of that year
        const epochDate = new Date(Date.UTC(fullYear, 0, 1));
        epochDate.setTime(epochDate.getTime() + (dayOfYear - 1) * 86400 * 1000);
        return (Date.now() - epochDate.getTime()) / (1000 * 3600);
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Classifies orbit regime based on altitude (LEO, MEO, GEO, HEO).
   */
  public getOrbitType(altKm: number): 'LEO' | 'MEO' | 'GEO' | 'HEO' {
    if (altKm < 2000) return 'LEO';
    if (altKm >= 35000 && altKm <= 36500) return 'GEO';
    if (altKm >= 2000 && altKm < 35000) return 'MEO';
    return 'HEO';
  }
}

export const orbitalEngine = new Sgp4Engine();
