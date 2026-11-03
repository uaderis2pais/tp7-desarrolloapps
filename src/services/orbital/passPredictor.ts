import * as satellite from 'satellite.js';
import { SatelliteRecord, ObserverLocation, PassPrediction } from '../../types/satellite';
import { orbitalEngine } from './sgp4Engine';

export class PassPredictor {
  /**
   * Predicts upcoming satellite passes over an observer location using
   * a coarse-to-fine search algorithm (grueso -> fino) to minimize JS thread cost.
   */
  public predictPasses(
    sat: SatelliteRecord,
    observer: ObserverLocation,
    startDate: Date = new Date(),
    days: number = 3,
    minElevationDeg: number = 10,
    maxPasses: number = 20
  ): PassPrediction[] {
    const satrec = orbitalEngine.getSatRec(sat);
    if (!satrec) return [];

    const observerGd: satellite.GeodeticLocation = {
      latitude: satellite.degreesToRadians(observer.latitude),
      longitude: satellite.degreesToRadians(observer.longitude),
      height: (observer.altitudeMeters || 0) / 1000.0,
    };

    const passes: PassPrediction[] = [];
    const startTimeMs = startDate.getTime();
    const endTimeMs = startTimeMs + days * 24 * 3600 * 1000;

    // Coarse step: 60 seconds
    const coarseStepMs = 60 * 1000;
    let t = startTimeMs;
    let inPass = false;
    let passStartBoundary = 0;

    while (t < endTimeMs && passes.length < maxPasses) {
      const el = this.getElevationAt(satrec, observerGd, new Date(t));

      if (el >= minElevationDeg && !inPass) {
        // Potential pass start between (t - coarseStepMs) and t
        passStartBoundary = t - coarseStepMs;
        inPass = true;
      } else if (el < minElevationDeg && inPass) {
        // Pass ended between (t - coarseStepMs) and t
        const passEndBoundary = t;
        inPass = false;

        // Fine refinement: find exact AOS, PCA, and LOS
        const refinedPass = this.refinePass(
          sat,
          satrec,
          observer,
          observerGd,
          passStartBoundary,
          passEndBoundary,
          minElevationDeg
        );

        if (refinedPass && refinedPass.pca.elevation >= minElevationDeg) {
          passes.push(refinedPass);
        }
      }

      t += coarseStepMs;
    }

    return passes;
  }

  /**
   * Evaluates elevation angle in degrees for a given timestamp.
   */
  private getElevationAt(
    satrec: satellite.SatRec,
    observerGd: satellite.GeodeticLocation,
    date: Date
  ): number {
    try {
      const posAndVel = satellite.propagate(satrec, date);
      if (!posAndVel || !posAndVel.position || typeof posAndVel.position === 'boolean') {
        return -90;
      }

      const gmst = satellite.gstime(date);
      const posEcf = satellite.eciToEcf(posAndVel.position as satellite.EciVec3<number>, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, posEcf);
      return satellite.radiansToDegrees(lookAngles.elevation);
    } catch {
      return -90;
    }
  }

