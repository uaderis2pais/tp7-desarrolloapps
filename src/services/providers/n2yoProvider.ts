import { IDataProvider, ProviderLimits, ValidationPositionResult } from '../../types/provider';
import { SatelliteRecord } from '../../types/satellite';
import { N2YO_BASE_URL } from '../../constants/defaults';
import { cacheManager } from './cacheManager';

export class N2yoProvider implements IDataProvider {
  public readonly name = 'N2YO';
  public readonly limits: ProviderLimits = {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requiresAuth: true,
    notes: 'Free API key provides TLE, live positions, and visual passes. 1000 requests/hr.',
  };

  private apiKey: string | null = null;

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  public async getCatalog(): Promise<SatelliteRecord[]> {
    return []; // N2YO is query-by-id rather than bulk catalog
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    if (!this.apiKey) return null;

    const cacheKey = `n2yo_tle_${noradId}`;
    const cached = await cacheManager.get<SatelliteRecord>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${N2YO_BASE_URL}/tle/${noradId}&apiKey=${this.apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        if (json.tle) {
          const lines = json.tle.split('\r\n').filter(Boolean);
          if (lines.length >= 2) {
            const record: SatelliteRecord = {
              id: noradId,
              name: json.info?.satname || `SAT-${noradId}`,
              category: 'other',
              line1: lines[0],
              line2: lines[1],
            };
            await cacheManager.set(cacheKey, record, 12);
            return record;
          }
        }
      }
    } catch (err) {
      console.warn(`[N2YO] Failed to fetch TLE for ${noradId}:`, err);
    }
    return null;
  }

  /**
   * Fetches live satellite position from N2YO for cross-validation (RF-15).
   */
  public async getValidationPosition(
    noradId: number,
    _timestamp?: number
  ): Promise<ValidationPositionResult | null> {
    if (!this.apiKey) return null;

    try {
      // 1 position point from reference lat=0, lon=0, alt=0
      const url = `${N2YO_BASE_URL}/positions/${noradId}/0/0/0/1/&apiKey=${this.apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        if (json.positions && json.positions.length > 0) {
          const p = json.positions[0];
          return {
            satId: noradId,
            satName: json.info?.satname || `SAT-${noradId}`,
            source: 'n2yo',
            timestamp: (p.timestamp || Math.floor(Date.now() / 1000)) * 1000,
            latitude: parseFloat(p.satlatitude),
            longitude: parseFloat(p.satlongitude),
            altitude: parseFloat(p.sataltitude),
            rawResponse: p,
          };
        }
      }
    } catch (err) {
      console.warn(`[N2YO] Live position validation failed for ${noradId}:`, err);
    }
    return null;
  }
}

export const n2yoProvider = new N2yoProvider();

