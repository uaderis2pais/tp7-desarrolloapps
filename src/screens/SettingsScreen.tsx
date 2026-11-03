import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ObserverLocation } from '../types/satellite';
import { locationService } from '../services/observer/locationService';
import { cacheManager } from '../services/providers/cacheManager';
import { dataOrchestrator } from '../services/providers/dataOrchestrator';
import { n2yoProvider } from '../services/providers/n2yoProvider';

interface SettingsScreenProps {
  observer: ObserverLocation;
  minElevationDeg: number;
  onUpdateObserver: (loc: ObserverLocation) => void;
  onUpdateMinElevation: (el: number) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  observer,
  minElevationDeg,
  onUpdateObserver,
  onUpdateMinElevation,
}) => {
  const [customLat, setCustomLat] = useState(observer.latitude.toString());
  const [customLon, setCustomLon] = useState(observer.longitude.toString());
  const [customAlt, setCustomAlt] = useState(observer.altitudeMeters.toString());
  const [n2yoApiKey, setN2yoApiKey] = useState(n2yoProvider.getApiKey() || '');
  const presets = locationService.getPresets();
  const providers = dataOrchestrator.getProvidersStatus();

  const handleUseGps = async () => {
    const loc = await locationService.requestGpsLocation();
    if (loc) {
      setCustomLat(loc.latitude.toString());
      setCustomLon(loc.longitude.toString());
      setCustomAlt(loc.altitudeMeters.toString());
      onUpdateObserver(loc);
      Alert.alert('GPS Actualizado', `Ubicación: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } else {
      Alert.alert('Error GPS', 'No se pudo obtener la posición o no se otorgaron los permisos necesarios.');
    }
  };

  const handleSelectPreset = (preset: ObserverLocation) => {
    setCustomLat(preset.latitude.toString());
    setCustomLon(preset.longitude.toString());
    setCustomAlt(preset.altitudeMeters.toString());
    onUpdateObserver(preset);
  };

  const handleSaveCustomLocation = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    const alt = parseFloat(customAlt) || 0;

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Error', 'Ingresa valores válidos de Latitud (-90 a 90) y Longitud (-180 a 180).');
      return;
    }

    const newLoc: ObserverLocation = {
      name: 'Ubicación Personalizada',
      latitude: lat,
      longitude: lon,
      altitudeMeters: alt,
    };
    onUpdateObserver(newLoc);
    Alert.alert('Guardado', 'Ubicación del observador actualizada correctamente.');
  };

  const handleSaveN2yoKey = () => {
    n2yoProvider.setApiKey(n2yoApiKey);
    Alert.alert('API Key Guardada', 'Clave para N2YO configurada.');
  };

  const handleClearCache = async () => {
    await cacheManager.clearAll();
    Alert.alert('Caché Limpiada', 'Se borraron los datos orbitales locales.');
  };

  const elevationPresets = [0, 5, 10, 15, 20, 25];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes y Configuración</Text>
        <Text style={styles.subtitle}>Parámetros del observador, horizonte y proveedores de datos</Text>
      </View>

      {/* 1. Observer Location Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Ubicación del Observador (Ground Station)</Text>
        <Text style={styles.cardDesc}>
          Define el punto geográfico desde donde se calculan el Azimut, Elevación y las ventanas de visibilidad.
        </Text>

        <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} activeOpacity={0.8}>
          <Text style={styles.gpsBtnText}>📡 Detectar con GPS del Dispositivo</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Lugares Preconfigurados:</Text>
        <View style={styles.presetWrap}>
          {presets.map((p) => {
            const isSelected = observer.name === p.name;
            return (
              <TouchableOpacity
                key={p.name}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => handleSelectPreset(p)}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Coordenadas Manuales:</Text>
        <View style={styles.coordsRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Latitud (°)</Text>
            <TextInput
              style={styles.input}
              value={customLat}
              onChangeText={setCustomLat}
              keyboardType="numeric"
              placeholder="-32.4825"
              placeholderTextColor="#627d98"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Longitud (°)</Text>
            <TextInput
              style={styles.input}
              value={customLon}
              onChangeText={setCustomLon}
              keyboardType="numeric"
              placeholder="-58.2332"
              placeholderTextColor="#627d98"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Altitud (m)</Text>
            <TextInput
              style={styles.input}
              value={customAlt}
              onChangeText={setCustomAlt}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor="#627d98"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomLocation}>
          <Text style={styles.saveBtnText}>Guardar Coordenadas</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Elevation Threshold */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📐 Máscara de Elevación Mínima (Horizonte)</Text>
        <Text style={styles.cardDesc}>
          Filtra pases por debajo de este ángulo para evitar obstrucciones del relieve o edificios ({minElevationDeg}° actual).
        </Text>

        <View style={styles.elWrap}>
          {elevationPresets.map((deg) => {
            const isSelected = minElevationDeg === deg;
            return (
              <TouchableOpacity
                key={`el-${deg}`}
                style={[styles.elChip, isSelected && styles.elChipActive]}
                onPress={() => onUpdateMinElevation(deg)}
              >
                <Text style={[styles.elText, isSelected && styles.elTextActive]}>{deg}°</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. API Providers & Keys */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌐 Proveedores de Datos Orbitales</Text>

        {providers.map((p) => (
          <View key={p.name} style={styles.providerRow}>
            <View>
              <Text style={styles.providerName}>{p.name}</Text>
              <Text style={styles.providerDesc}>{p.limits.notes}</Text>
            </View>
            <View style={[styles.statusBadge, p.available ? styles.statusOk : styles.statusReq]}>
              <Text style={styles.statusText}>{p.available ? 'Activo' : 'Requiere Key'}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>API Key N2YO (Opcional para validación):</Text>
        <View style={styles.keyRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={n2yoApiKey}
            onChangeText={setN2yoApiKey}
            placeholder="Introduce tu API Key de N2YO..."
            placeholderTextColor="#627d98"
            secureTextEntry={false}
          />
          <TouchableOpacity style={styles.keySaveBtn} onPress={handleSaveN2yoKey}>
            <Text style={styles.keySaveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Cache & Storage */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💾 Almacenamiento Local y Caché</Text>
        <Text style={styles.cardDesc}>
          Los catálogos orbitales se almacenan en SQLite/AsyncStorage con TTL de 12-24h para permitir funcionamiento 100% offline.
        </Text>

        <TouchableOpacity style={styles.clearCacheBtn} onPress={handleClearCache}>
          <Text style={styles.clearCacheBtnText}>🗑️ Limpiar Caché y Forzar Recarga</Text>
        </TouchableOpacity>
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
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f0f4f8',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: '#829ab1',
    marginBottom: 12,
  },
  gpsBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsBtnText: {
    color: '#00f0ff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d9e2ec',
    marginBottom: 8,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: '#0c1220',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  presetChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00f0ff',
  },
  presetText: {
    fontSize: 11,
    color: '#829ab1',
  },
  presetTextActive: {
    color: '#00f0ff',
    fontWeight: 'bold',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    color: '#829ab1',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0c1220',
    color: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#202d4a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#1c2b4a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#d9e2ec',
    fontSize: 12,
    fontWeight: '600',
  },
  elWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  elChip: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: '#0c1220',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  elChipActive: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff',
  },
  elText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#829ab1',
  },
  elTextActive: {
    color: '#090d16',
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
  },
  providerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f0f4f8',
  },
  providerDesc: {
    fontSize: 10,
    color: '#829ab1',
    maxWidth: 220,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusOk: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  statusReq: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#d9e2ec',
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keySaveBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  keySaveBtnText: {
    color: '#00f0ff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  clearCacheBtn: {
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    borderWidth: 1,
    borderColor: '#ff3366',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearCacheBtnText: {
    color: '#ff3366',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
