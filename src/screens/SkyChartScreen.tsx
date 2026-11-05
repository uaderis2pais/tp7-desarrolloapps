import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PolarSkyChart } from '../components/skyChart/PolarSkyChart';
import { SatelliteRecord, ObserverLocation, PassPrediction, SatellitePosition } from '../types/satellite';
import { passPredictor } from '../services/orbital/passPredictor';
import { orbitalEngine } from '../services/orbital/sgp4Engine';
import { formatAzimuthWithCardinal } from '../services/orbital/orbitUtils';
import { notificationService } from '../services/notifications/notificationService';

interface SkyChartScreenProps {
  satellite: SatelliteRecord;
  observer: ObserverLocation;
  minElevationDeg?: number;
}

export const SkyChartScreen: React.FC<SkyChartScreenProps> = ({
  satellite,
  observer,
  minElevationDeg = 10,
}) => {
  const [passes, setPasses] = useState<PassPrediction[]>([]);
  const [selectedPass, setSelectedPass] = useState<PassPrediction | null>(null);
  const [currentPosition, setCurrentPosition] = useState<SatellitePosition | null>(null);
  const [isNotified, setIsNotified] = useState(false);

  // Compute passes
  useEffect(() => {
    const predictions = passPredictor.predictPasses(satellite, observer, new Date(), 3, minElevationDeg, 8);
    setPasses(predictions);
    if (predictions.length > 0) {
      setSelectedPass(predictions[0]);
      setIsNotified(notificationService.isPassScheduled(predictions[0].id));
    }
  }, [satellite, observer, minElevationDeg]);

  // Real-time satellite look angle loop
  useEffect(() => {
    const updatePosition = () => {
      const pos = orbitalEngine.getPosition(satellite, new Date(), observer);
      setCurrentPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1500);
    return () => clearInterval(interval);
  }, [satellite, observer]);

  const handleSelectPass = (pass: PassPrediction) => {
    setSelectedPass(pass);
    setIsNotified(notificationService.isPassScheduled(pass.id));
  };

  const handleToggleAlarm = async () => {
    if (!selectedPass) return;
    if (isNotified) {
      await notificationService.cancelPassNotification(selectedPass.id);
      setIsNotified(false);
    } else {
      const ok = await notificationService.schedulePassNotification(selectedPass, 5);
      if (ok) setIsNotified(true);
    }
  };

  const isLiveAboveHorizon = currentPosition && currentPosition.elevation !== undefined && currentPosition.elevation >= 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Carta Celeste Polar (Sky Chart)</Text>
        <Text style={styles.subtitle}>
          {satellite.name} • Observador: {observer.name}
        </Text>
      </View>

      {/* Polar Sky Chart Graphic */}
      <View style={styles.chartWrapper}>
        <PolarSkyChart pass={selectedPass} currentPosition={currentPosition} />
      </View>

      {/* Live Horizon Indicator */}
      <View style={[styles.liveStatusBadge, isLiveAboveHorizon ? styles.liveActive : styles.liveInactive]}>
        <Text style={[styles.liveStatusText, isLiveAboveHorizon ? styles.liveActiveText : styles.liveInactiveText]}>
          {isLiveAboveHorizon
            ? `🟢 Satélite AHORA sobre el horizonte: Az ${currentPosition?.azimuth?.toFixed(0)}°, El ${currentPosition?.elevation?.toFixed(1)}°`
            : `🔴 Satélite bajo el horizonte local (El: ${currentPosition?.elevation?.toFixed(1) || '--'}°)`}
        </Text>
      </View>

      {/* Selected Pass Details */}
      {selectedPass && (
        <View style={styles.passDetailsCard}>
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passDate}>
                {selectedPass.aos.time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.passDuration}>
                Duración: {Math.floor(selectedPass.durationSeconds / 60)}m {selectedPass.durationSeconds % 60}s
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.alarmBtn, isNotified && styles.alarmBtnActive]}
              onPress={handleToggleAlarm}
            >
              <Text style={styles.alarmBtnText}>{isNotified ? '🔔 Alarma activa' : '🔕 Notificarme'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passStatsRow}>
            <View style={styles.passStatCol}>
              <Text style={styles.statLabel}>AOS (Entrada)</Text>
              <Text style={styles.statTime}>
                {selectedPass.aos.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.statSub}>{formatAzimuthWithCardinal(selectedPass.aos.azimuth)}</Text>
            </View>

            <View style={styles.passStatCol}>
              <Text style={styles.statLabel}>Cénit / Máx El</Text>
              <Text style={styles.statPeak}>{selectedPass.pca.elevation.toFixed(0)}°</Text>
              <Text style={styles.statSub}>
                {selectedPass.pca.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.passStatCol}>
              <Text style={styles.statLabel}>LOS (Salida)</Text>
              <Text style={styles.statTime}>
                {selectedPass.los.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.statSub}>{formatAzimuthWithCardinal(selectedPass.los.azimuth)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Upcoming Passes Selector Carousel */}
      <Text style={styles.selectorHeading}>Próximos Pases Disponibles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelector}>
        {passes.map((p) => {
          const isSelected = selectedPass?.id === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.passPill, isSelected && styles.passPillSelected]}
              onPress={() => handleSelectPass(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillTime, isSelected && styles.pillTextSelected]}>
                {p.aos.time.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}{' '}
                {p.aos.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={[styles.pillMaxEl, isSelected && styles.pillTextSelected]}>
                Máx: {p.pca.elevation.toFixed(0)}° {p.isVisible ? '👁️' : '📡'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  subtitle: {
    fontSize: 12,
    color: '#829ab1',
    marginTop: 2,
  },
  chartWrapper: {
    marginVertical: 8,
  },
  liveStatusBadge: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 12,
    alignItems: 'center',
  },
  liveActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00e676',
  },
  liveInactive: {
    backgroundColor: 'rgba(98, 125, 152, 0.12)',
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  liveActiveText: {
    color: '#00e676',
  },
  liveInactiveText: {
    color: '#829ab1',
  },
  passDetailsCard: {
    width: '100%',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
    marginBottom: 16,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f4f8',
    textTransform: 'capitalize',
  },
  passDuration: {
    fontSize: 11,
    color: '#829ab1',
    marginTop: 2,
  },
  alarmBtn: {
    backgroundColor: '#1c2b4a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334e68',
  },
  alarmBtnActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
    borderColor: '#ffd600',
  },
  alarmBtnText: {
    fontSize: 12,
    color: '#f0f4f8',
    fontWeight: '600',
  },
  passStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0c1220',
    borderRadius: 10,
    padding: 10,
  },
  passStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#627d98',
    fontWeight: '600',
    marginBottom: 2,
  },
  statTime: {
    fontSize: 12,
    color: '#d9e2ec',
    fontWeight: 'bold',
  },
  statPeak: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd600',
  },
  statSub: {
    fontSize: 11,
    color: '#829ab1',
  },
  selectorHeading: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#829ab1',
    marginBottom: 8,
  },
  horizontalSelector: {
    width: '100%',
    flexDirection: 'row',
  },
  passPill: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#202d4a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  passPillSelected: {
    borderColor: '#00f0ff',
    backgroundColor: '#1c2b4a',
  },
  pillTime: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#d9e2ec',
  },
  pillMaxEl: {
    fontSize: 11,
    color: '#829ab1',
    marginTop: 2,
  },
  pillTextSelected: {
    color: '#00f0ff',
  },
});

