import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SatelliteRecord } from '../types/satellite';
import { dataOrchestrator } from '../services/providers/dataOrchestrator';
import { orbitalEngine } from '../services/orbital/sgp4Engine';

interface CatalogScreenProps {
  currentSatellite: SatelliteRecord;
  onSelectSatellite: (sat: SatelliteRecord) => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  currentSatellite,
  onSelectSatellite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [satellites, setSatellites] = useState<SatelliteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const results = await dataOrchestrator.searchSatellites(searchQuery, selectedGroup);
        if (active) {
          setSatellites(results);
          setLoading(false);
        }
      } catch (err) {
        if (active) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, [searchQuery, selectedGroup]);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'stations', label: '🚀 Estaciones' },
    { id: 'starlink', label: '🛰️ Starlink' },
    { id: 'gps', label: '📡 GPS/GNSS' },
    { id: 'weather', label: '⛅ Clima' },
    { id: 'science', label: '🔭 Científicos' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o NORAD ID (ej: 25544, Starlink, NOAA)..."
          placeholderTextColor="#627d98"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedGroup === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedGroup(item.id)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Satellite List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00f0ff" />
          <Text style={styles.loadingText}>Cargando catálogo orbital...</Text>
        </View>
      ) : (
        <FlatList
          data={satellites}
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item }) => {
            const isCurrent = currentSatellite.id === item.id;
            const epochAgeHours = orbitalEngine.getEpochAgeHours(item);
            const isStale = epochAgeHours > 72; // RF-16 warning

            return (
              <TouchableOpacity
                style={[styles.satCard, isCurrent && styles.satCardActive]}
                onPress={() => onSelectSatellite(item)}
                activeOpacity={0.8}
              >
                <View style={styles.satCardHeader}>
                  <Text style={styles.satCardName}>{item.name}</Text>
                  <View style={styles.noradBadge}>
                    <Text style={styles.noradBadgeText}>NORAD {item.id}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Categoría: <Text style={styles.metaHighlight}>{item.category.toUpperCase()}</Text>
                  </Text>
                  {item.intlDes && (
                    <Text style={styles.metaText}>
                      COSPAR: <Text style={styles.metaHighlight}>{item.intlDes}</Text>
                    </Text>
                  )}
                </View>

                {/* RF-16: Epoch age and staleness warning */}
                <View style={styles.epochRow}>
                  <Text style={styles.epochText}>
                    Antigüedad efeméride: {epochAgeHours > 0 ? `${epochAgeHours.toFixed(1)} h` : 'Reciente'}
                  </Text>
                  {isStale ? (
                    <View style={styles.staleBadge}>
                      <Text style={styles.staleBadgeText}>⚠️ Datos &gt; 72h</Text>
                    </View>
                  ) : (
                    <View style={styles.freshBadge}>
                      <Text style={styles.freshBadgeText}>✓ Vigente</Text>
                    </View>
                  )}
                </View>

                {isCurrent && (
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedBannerText}>✓ Satélite Activo Seleccionado</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#131b2e',
    color: '#f0f4f8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#202d4a',
    fontSize: 13,
  },
  categoryBar: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
  },
  categoryChip: {
    backgroundColor: '#131b2e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00f0ff',
  },
  categoryText: {
    fontSize: 12,
    color: '#829ab1',
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#00f0ff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  satCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
    marginBottom: 10,
  },
  satCardActive: {
    borderColor: '#00f0ff',
    backgroundColor: '#16223b',
  },
  satCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  satCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f0f4f8',
    flex: 1,
  },
  noradBadge: {
    backgroundColor: '#0c1220',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  noradBadgeText: {
    fontSize: 11,
    color: '#00f0ff',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#829ab1',
  },
  metaHighlight: {
    color: '#d9e2ec',
    fontWeight: '600',
  },
  epochRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  epochText: {
    fontSize: 11,
    color: '#627d98',
  },
  freshBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freshBadgeText: {
    fontSize: 10,
    color: '#00e676',
    fontWeight: '600',
  },
  staleBadge: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  staleBadgeText: {
    fontSize: 10,
    color: '#ff3366',
    fontWeight: 'bold',
  },
  selectedBanner: {
    marginTop: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedBannerText: {
    fontSize: 11,
    color: '#00f0ff',
    fontWeight: 'bold',
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
});
