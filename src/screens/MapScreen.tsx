import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SatelliteWorldMap } from '../components/map/SatelliteWorldMap';
import { SatelliteRecord, SatellitePosition, ObserverLocation, GroundTrackPoint } from '../types/satellite';
import { orbitalEngine } from '../services/orbital/sgp4Engine';
import { formatCoordinates, formatAzimuthWithCardinal } from '../services/orbital/orbitUtils';
import { dataOrchestrator } from '../services/providers/dataOrchestrator';

interface MapScreenProps {
  satellite: SatelliteRecord;
  observer: ObserverLocation;
  minElevationDeg?: number;
  onNavigateToSkyChart?: () => void;
  onNavigateToCompass?: () => void;
  onSelectSatellite?: (sat: SatelliteRecord) => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  satellite,
  observer,
  minElevationDeg = 10,
  onNavigateToSkyChart,
  onNavigateToCompass,
  onSelectSatellite,
}) => {
  const [position, setPosition] = useState<SatellitePosition | null>(null);
  const [groundTracks, setGroundTracks] = useState<GroundTrackPoint[][]>([]);
  const [footprint, setFootprint] = useState<{ latitude: number; longitude: number }[]>([]);
  const [showConstellation, setShowConstellation] = useState(false);
  const [constellationPositions, setConstellationPositions] = useState<
    { id: number; name: string; latitude: number; longitude: number; altitude: number }[]
  >([]);

  // 1. Ground track calculation (recalculated when satellite changes or every 5 min)
  useEffect(() => {
    const segments = orbitalEngine.getGroundTrackSegments(satellite, new Date(), 45, 95, 45);
    setGroundTracks(segments);
  }, [satellite]);

  // 2. Real-time satellite propagation loop (updates position & footprint every 1-2 seconds locally via SGP4)
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const pos = orbitalEngine.getPosition(satellite, now, observer);
      if (pos) {
        setPosition(pos);
        // Compute footprint polygon
        const fp = orbitalEngine.getFootprintPolygon(pos.latitude, pos.longitude, pos.altitude, minElevationDeg);
        setFootprint(fp);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1500); // 1.5s refresh
    return () => clearInterval(interval);
  }, [satellite, observer, minElevationDeg]);

  // 3. Constellation layer calculation (throttled every 5 seconds)
  useEffect(() => {
    if (!showConstellation) return;

    let active = true;
    const updateConstellation = async () => {
      try {
        const starlinkCatalog = await dataOrchestrator.getCatalog('starlink');
        const sampleBatch = starlinkCatalog.slice(0, 40); // 40 satellites for silky smooth 60fps performance

        const now = new Date();
        const positions = sampleBatch
          .map((s) => {
            const p = orbitalEngine.getPosition(s, now);
            return p
              ? { id: s.id, name: s.name, latitude: p.latitude, longitude: p.longitude, altitude: p.altitude }
              : null;
          })
          .filter(Boolean) as { id: number; name: string; latitude: number; longitude: number; altitude: number }[];

        if (active) {
          setConstellationPositions(positions);
        }
      } catch (err) {
        console.warn('Error updating constellation layer:', err);
      }
    };

    updateConstellation();
    const interval = setInterval(updateConstellation, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showConstellation]);

  const handleConstellationSatClick = async (satId: number) => {
    const sat = await dataOrchestrator.getSatelliteById(satId);
    if (sat && onSelectSatellite) {
      onSelectSatellite(sat);
    }
  };

  const orbitType = position ? orbitalEngine.getOrbitType(position.altitude) : 'LEO';
  const speedKmh = position ? Math.round(position.velocity * 3600) : 0;
  const isAboveHorizon = position?.elevation !== undefined && position.elevation > 0;
  const footprintRadius = position ? Math.round(orbitalEngine.getFootprintRadiusKm(position.altitude, minElevationDeg)) : 0;

  return (
    <View style={styles.container}>
      {/* Top Map View */}
      <View style={styles.mapContainer}>
        <SatelliteWorldMap
          position={position}
          observer={observer}
          groundTrackSegments={groundTracks}
          footprintPoints={footprint}
          constellationPositions={constellationPositions}
          showConstellation={showConstellation}
          onSelectSatellite={handleConstellationSatClick}
        />
      </View>

      {/* Bottom Telemetry Card */}
      <ScrollView style={styles.telemetryScroll} contentContainerStyle={styles.telemetryContent}>
        {/* Header with Title and Constellation Toggle */}
        <View style={styles.telemetryHeader}>
          <View>
            <Text style={styles.satName}>{satellite.name}</Text>
            <Text style={styles.satSubtext}>
              NORAD {satellite.id} • {orbitType} • {position?.isSunlit ? '☀️ Iluminado' : '🌑 En Sombra'}
            </Text>
          </View>

          <View style={styles.constellationToggleWrap}>
            <Text style={styles.constellationLabel}>Capa Starlink</Text>
            <Switch
              value={showConstellation}
              onValueChange={setShowConstellation}
              trackColor={{ false: '#202d4a', true: '#00f0ff' }}
              thumbColor={showConstellation ? '#ffffff' : '#829ab1'}
            />
          </View>
        </View>

        {/* Telemetry Grid */}
        <View style={styles.grid}>
          {/* Subsatellite Coordinates */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Punto Subsatelital</Text>
            <Text style={styles.metricValue}>
              {position ? formatCoordinates(position.latitude, position.longitude) : 'Calculando...'}
            </Text>
          </View>

          {/* Altitude & Speed */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Altitud / Velocidad</Text>
            <Text style={styles.metricValue}>
              {position ? `${position.altitude.toFixed(1)} km • ${speedKmh.toLocaleString()} km/h` : '--'}
            </Text>
          </View>

          {/* Look Angles from Observer */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Azimut / Elevación (Observador)</Text>
            <Text style={[styles.metricValue, { color: isAboveHorizon ? '#00e676' : '#ffd600' }]}>
              {position?.azimuth !== undefined && position?.elevation !== undefined
                ? `${formatAzimuthWithCardinal(position.azimuth)} • ${position.elevation.toFixed(1)}°`
                : '--'}
            </Text>
            <Text style={styles.metricSub}>
              {isAboveHorizon ? '🟢 Satélite sobre el horizonte' : '🔴 Bajo el horizonte'}
            </Text>
          </View>

          {/* Footprint Coverage */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Área de Cobertura (Footprint)</Text>
            <Text style={styles.metricValue}>
              {footprintRadius > 0 ? `Radio: ${footprintRadius} km (mín ${minElevationDeg}°)` : '--'}
            </Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={onNavigateToSkyChart} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🔭 Ver Radar Polar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onNavigateToCompass} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🧭 Brújula Asistida</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  mapContainer: {
    height: '48%',
    width: '100%',
  },
  telemetryScroll: {
    flex: 1,
    backgroundColor: '#0d1424',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -10,
    borderTopWidth: 1,
    borderTopColor: '#202d4a',
  },
  telemetryContent: {
    padding: 16,
    paddingBottom: 32,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  satName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  satSubtext: {
    fontSize: 12,
    color: '#829ab1',
    marginTop: 2,
  },
  constellationToggleWrap: {
    alignItems: 'center',
  },
  constellationLabel: {
    fontSize: 10,
    color: '#829ab1',
    marginBottom: 2,
  },
  grid: {
    gap: 10,
  },
  metricCard: {
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  metricLabel: {
    fontSize: 11,
    color: '#627d98',
    fontWeight: '600',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f4f8',
  },
  metricSub: {
    fontSize: 11,
    color: '#829ab1',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#16223b',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#00f0ff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