  /**
   * Refines pass details using bisection (binary search) to pinpoint exact AOS/LOS
   * to within 1-2 seconds, and samples trajectory points for sky chart plotting.
   */
  private refinePass(
    sat: SatelliteRecord,
    satrec: satellite.SatRec,
    observer: ObserverLocation,
    observerGd: satellite.GeodeticLocation,
    coarseStartMs: number,
    coarseEndMs: number,
    minElevationDeg: number
  ): PassPrediction | null {
    // 1. Refine AOS using bisection
    let low = coarseStartMs;
    let high = coarseEndMs;
    let aosTimeMs = coarseStartMs;

    for (let iter = 0; iter < 12; iter++) {
      const mid = (low + high) / 2;
      const el = this.getElevationAt(satrec, observerGd, new Date(mid));
      if (el >= minElevationDeg) {
        aosTimeMs = mid;
        high = mid; // Search earlier
      } else {
        low = mid; // Search later
      }
      if (Math.abs(high - low) < 2000) break; // Within 2 seconds
    }

    // 2. Refine LOS using bisection
    low = aosTimeMs;
    high = coarseEndMs + 60 * 1000;
    let losTimeMs = high;

    for (let iter = 0; iter < 12; iter++) {
      const mid = (low + high) / 2;
      const el = this.getElevationAt(satrec, observerGd, new Date(mid));
      if (el >= minElevationDeg) {
        low = mid; // Pass still active, search later
      } else {
        losTimeMs = mid;
        high = mid; // Below threshold, search earlier
      }
      if (Math.abs(high - low) < 2000) break;
    }

    if (losTimeMs <= aosTimeMs) return null;

    // 3. Scan pass duration in fine 5-second steps to locate PCA (max elevation) and sample trajectory
    let maxEl = -90;
    let pcaTimeMs = aosTimeMs;
    let pcaAzimuth = 0;

    const trajectory: { time: Date; azimuth: number; elevation: number }[] = [];
    const sampleStepMs = Math.max(10000, Math.floor((losTimeMs - aosTimeMs) / 16));

    for (let stepT = aosTimeMs; stepT <= losTimeMs; stepT += sampleStepMs) {
      const sampleDate = new Date(stepT);
      const look = this.getLookAnglesAt(satrec, observerGd, sampleDate);
      if (look) {
        trajectory.push({
          time: sampleDate,
          azimuth: look.azimuth,
          elevation: look.elevation,
        });

        if (look.elevation > maxEl) {
          maxEl = look.elevation;
          pcaTimeMs = stepT;
          pcaAzimuth = look.azimuth;
        }
      }
    }

    const aosLook = this.getLookAnglesAt(satrec, observerGd, new Date(aosTimeMs)) || {
      azimuth: 0,
      elevation: minElevationDeg,
    };
    const losLook = this.getLookAnglesAt(satrec, observerGd, new Date(losTimeMs)) || {
      azimuth: 0,
      elevation: minElevationDeg,
    };

    // Check naked-eye optical visibility:
    // Satellite illuminated AND observer in twilight/night (sun elevation < -6°)
    const pcaDate = new Date(pcaTimeMs);
    const isSatSunlit = this.isSatSunlitAt(satrec, pcaDate);
    const isObserverInDarkness = this.isObserverInDarkness(observer, pcaDate);
    const isVisible = isSatSunlit && isObserverInDarkness;

    return {
      id: `${sat.id}-${Math.floor(aosTimeMs / 1000)}`,
      satId: sat.id,
      satName: sat.name,
      aos: {
        time: new Date(aosTimeMs),
        azimuth: Math.round(aosLook.azimuth * 10) / 10,
        elevation: Math.round(aosLook.elevation * 10) / 10,
      },
      pca: {
        time: pcaDate,
        azimuth: Math.round(pcaAzimuth * 10) / 10,
        elevation: Math.round(maxEl * 10) / 10,
      },
      los: {
        time: new Date(losTimeMs),
        azimuth: Math.round(losLook.azimuth * 10) / 10,
        elevation: Math.round(losLook.elevation * 10) / 10,
      },
      durationSeconds: Math.round((losTimeMs - aosTimeMs) / 1000),
      isVisible,
      trajectory,
    };
  }

  private getLookAnglesAt(
    satrec: satellite.SatRec,
    observerGd: satellite.GeodeticLocation,
    date: Date
  ): { azimuth: number; elevation: number } | null {
    try {
      const posAndVel = satellite.propagate(satrec, date);
      if (!posAndVel || !posAndVel.position || typeof posAndVel.position === 'boolean') {
        return null;
      }
      const gmst = satellite.gstime(date);
      const posEcf = satellite.eciToEcf(posAndVel.position as satellite.EciVec3<number>, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, posEcf);
      return {
        azimuth: (satellite.radiansToDegrees(lookAngles.azimuth) + 360) % 360,
        elevation: satellite.radiansToDegrees(lookAngles.elevation),
      };
    } catch {
      return null;
    }
  }

  private isSatSunlitAt(satrec: satellite.SatRec, date: Date): boolean {
    try {
      const posAndVel = satellite.propagate(satrec, date);
      if (!posAndVel || !posAndVel.position || typeof posAndVel.position === 'boolean') {
        return false;
      }
      return orbitalEngine.isSatelliteSunlit(posAndVel.position as satellite.EciVec3<number>, date);
    } catch {
      return false;
    }
  }

  /**
   * Approximate solar elevation at observer location to detect civil twilight or night (< -6°).
   */
  private isObserverInDarkness(observer: ObserverLocation, date: Date): boolean {
    try {
      const dayOfYear = this.getDayOfYear(date);
      const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60.0;
      // Solar declination (degrees)
      const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
      // Local solar time approximation
      const solarTime = hourUtc + observer.longitude / 15.0;
      const hourAngle = (solarTime - 12) * 15;

      const latRad = (observer.latitude * Math.PI) / 180;
      const decRad = (declination * Math.PI) / 180;
      const haRad = (hourAngle * Math.PI) / 180;

      const sinElevation =
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

      const solarElevationDeg = (Math.asin(sinElevation) * 180) / Math.PI;
      return solarElevationDeg < -6; // Sun is below -6° (twilight/night)
    } catch {
      return false;
    }
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

export const passPredictor = new PassPredictor();
