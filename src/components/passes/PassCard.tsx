import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { PassPrediction } from '../../types/satellite';
import { formatAzimuthWithCardinal, formatCountdown } from '../../services/orbital/orbitUtils';
import { notificationService } from '../../services/notifications/notificationService';

interface PassCardProps {
  pass: PassPrediction;
  onSelectPass?: (pass: PassPrediction) => void;
  isSelected?: boolean;
}

export const PassCard: React.FC<PassCardProps> = ({ pass, onSelectPass, isSelected }) => {
  const [isNotified, setIsNotified] = useState(notificationService.isPassScheduled(pass.id));

  const handleToggleNotification = async () => {
    if (isNotified) {
      await notificationService.cancelPassNotification(pass.id);
      setIsNotified(false);
      Alert.alert('Alarma cancelada', 'Se ha eliminado el recordatorio para este pase.');
    } else {
      const success = await notificationService.schedulePassNotification(pass, 5);
      if (success) {
        setIsNotified(true);
        Alert.alert('¡Recordatorio programado!', 'Te avisaremos 5 minutos antes del pase.');
      } else {
        Alert.alert('No se pudo programar', 'Verifica que el pase sea en el futuro y que tengas permisos de notificación.');
      }
    }
  };

  const getElevationColor = (el: number) => {
    if (el >= 50) return '#00e676'; // High pass - great visibility
    if (el >= 25) return '#ffd600'; // Medium pass
    return '#829ab1'; // Low pass
  };

  const durationMin = Math.floor(pass.durationSeconds / 60);
  const durationSec = pass.durationSeconds % 60;

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={() => onSelectPass && onSelectPass(pass)}
      activeOpacity={0.8}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>
            {pass.aos.time.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
          <Text style={styles.countdownText}>{formatCountdown(pass.aos.time)}</Text>
        </View>

        <View style={styles.badgesRow}>
          {pass.isVisible ? (
            <View style={styles.opticalBadge}>
              <Text style={styles.opticalBadgeText}>👁️ Visible a simple vista</Text>
            </View>
          ) : (
            <View style={styles.radioBadge}>
              <Text style={styles.radioBadgeText}>📡 Pase de radio</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.notifyBtn, isNotified && styles.notifyBtnActive]}
            onPress={handleToggleNotification}
          >
            <Text style={styles.notifyBtnText}>{isNotified ? '🔔 Alarma' : '🔕 Avisar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        {/* AOS */}
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>AOS (Inicio)</Text>
          <Text style={styles.detailTime}>
            {pass.aos.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <Text style={styles.detailAz}>{formatAzimuthWithCardinal(pass.aos.azimuth)}</Text>
        </View>

        {/* Max Elevation */}
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>PUNTO MÁX</Text>
          <Text style={[styles.maxElValue, { color: getElevationColor(pass.pca.elevation) }]}>
            {pass.pca.elevation.toFixed(0)}°
          </Text>
          <Text style={styles.detailTime}>
            {pass.pca.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>

        {/* LOS */}
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>LOS (Fin)</Text>
          <Text style={styles.detailTime}>
            {pass.los.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <Text style={styles.detailAz}>{formatAzimuthWithCardinal(pass.los.azimuth)}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.durationText}>
          ⏱️ Duración: {durationMin}m {durationSec}s
        </Text>
        <Text style={styles.tapText}>Toca para ver en radar polar ↗</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
    padding: 14,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: '#00f0ff',
    backgroundColor: '#16223b',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f4f8',
  },
  countdownText: {
    fontSize: 12,
    color: '#00f0ff',
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opticalBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e676',
  },
  opticalBadgeText: {
    fontSize: 11,
    color: '#00e676',
    fontWeight: '600',
  },
  radioBadge: {
    backgroundColor: 'rgba(98, 125, 152, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#627d98',
  },
  radioBadgeText: {
    fontSize: 11,
    color: '#9fb3c8',
    fontWeight: '600',
  },
  notifyBtn: {
    backgroundColor: '#1c2b4a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334e68',
  },
  notifyBtnActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
    borderColor: '#ffd600',
  },
  notifyBtnText: {
    fontSize: 11,
    color: '#f0f4f8',
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0c1220',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  detailCol: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#627d98',
    marginBottom: 2,
    fontWeight: '600',
  },
  detailTime: {
    fontSize: 12,
    color: '#d9e2ec',
    fontWeight: 'bold',
  },
  detailAz: {
    fontSize: 11,
    color: '#829ab1',
  },
  maxElValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  durationText: {
    fontSize: 11,
    color: '#829ab1',
  },
  tapText: {
    fontSize: 11,
    color: '#00f0ff',
  },
});
