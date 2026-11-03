import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MapScreen } from './src/screens/MapScreen';
import { SkyChartScreen } from './src/screens/SkyChartScreen';
import { CompassScreen } from './src/screens/CompassScreen';
import { PassesScreen } from './src/screens/PassesScreen';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { ValidationScreen } from './src/screens/ValidationScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SatelliteRecord, ObserverLocation, PassPrediction } from './src/types/satellite';
import { SEED_SATELLITES, DEFAULT_OBSERVER } from './src/constants/defaults';

type TabType = 'map' | 'skychart' | 'compass' | 'passes' | 'catalog' | 'validation' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [activeSatellite, setActiveSatellite] = useState<SatelliteRecord>(SEED_SATELLITES[0]); // ISS default
  const [observer, setObserver] = useState<ObserverLocation>(DEFAULT_OBSERVER);
  const [minElevationDeg, setMinElevationDeg] = useState<number>(10);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);

  const handleSelectSatellite = (sat: SatelliteRecord) => {
    setActiveSatellite(sat);
    setCatalogModalVisible(false);
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'map', label: 'Mapa', icon: '🌍' },
    { key: 'skychart', label: 'Radar', icon: '🔭' },
    { key: 'compass', label: 'Brújula', icon: '🧭' },
    { key: 'passes', label: 'Pases', icon: '📅' },
    { key: 'catalog', label: 'Catálogo', icon: '🛰️' },
    { key: 'validation', label: 'Validar', icon: '⚖️' },
    { key: 'settings', label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.satSelector}
          onPress={() => setCatalogModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.satBadge}>
            <Text style={styles.satBadgeText}>🛰️</Text>
          </View>
          <View>
            <View style={styles.satTitleRow}>
              <Text style={styles.topSatName}>{activeSatellite.name}</Text>
              <Text style={styles.topSatChange}>[Cambiar ▼]</Text>
            </View>
            <Text style={styles.topObserverText}>
              Obs: {observer.name.split('(')[0].trim()} ({minElevationDeg}° mín)
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerSettingsBtn}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.headerSettingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'map' && (
          <MapScreen
            satellite={activeSatellite}
            observer={observer}
            minElevationDeg={minElevationDeg}
            onNavigateToSkyChart={() => setActiveTab('skychart')}
            onNavigateToCompass={() => setActiveTab('compass')}
            onSelectSatellite={handleSelectSatellite}
          />
        )}

        {activeTab === 'skychart' && (
          <SkyChartScreen
            satellite={activeSatellite}
            observer={observer}
            minElevationDeg={minElevationDeg}
          />
        )}

        {activeTab === 'compass' && (
          <CompassScreen satellite={activeSatellite} observer={observer} />
        )}

        {activeTab === 'passes' && (
          <PassesScreen
            satellite={activeSatellite}
            observer={observer}
            minElevationDeg={minElevationDeg}
            onSelectPassForChart={(pass: PassPrediction) => {
              setActiveTab('skychart');
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogScreen
            currentSatellite={activeSatellite}
            onSelectSatellite={handleSelectSatellite}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationScreen currentSatellite={activeSatellite} />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            observer={observer}
            minElevationDeg={minElevationDeg}
            onUpdateObserver={setObserver}
            onUpdateMinElevation={setMinElevationDeg}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Satellite Selection Modal */}
      <Modal visible={catalogModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Satélite</Text>
            <TouchableOpacity onPress={() => setCatalogModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar ✕</Text>
            </TouchableOpacity>
          </View>
          <CatalogScreen
            currentSatellite={activeSatellite}
            onSelectSatellite={handleSelectSatellite}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070a12',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1220',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
  },
  satSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  satBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16223b',
    borderWidth: 1,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satBadgeText: {
    fontSize: 18,
  },
  satTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topSatName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  topSatChange: {
    fontSize: 11,
    color: '#829ab1',
  },
  topObserverText: {
    fontSize: 11,
    color: '#829ab1',
  },
  headerSettingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  headerSettingsIcon: {
    fontSize: 16,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0c1220',
    borderTopWidth: 1,
    borderTopColor: '#1c2b4a',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  navIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: '#829ab1',
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#00f0ff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b4a',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  modalCloseText: {
    fontSize: 14,
    color: '#ff3366',
    fontWeight: '600',
  },
});
