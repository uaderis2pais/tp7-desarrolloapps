import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SatelliteRecord } from '../types/satellite';
import { ValidationComparison } from '../types/provider';
import { validationService } from '../services/validation/validationService';

interface ValidationScreenProps {
  currentSatellite: SatelliteRecord;
}

export const ValidationScreen: React.FC<ValidationScreenProps> = ({ currentSatellite }) => {
  const [loading, setLoading] = useState(false);
  const [latestResult, setLatestResult] = useState<ValidationComparison | null>(null);
  const [history, setHistory] = useState<ValidationComparison[]>(validationService.getHistory());

  const handleValidateWhereTheIss = async () => {
    setLoading(true);
    try {
      const result = await validationService.validateSatellite(currentSatellite, 'wheretheiss');
      if (result) {
        setLatestResult(result);
        setHistory(validationService.getHistory());
      } else {
        Alert.alert(
          'Validación fallida',
          'No se pudo conectar con Where the ISS at? o el satélite actual no es la ISS (NORAD 25544).'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error durante la validación');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateN2yo = async () => {
    setLoading(true);
    try {
      const result = await validationService.validateSatellite(currentSatellite, 'n2yo');
      if (result) {
        setLatestResult(result);
        setHistory(validationService.getHistory());
      } else {
        Alert.alert(
          'Validación N2YO',
          'Para usar la API de N2YO debes configurar tu API key gratuita en la pestaña Ajustes.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error durante la validación');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    await validationService.clearHistory();
    setHistory([]);
    setLatestResult(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Validación Cruzada de Exactitud Orbital</Text>
        <Text style={styles.subtitle}>
          Compara en tiempo real los cálculos SGP4 locales vs APIs independientes (Where the ISS at? / N2YO).
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.validateBtn, loading && styles.btnDisabled]}
          onPress={handleValidateWhereTheIss}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.validateBtnText}>🚀 Validar ISS (WhereTheISS)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.validateBtnSecondary, loading && styles.btnDisabled]}
          onPress={handleValidateN2yo}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.validateBtnSecondaryText}>📡 Validar con N2YO</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#00f0ff" />
          <Text style={styles.loadingText}>Consultando API de referencia y propagando SGP4...</Text>
        </View>
      )}

      {/* Latest Result Card */}
      {latestResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Resultado de la Prueba Actual</Text>
          <Text style={styles.resultSub}>
            Fuente: {latestResult.referenceSource} • {new Date(latestResult.timestamp).toLocaleTimeString()}
          </Text>

          {/* Error Highlights */}
          <View style={styles.errorMetricGrid}>
            <View style={styles.errorMetricBox}>
              <Text style={styles.errorMetricLabel}>Error Superficie (Haversine)</Text>
              <Text style={styles.errorMetricVal}>{latestResult.surfaceErrorKm.toFixed(2)} km</Text>
            </View>

            <View style={styles.errorMetricBox}>
              <Text style={styles.errorMetricLabel}>Error 3D ECEF Total</Text>
              <Text style={styles.errorMetricVal}>{latestResult.total3dErrorKm.toFixed(2)} km</Text>
            </View>
          </View>

          {/* Coordinate Comparison Table */}
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 1.2 }]}>Parámetro</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>SGP4 Local</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>API Referencia</Text>
              <Text style={[styles.th, { flex: 1 }]}>Delta (Δ)</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.2 }]}>Latitud</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.calculated.latitude.toFixed(4)}°</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.reference.latitude.toFixed(4)}°</Text>
              <Text style={[styles.tdDelta, { flex: 1 }]}>{latestResult.deltaLatitude.toFixed(4)}°</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.2 }]}>Longitud</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.calculated.longitude.toFixed(4)}°</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.reference.longitude.toFixed(4)}°</Text>
              <Text style={[styles.tdDelta, { flex: 1 }]}>{latestResult.deltaLongitude.toFixed(4)}°</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.2 }]}>Altitud</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.calculated.altitude.toFixed(1)} km</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{latestResult.reference.altitude.toFixed(1)} km</Text>
              <Text style={[styles.tdDelta, { flex: 1 }]}>{latestResult.deltaAltitudeKm.toFixed(1)} km</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.2 }]}>Antigüedad TLE</Text>
              <Text style={[styles.td, { flex: 2.8 }]}>{latestResult.epochAgeHours.toFixed(1)} horas</Text>
            </View>
          </View>
        </View>
      )}

      {/* History Log Table */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Historial de Pruebas ({history.length})</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearBtnText}>Borrar Historial</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Presiona un botón arriba para ejecutar tu primera prueba de validación.</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyItemTop}>
                <Text style={styles.historySatName}>{item.satName}</Text>
                <Text style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              </View>

              <View style={styles.historyItemDetails}>
                <Text style={styles.historyDetailText}>Fuente: {item.referenceSource}</Text>
                <Text style={styles.historyErrorText}>Error: {item.total3dErrorKm.toFixed(2)} km</Text>
              </View>
            </View>
          ))
        )}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  subtitle: {
    fontSize: 12,
    color: '#829ab1',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  validateBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  validateBtnText: {
    color: '#00f0ff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  validateBtnSecondary: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#202d4a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  validateBtnSecondaryText: {
    color: '#d9e2ec',
    fontWeight: '600',
    fontSize: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#829ab1',
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f4f8',
  },
  resultSub: {
    fontSize: 11,
    color: '#829ab1',
    marginTop: 2,
    marginBottom: 12,
  },
  errorMetricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  errorMetricBox: {
    flex: 1,
    backgroundColor: '#0c1220',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1c2b4a',
  },
  errorMetricLabel: {
    fontSize: 10,
    color: '#829ab1',
    marginBottom: 2,
  },
  errorMetricVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00e676',
  },
  table: {
    backgroundColor: '#0c1220',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1c2b4a',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#16223b',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#829ab1',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#16223b',
  },
  td: {
    fontSize: 11,
    color: '#d9e2ec',
  },
  tdDelta: {
    fontSize: 11,
    color: '#ffd600',
    fontWeight: '600',
  },
  historySection: {
    marginTop: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#829ab1',
  },
  clearBtnText: {
    fontSize: 11,
    color: '#ff3366',
  },
  emptyBox: {
    backgroundColor: '#131b2e',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    color: '#829ab1',
    fontSize: 12,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#131b2e',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#202d4a',
    marginBottom: 8,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historySatName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f0f4f8',
  },
  historyTime: {
    fontSize: 11,
    color: '#829ab1',
  },
  historyItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDetailText: {
    fontSize: 11,
    color: '#829ab1',
  },
  historyErrorText: {
    fontSize: 11,
    color: '#00e676',
    fontWeight: '600',
  },
});
