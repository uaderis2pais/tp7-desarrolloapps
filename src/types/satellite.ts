export interface SatelliteRecord {
  id: number; // NORAD Cat ID (e.g. 25544)
  name: string;
  line1: string;
  line2: string;
  intlDes?: string;
  epoch?: Date;
  epochAgeHours?: number;
  category: 'starlink' | 'stations' | 'gps' | 'weather' | 'science' | 'debris' | 'other';
  rawData?: any; // For OMM/JSON formats
}

export interface SatellitePosition {
  satId: number;
  name: string;
  timestamp: Date;
  latitude: number; // degrees (-90 to +90)
  longitude: number; // degrees (-180 to +180)
  altitude: number; // km
  velocity: number; // km/s
  azimuth?: number; // degrees (0 to 360) from observer
  elevation?: number; // degrees (-90 to +90) from observer
  range?: number; // km from observer
  rangeRate?: number; // km/s Doppler
  isSunlit?: boolean;
}

export interface ObserverLocation {
  name: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}

export interface GroundTrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude: number;
}

export interface PassPrediction {
  id: string;
  satId: number;
  satName: string;
  aos: {
    time: Date;
    azimuth: number;
    elevation: number;
  };
  pca: {
    time: Date;
    azimuth: number;
    elevation: number; // max elevation
  };
  los: {
    time: Date;
    azimuth: number;
    elevation: number;
  };
  durationSeconds: number;
  isVisible: boolean; // sunlit and sky dark (visible to naked eye)
  trajectory: {
    time: Date;
    azimuth: number;
    elevation: number;
  }[];
}

export interface ConstellationFilter {
  id: string;
  label: string;
  group: 'starlink' | 'stations' | 'gps' | 'weather' | 'science' | 'all';
}

