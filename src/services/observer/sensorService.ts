import { Magnetometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface CompassHeading {
  headingDegrees: number; // 0 to 360 (0 = North, 90 = East, 180 = South, 270 = West)
  accuracy?: number;
}

export class SensorService {
  private subscription: any = null;
  private listeners: ((heading: CompassHeading) => void)[] = [];
  private currentHeading: CompassHeading = { headingDegrees: 0 };
  private isAvailable: boolean = false;

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability() {
    try {
      if (Platform.OS !== 'web') {
        this.isAvailable = await Magnetometer.isAvailableAsync();
      }
    } catch {
      this.isAvailable = false;
    }
  }

  public startListening(updateIntervalMs: number = 100): void {
    if (this.subscription) return;

    try {
      Magnetometer.setUpdateInterval(updateIntervalMs);
      this.subscription = Magnetometer.addListener((data) => {
        let { x, y } = data;
        // Calculate azimuth angle relative to magnetic north
        let angle = Math.atan2(-x, y) * (180 / Math.PI);
        if (angle < 0) {
          angle += 360;
        }

        this.currentHeading = {
          headingDegrees: Math.round(angle * 10) / 10,
        };
        this.notifyListeners();
      });
    } catch (err) {
      console.warn('[SensorService] Magnetometer error, using virtual heading:', err);
    }
  }

  public stopListening(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  public getCurrentHeading(): CompassHeading {
    return this.currentHeading;
  }

  public subscribe(listener: (heading: CompassHeading) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentHeading);

    if (this.listeners.length === 1) {
      this.startListening();
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      if (this.listeners.length === 0) {
        this.stopListening();
      }
    };
  }

  private notifyListeners(): void {
    for (const l of this.listeners) {
      l(this.currentHeading);
    }
  }
}

export const sensorService = new SensorService();

