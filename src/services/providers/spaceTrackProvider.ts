import { IDataProvider, ProviderLimits } from '../../types/provider';
import { SatelliteRecord } from '../../types/satellite';
import { cacheManager } from './cacheManager';

export class SpaceTrackProvider implements IDataProvider {
  public readonly name = 'Space-Track.org';
  public readonly limits: ProviderLimits = {
    requestsPerMinute: 30,
    requestsPerHour: 300,
    requiresAuth: true,
    notes: 'Official US Space Command catalog. Requires account credentials.',
  };

  private username: string | null = null;
  private cookie: string | null = null;

  public setCredentials(user: string): void {
    this.username = user;
  }

  public isAvailable(): boolean {
    return Boolean(this.username || this.cookie);
  }

  public async getCatalog(group?: string): Promise<SatelliteRecord[]> {
    const cacheKey = `spacetrack_${group || 'all'}`;
    const cached = await cacheManager.get<SatelliteRecord[]>(cacheKey);
    if (cached) return cached;

    // In mobile client without user-supplied credentials, fallback
    return [];
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    const cacheKey = `spacetrack_sat_${noradId}`;
    const cached = await cacheManager.get<SatelliteRecord>(cacheKey);
    if (cached) return cached;
    return null;
  }
}

export const spaceTrackProvider = new SpaceTrackProvider();

