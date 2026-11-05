import AsyncStorage from '@react-native-async-storage/async-storage';
import { SatelliteRecord } from '../../types/satellite';
import { ValidationComparison, ValidationPositionResult } from '../../types/provider';
import { orbitalEngine } from '../orbital/sgp4Engine';
import { geodesic3dDistanceKm } from '../orbital/orbitUtils';
import { whereTheIssProvider } from '../providers/whereTheIssProvider';
import { n2yoProvider } from '../providers/n2yoProvider';
import { dataOrchestrator } from '../providers/dataOrchestrator';

const VALIDATION_HISTORY_KEY = '@satellite_tracker_validation_history';

export class ValidationService {
  private history: ValidationComparison[] = [];

  constructor() {
    this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(VALIDATION_HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (err) {
      console.warn('[ValidationService] Load history error:', err);
    }
  }

  public getHistory(): ValidationComparison[] {
    return this.history;
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    try {
      await AsyncStorage.removeItem(VALIDATION_HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Performs real-time validation against Where The ISS At? API (NORAD 25544)
   * or N2YO API.
   */
  public async validateSatellite(
    satellite: SatelliteRecord,
    targetSource: 'wheretheiss' | 'n2yo' = 'wheretheiss'
  ): Promise<ValidationComparison | null> {
    let referencePos: ValidationPositionResult | null = null;

    if (targetSource === 'wheretheiss') {
      referencePos = await whereTheIssProvider.getValidationPosition(25544);
    } else {
      referencePos = await n2yoProvider.getValidationPosition(satellite.id);
    }

    if (!referencePos) {
      return null;
    }

    const refDate = new Date(referencePos.timestamp);

    // Propagate local SGP4 model at the exact reference timestamp
    const localPos = orbitalEngine.getPosition(satellite, refDate);
    if (!localPos) {
      return null;
    }

    // Calculate geodetic 3D distance and Haversine surface error
    const distanceMetrics = geodesic3dDistanceKm(
      localPos.latitude,
      localPos.longitude,
      localPos.altitude,
      referencePos.latitude,
      referencePos.longitude,
      referencePos.altitude
    );

    const epochAgeHours = orbitalEngine.getEpochAgeHours(satellite);

    const comparison: ValidationComparison = {
      id: `${satellite.id}-${Date.now()}`,
      satId: satellite.id,
      satName: satellite.name,
      timestamp: referencePos.timestamp,
      referenceSource: referencePos.source === 'wheretheiss' ? 'Where the ISS at? (REST API)' : 'N2YO (REST API)',
      calculated: {
        latitude: Math.round(localPos.latitude * 10000) / 10000,
        longitude: Math.round(localPos.longitude * 10000) / 10000,
        altitude: Math.round(localPos.altitude * 100) / 100,
      },
      reference: {
        latitude: Math.round(referencePos.latitude * 10000) / 10000,
        longitude: Math.round(referencePos.longitude * 10000) / 10000,
        altitude: Math.round(referencePos.altitude * 100) / 100,
      },
      deltaLatitude: Math.round(Math.abs(localPos.latitude - referencePos.latitude) * 10000) / 10000,
      deltaLongitude: Math.round(Math.abs(localPos.longitude - referencePos.longitude) * 10000) / 10000,
      deltaAltitudeKm: distanceMetrics.deltaAltKm,
      surfaceErrorKm: distanceMetrics.surfaceDistanceKm,
      total3dErrorKm: distanceMetrics.total3dDistanceKm,
      epochAgeHours: Math.round(epochAgeHours * 10) / 10,
    };

    // Prepend to history and limit to 50 records
    this.history.unshift(comparison);
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    try {
      await AsyncStorage.setItem(VALIDATION_HISTORY_KEY, JSON.stringify(this.history));
    } catch (err) {
      console.warn('[ValidationService] Persist error:', err);
    }

    return comparison;
  }
}

export const validationService = new ValidationService();

