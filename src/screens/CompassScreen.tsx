import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AssistedCompass } from '../components/compass/AssistedCompass';
import { SatelliteRecord, ObserverLocation, SatellitePosition } from '../types/satellite';
import { orbitalEngine } from '../services/orbital/sgp4Engine';
import { formatCoordinates } from '../services/orbital/orbitUtils';

interface CompassScreenProps {
  satellite: SatelliteRecord;
  observer: ObserverLocation;
}

export const CompassScreen: React.FC<CompassScreenProps> = ({ satellite, observer }) => {
  const [position, setPosition] = useState<SatellitePosition | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const pos = orbitalEngine.getPosition(satellite, new Date(), observer);
      setPosition(pos);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1000); // 1s refresh
    return () => clearInterval(interval);
  }, [satellite, observer]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Modo Brújula Asistida</Text>
        <Text style={styles.subtitle}>
          Apunta tu dispositivo hacia el satélite {satellite.name}
        </Text>
      </View>

      <AssistedCompass
        targetAzimuth={position?.azimuth || 0}
        targetElevation={position?.elevation || 0}
        satName={satellite.name}
      />

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos Topocéntricos del Enlace</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Satélite Seleccionado:</Text>
          <Text style={styles.value}>{satellite.name} (NORAD {satellite.id})</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Distancia Slant Range:</Text>
          <Text style={styles.value}>
            {position?.range ? `${Math.round(position.range).toLocaleString()} km` : '--'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Velocidad Doppler (Range Rate):</Text>
          <Text style={styles.value}>
            {position?.rangeRate !== undefined ? `${position.rangeRate.toFixed(2)} km/s` : '--'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Observador:</Text>
          <Text style={styles.value}>{observer.name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Coordenadas Observador:</Text>
          <Text style={styles.value}>{formatCoordinates(observer.latitude, observer.longitude)}</Text>
        </View>
      </View>
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
  },
  header: {
    marginBottom: 12,
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
  card: {
    marginTop: 16,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f4f8',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    color: '#829ab1',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d9e2ec',
  },
});
