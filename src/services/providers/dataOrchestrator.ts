import { SatelliteRecord } from '../../types/satellite';
import { IDataProvider } from '../../types/provider';
import { SEED_SATELLITES } from '../../constants/defaults';
import { celestrakProvider } from './celestrakProvider';
import { whereTheIssProvider } from './whereTheIssProvider';
import { spaceTrackProvider } from './spaceTrackProvider';
import { n2yoProvider } from './n2yoProvider';
import { cacheManager } from './cacheManager';

export class DataOrchestrator {
  private providers: IDataProvider[] = [
    celestrakProvider,
    whereTheIssProvider,
    spaceTrackProvider,
    n2yoProvider,
  ];

  private inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Loads catalog for a specific group with caching, fallback, and seed default merge.
   */
  public async getCatalog(group: 'all' | 'stations' | 'starlink' | 'gps' | 'weather' | 'science' = 'all'): Promise<SatelliteRecord[]> {
    const cacheKey = `catalog_${group}`;
    const cached = await cacheManager.get<SatelliteRecord[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let records: SatelliteRecord[] = [];

    // Primary: CelesTrak
    try {
      if (group === 'all') {
        const [stations, starlink, gps, weather] = await Promise.allSettled([
          celestrakProvider.getCatalog('stations'),
          celestrakProvider.getCatalog('starlink'),
          celestrakProvider.getCatalog('gps'),
          celestrakProvider.getCatalog('weather'),
        ]);

        const merged: SatelliteRecord[] = [];
        if (stations.status === 'fulfilled') merged.push(...stations.value);
        if (starlink.status === 'fulfilled') merged.push(...starlink.value);
        if (gps.status === 'fulfilled') merged.push(...gps.value);
        if (weather.status === 'fulfilled') merged.push(...weather.value);

        records = merged;
      } else {
        records = await celestrakProvider.getCatalog(group);
      }
    } catch (err) {
      console.warn('[Orchestrator] Primary provider error, applying fallbacks:', err);
    }

    // Merge with seeds if empty or to ensure high-priority anchors (like ISS, Starlink sample) are present
    const mapById = new Map<number, SatelliteRecord>();

    // Add seeds first
    for (const seed of SEED_SATELLITES) {
      if (group === 'all' || seed.category === group) {
        mapById.set(seed.id, seed);
      }
    }

    // Overwrite with live fetched records
    for (const rec of records) {
      mapById.set(rec.id, rec);
    }

    const finalList = Array.from(mapById.values());
    if (finalList.length > 0) {
      await cacheManager.set(cacheKey, finalList, 18);
    }

    return finalList;
  }

  /**
   * Retrieves an individual satellite by NORAD ID with multi-source fallback.
   */
  public async getSatelliteById(noradId: number): Promise<SatelliteRecord | null> {
    // 1. Check local seed
    const seed = SEED_SATELLITES.find((s) => s.id === noradId);
    if (seed) return seed;

    // 2. Check cache
    const cached = await cacheManager.get<SatelliteRecord>(`sat_${noradId}`);
    if (cached) return cached;

    // 3. Query ISS provider if NORAD is 25544
    if (noradId === 25544) {
      const iss = await whereTheIssProvider.getOrbitalData(25544);
      if (iss) return iss;
    }

    // 4. Query CelesTrak
    const cSat = await celestrakProvider.getOrbitalData(noradId);
    if (cSat) {
      await cacheManager.set(`sat_${noradId}`, cSat, 18);
      return cSat;
    }

    // 5. Query N2YO if configured
    if (n2yoProvider.isAvailable()) {
      const nSat = await n2yoProvider.getOrbitalData(noradId);
      if (nSat) return nSat;
    }

    // 6. Check stale cache fallback
    const stale = await cacheManager.getStaleFallback<SatelliteRecord>(`sat_${noradId}`);
    if (stale) return stale.data;

    return null;
  }

  /**
   * Searches satellites by name or NORAD catalog ID.
   */
  public async searchSatellites(query: string, group: string = 'all'): Promise<SatelliteRecord[]> {
    const trimmed = query.trim().toLowerCase();
    const catalog = await this.getCatalog(group as any);

    if (!trimmed) {
      return catalog.slice(0, 50);
    }

    const isNumeric = /^\d+$/.test(trimmed);
    const searchId = isNumeric ? parseInt(trimmed, 10) : null;

    return catalog.filter((sat) => {
      if (searchId !== null && sat.id === searchId) return true;
      if (sat.name.toLowerCase().includes(trimmed)) return true;
      if (sat.intlDes && sat.intlDes.toLowerCase().includes(trimmed)) return true;
      return false;
    });
  }

  /**
   * Returns list of registered data providers and their operational status.
   */
  public getProvidersStatus(): { name: string; available: boolean; limits: any }[] {
    return this.providers.map((p) => ({
      name: p.name,
      available: p.isAvailable(),
      limits: p.limits,
    }));
  }
}

export const dataOrchestrator = new DataOrchestrator();
