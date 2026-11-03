import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PassCard } from '../components/passes/PassCard';
import { SatelliteRecord, ObserverLocation, PassPrediction } from '../types/satellite';
import { passPredictor } from '../services/orbital/passPredictor';

interface PassesScreenProps {
  satellite: SatelliteRecord;
  observer: ObserverLocation;
  minElevationDeg?: number;
  onSelectPassForChart?: (pass: PassPrediction) => void;
}

export const PassesScreen: React.FC<PassesScreenProps> = ({
  satellite,
  observer,
  minElevationDeg = 10,
  onSelectPassForChart,
}) => {
  const [passes, setPasses] = useState<PassPrediction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'visual' | 'high'>('all');
  const [loading, setLoading] = useState(true);

  const loadPasses = () => {
    setLoading(true);
    setTimeout(() => {
      const predictions = passPredictor.predictPasses(satellite, observer, new Date(), 5, minElevationDeg, 25);
      setPasses(predictions);
      setLoading(false);
    }, 50);
  };

  useEffect(() => {
    loadPasses();
  }, [satellite, observer, minElevationDeg]);

  const filteredPasses = passes.filter((p) => {
    if (filterType === 'visual') return p.isVisible;
    if (filterType === 'high') return p.pca.elevation >= 30;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Próximos Pases y Ventanas de Visibilidad</Text>
        <Text style={styles.subtitle}>
          {satellite.name} desde {observer.name}
        </Text>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}>
              Todos ({passes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterType === 'visual' && styles.filterPillActive]}
            onPress={() => setFilterType('visual')}
          >
            <Text style={[styles.filterPillText, filterType === 'visual' && styles.filterPillTextActive]}>
              👁️ Visibles ({passes.filter((p) => p.isVisible).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterType === 'high' && styles.filterPillActive]}
            onPress={() => setFilterType('high')}
          >
            <Text style={[styles.filterPillText, filterType === 'high' && styles.filterPillTextActive]}>
              ⭐ Altos &gt;30° ({passes.filter((p) => p.pca.elevation >= 30).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00f0ff" />
          <Text style={styles.loadingText}>Calculando ventanas de visibilidad orbital...</Text>
        </View>
      ) : filteredPasses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔭</Text>
          <Text style={styles.emptyText}>No se encontraron pases con los filtros actuales en los próximos 5 días.</Text>
          <Text style={styles.emptySubtext}>Intenta reducir el umbral de elevación mínima en Ajustes.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPasses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PassCard
              pass={item}
              onSelectPass={(pass) => {
                if (onSelectPassForChart) onSelectPassForChart(pass);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    padding: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  subtitle: {
    fontSize: 12,
    color: '#829ab1',
    marginTop: 2,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#131b2e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00f0ff',
  },
  filterPillText: {
    fontSize: 11,
    color: '#829ab1',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#00f0ff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#829ab1',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: '#f0f4f8',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#829ab1',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
