import { IDataProvider, ProviderLimits, ValidationPositionResult } from '../../types/provider';
import { SatelliteRecord } from '../../types/satellite';
import { WHERE_THE_ISS_URL } from '../../constants/defaults';
import { cacheManager } from './cacheManager';

export class WhereTheIssProvider implements IDataProvider {
  public readonly name = 'Where the ISS at?';
  public readonly limits: ProviderLimits = {
    requestsPerMinute: 60,
    requestsPerHour: 3600,
    requiresAuth: false,
    notes: 'No auth required (~1 req/s). Dedicated to ISS (NORAD 25544) position and TLE validation.',
  };

  public isAvailable(): boolean {
    return true;
  }

  public async getCatalog(): Promise<SatelliteRecord[]> {
    const issRecord = await this.getOrbitalData(25544);
    return issRecord ? [issRecord] : [];
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    if (noradId !== 25544) return null;

    const cacheKey = 'wheretheiss_tle_25544';
    const cached = await cacheManager.get<SatelliteRecord>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${WHERE_THE_ISS_URL}/tles`);
      if (response.ok) {
        const data = await response.json();
        const record: SatelliteRecord = {
          id: 25544,
          name: 'ISS (ZARYA)',
          category: 'stations',
          line1: data.line1,
          line2: data.line2,
          intlDes: '1998-067A',
          epoch: new Date(data.tle_timestamp * 1000),
          epochAgeHours: (Date.now() - data.tle_timestamp * 1000) / (3600 * 1000),
        };
        await cacheManager.set(cacheKey, record, 12);
        return record;
      }
    } catch (err) {
      console.warn('[WhereTheISS] Failed to fetch TLE:', err);
    }
    return null;
  }

  /**
   * Fetches real-time live position from Where The ISS At? API for cross-validation.
   */
  public async getValidationPosition(
    noradId: number = 25544,
    timestamp?: number
  ): Promise<ValidationPositionResult | null> {
    if (noradId !== 25544) return null;

    try {
      let url = `${WHERE_THE_ISS_URL}?units=kilometers`;
      if (timestamp) {
        url += `&timestamps=${Math.floor(timestamp / 1000)}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const target = Array.isArray(data) ? data[0] : data;

        return {
          satId: 25544,
          satName: 'ISS (ZARYA)',
          source: 'wheretheiss',
          timestamp: (target.timestamp || Math.floor(Date.now() / 1000)) * 1000,
          latitude: parseFloat(target.latitude),
          longitude: parseFloat(target.longitude),
          altitude: parseFloat(target.altitude),
          velocity: parseFloat(target.velocity) / 3600.0, // convert km/h to km/s
          rawResponse: target,
        };
      }
    } catch (err) {
      console.warn('[WhereTheISS] Live position fetch failed:', err);
    }
    return null;
  }
}

export const whereTheIssProvider = new WhereTheIssProvider();
