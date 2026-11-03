import { SatelliteRecord } from './satellite';

export interface ProviderLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requiresAuth: boolean;
  notes: string;
}

export interface ValidationPositionResult {
  satId: number;
  satName: string;
  source: 'wheretheiss' | 'n2yo' | 'sgp4';
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity?: number;
  rawResponse?: any;
}

export interface ValidationComparison {
  id: string;
  satId: number;
  satName: string;
  timestamp: number;
  referenceSource: string;
  calculated: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  reference: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  deltaLatitude: number;
  deltaLongitude: number;
  deltaAltitudeKm: number;
  surfaceErrorKm: number; // Great circle / Haversine error
  total3dErrorKm: number; // 3D Euclidean error in ECEF
  epochAgeHours: number;
}

export interface IDataProvider {
  readonly name: string;
  readonly limits: ProviderLimits;
  isAvailable(): boolean;
  getCatalog(group?: string): Promise<SatelliteRecord[]>;
  getOrbitalData(noradId: number): Promise<SatelliteRecord | null>;
  getValidationPosition?(noradId: number, timestamp?: number): Promise<ValidationPositionResult | null>;
}
