import AsyncStorage from '@react-native-async-storage/async-storage';
import { SatelliteRecord } from '../../types/satellite';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export class CacheManager {
  private static PREFIX = '@satellite_tracker_cache_';
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Saves an item to local storage and in-memory cache with TTL.
   */
  public async set<T>(key: string, data: T, ttlHours: number = 18): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs: ttlHours * 3600 * 1000,
    };

    this.memoryCache.set(key, entry);

    try {
      await AsyncStorage.setItem(
        CacheManager.PREFIX + key,
        JSON.stringify(entry)
      );
    } catch (err) {
      console.warn(`[Cache] Failed to persist key ${key}:`, err);
    }
  }

  /**
   * Retrieves an item from cache if it exists and has not expired.
   */
  public async get<T>(key: string): Promise<T | null> {
    // Check in-memory first
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (Date.now() - mem.timestamp < mem.ttlMs) {
        return mem.data as T;
      }
      this.memoryCache.delete(key);
    }

    try {
      const serialized = await AsyncStorage.getItem(CacheManager.PREFIX + key);
      if (!serialized) return null;

      const entry: CacheEntry<T> = JSON.parse(serialized);
      const isExpired = Date.now() - entry.timestamp >= entry.ttlMs;

      if (!isExpired) {
        this.memoryCache.set(key, entry);
        return entry.data;
      }
      return null;
    } catch (err) {
      console.warn(`[Cache] Failed to read key ${key}:`, err);
      return null;
    }
  }

  /**
   * Retrieves cached item even if expired (for offline fallback).
   */
  public async getStaleFallback<T>(key: string): Promise<{ data: T; ageHours: number } | null> {
    try {
      const serialized = await AsyncStorage.getItem(CacheManager.PREFIX + key);
      if (!serialized) return null;

      const entry: CacheEntry<T> = JSON.parse(serialized);
      const ageHours = (Date.now() - entry.timestamp) / (3600 * 1000);
      return { data: entry.data, ageHours };
    } catch {
      return null;
    }
  }

  /**
   * Clears all satellite cache entries.
   */
  public async clearAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CacheManager.PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (err) {
      console.warn('[Cache] Error clearing cache:', err);
    }
  }
}

export const cacheManager = new CacheManager();

