import { IDataProvider, ProviderLimits } from '../../types/provider';
import { SatelliteRecord } from '../../types/satellite';
import { CELESTRAK_URLS } from '../../constants/defaults';
import { cacheManager } from './cacheManager';

export class CelesTrakProvider implements IDataProvider {
  public readonly name = 'CelesTrak';
  public readonly limits: ProviderLimits = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requiresAuth: false,
    notes: 'Primary GP & supplemental Starlink data. Cached locally for 12-24h.',
  };

  public isAvailable(): boolean {
    return true; // Always publicly accessible
  }

  public async getCatalog(group: string = 'stations'): Promise<SatelliteRecord[]> {
    const cacheKey = `celestrak_${group}`;
    const cached = await cacheManager.get<SatelliteRecord[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let url = CELESTRAK_URLS.STATIONS;
    let category: SatelliteRecord['category'] = 'stations';

    if (group === 'starlink') {
      url = CELESTRAK_URLS.STARLINK;
      category = 'starlink';
    } else if (group === 'gps') {
      url = CELESTRAK_URLS.GPS;
      category = 'gps';
    } else if (group === 'weather') {
      url = CELESTRAK_URLS.WEATHER;
      category = 'weather';
    } else if (group === 'science') {
      url = CELESTRAK_URLS.SCIENCE;
      category = 'science';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SatelliteTracker-MobileApp/1.0',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawJson = await response.json();
      const records = this.parseJsonGp(rawJson, category);

      if (records.length > 0) {
        // Cache for 18 hours (meets the 12-24h TTL requirement RF-09)
        await cacheManager.set(cacheKey, records, 18);
        return records;
      }
    } catch (err) {
      console.warn(`[CelesTrak] Fetch failed for group ${group}:`, err);
      // Try stale cache fallback
      const stale = await cacheManager.getStaleFallback<SatelliteRecord[]>(cacheKey);
      if (stale) {
        return stale.data;
      }
    }

    return [];
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    const cacheKey = `celestrak_sat_${noradId}`;
    const cached = await cacheManager.get<SatelliteRecord>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        const records = this.parseJsonGp(rawJson, 'other');
        if (records.length > 0) {
          const rec = records[0];
          await cacheManager.set(cacheKey, rec, 18);
          return rec;
        }
      }
    } catch (err) {
      console.warn(`[CelesTrak] Sat ${noradId} fetch error:`, err);
    }
    return null;
  }

  /**
   * Parses standard CelesTrak JSON format (OMM / GP).
   */
  private parseJsonGp(data: any, defaultCategory: SatelliteRecord['category']): SatelliteRecord[] {
    if (!Array.isArray(data)) return [];

    const results: SatelliteRecord[] = [];

    for (const item of data) {
      try {
        const noradId = parseInt(item.NORAD_CAT_ID || item.OBJECT_ID || '0', 10);
        if (!noradId) continue;

        const name = (item.OBJECT_NAME || `SAT-${noradId}`).trim();
        const line1 = item.TLE_LINE1;
        const line2 = item.TLE_LINE2;

        const epoch = item.EPOCH ? new Date(item.EPOCH) : undefined;
        let epochAgeHours: number | undefined;
        if (epoch) {
          epochAgeHours = (Date.now() - epoch.getTime()) / (3600 * 1000);
        }

        results.push({
          id: noradId,
          name,
          line1: line1 || '',
          line2: line2 || '',
          intlDes: item.OBJECT_ID,
          epoch,
          epochAgeHours,
          category: defaultCategory,
          rawData: item, // For OMM/JSON support
        });
      } catch {
        // Skip malformed record
      }
    }

    return results;
  }
}

export const celestrakProvider = new CelesTrakProvider();

