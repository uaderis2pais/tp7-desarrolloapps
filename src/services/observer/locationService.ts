import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ObserverLocation } from '../../types/satellite';
import { DEFAULT_OBSERVER, PRESET_LOCATIONS } from '../../constants/defaults';

const OBSERVER_STORAGE_KEY = '@satellite_tracker_observer_location';

export class LocationService {
  private currentObserver: ObserverLocation = DEFAULT_OBSERVER;
  private listeners: ((loc: ObserverLocation) => void)[] = [];

  constructor() {
    this.loadPersistedObserver();
  }

  private async loadPersistedObserver(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OBSERVER_STORAGE_KEY);
      if (stored) {
        this.currentObserver = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (err) {
      console.warn('[LocationService] Failed to load stored observer:', err);
    }
  }

  public getObserver(): ObserverLocation {
    return this.currentObserver;
  }

  public async setObserver(loc: ObserverLocation): Promise<void> {
    this.currentObserver = loc;
    this.notifyListeners();
    try {
      await AsyncStorage.setItem(OBSERVER_STORAGE_KEY, JSON.stringify(loc));
    } catch (err) {
      console.warn('[LocationService] Failed to persist observer:', err);
    }
  }

  /**
   * Requests device GPS location using expo-location.
   */
  public async requestGpsLocation(): Promise<ObserverLocation | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newObserver: ObserverLocation = {
        name: 'Ubicación GPS Actual',
        latitude: Math.round(position.coords.latitude * 10000) / 10000,
        longitude: Math.round(position.coords.longitude * 10000) / 10000,
        altitudeMeters: Math.round(position.coords.altitude || 20),
      };

      await this.setObserver(newObserver);
      return newObserver;
    } catch (err) {
      console.warn('[LocationService] GPS request error:', err);
      return null;
    }
  }

  public getPresets(): ObserverLocation[] {
    return PRESET_LOCATIONS;
  }

  public subscribe(listener: (loc: ObserverLocation) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentObserver);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const l of this.listeners) {
      l(this.currentObserver);
    }
  }
}

export const locationService = new LocationService();

