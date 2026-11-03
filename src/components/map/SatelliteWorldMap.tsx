import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { SatellitePosition, ObserverLocation, GroundTrackPoint } from '../../types/satellite';

const NativeWebView = WebView as unknown as React.ComponentType<any>;

interface SatelliteWorldMapProps {
  position: SatellitePosition | null;
  observer: ObserverLocation;
  groundTrackSegments: GroundTrackPoint[][];
  footprintPoints: { latitude: number; longitude: number }[];
  constellationPositions?: { id: number; name: string; latitude: number; longitude: number; altitude: number }[];
  showConstellation?: boolean;
  onSelectSatellite?: (id: number) => void;
}

export const SatelliteWorldMap: React.FC<SatelliteWorldMapProps> = ({
  position,
  observer,
  groundTrackSegments,
  footprintPoints,
  constellationPositions = [],
  showConstellation = false,
  onSelectSatellite,
}) => {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  // Generate Leaflet Map HTML
  const generateMapHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container {
      background: #090d16 !important;
    }
    .sat-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }
    .sat-icon {
      font-size: 20px;
      filter: drop-shadow(0 0 8px #00f0ff);
      animation: pulse 2s infinite ease-in-out;
    }
    .obs-icon {
      font-size: 20px;
      filter: drop-shadow(0 0 6px #ff3366);
    }
    .const-dot {
      width: 8px;
      height: 8px;
      background: #00e5ff;
      border-radius: 50%;
      border: 1px solid #ffffff;
      box-shadow: 0 0 6px #00e5ff;
      cursor: pointer;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${position?.latitude || 0}, ${position?.longitude || 0}],
      zoom: 3,
      minZoom: 1,
      maxZoom: 12,
      worldCopyJump: false,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    var satMarker = null;
    var obsMarker = null;
    var trackLayers = [];
    var footprintLayer = null;
    var constLayerGroup = L.layerGroup().addTo(map);

    function createSatIcon() {
      return L.divIcon({
        className: 'sat-marker',
        html: '<div class="sat-icon">🛰️</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    function createObsIcon() {
      return L.divIcon({
        className: 'sat-marker',
        html: '<div class="obs-icon">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    function createConstIcon(name) {
      return L.divIcon({
        className: 'const-dot-wrap',
        html: '<div class="const-dot" title="' + name + '"></div>',
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      });
    }

    obsMarker = L.marker([${observer.latitude}, ${observer.longitude}], { icon: createObsIcon() })
      .bindPopup('<b>Observador</b><br/>${observer.name}')
      .addTo(map);

    updateState(${JSON.stringify({
      satPos: position,
      groundTracks: groundTrackSegments,
      footprint: footprintPoints,
      constellation: showConstellation ? constellationPositions : [],
    })});

    function updateState(data) {
      if (!data) return;

      if (data.satPos) {
        var latLng = [data.satPos.latitude, data.satPos.longitude];
        if (!satMarker) {
          satMarker = L.marker(latLng, { icon: createSatIcon() }).addTo(map);
        } else {
          satMarker.setLatLng(latLng);
        }
        satMarker.bindPopup('<b>' + data.satPos.name + '</b><br/>Alt: ' + Math.round(data.satPos.altitude) + ' km<br/>Vel: ' + Math.round(data.satPos.velocity * 3600) + ' km/h');
      }

      trackLayers.forEach(function(l) { map.removeLayer(l); });
      trackLayers = [];

      if (data.groundTracks && data.groundTracks.length > 0) {
        data.groundTracks.forEach(function(seg) {
          var latLngs = seg.map(function(p) { return [p.latitude, p.longitude]; });
          var poly = L.polyline(latLngs, {
            color: '#00f0ff',
            weight: 2.5,
            opacity: 0.85,
            dashArray: '4, 4'
          }).addTo(map);
          trackLayers.push(poly);
        });
      }

      if (footprintLayer) {
        map.removeLayer(footprintLayer);
        footprintLayer = null;
      }
      if (data.footprint && data.footprint.length > 0) {
        var fpLatLngs = data.footprint.map(function(p) { return [p.latitude, p.longitude]; });
        footprintLayer = L.polygon(fpLatLngs, {
          color: '#00f0ff',
          weight: 1.5,
          fillColor: '#00e5ff',
          fillOpacity: 0.15
        }).addTo(map);
      }

      constLayerGroup.clearLayers();
      if (data.constellation && data.constellation.length > 0) {
        data.constellation.forEach(function(c) {
          var marker = L.marker([c.latitude, c.longitude], { icon: createConstIcon(c.name) });
          marker.on('click', function() {
            var msg = JSON.stringify({ type: 'SELECT_SAT', id: c.id });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(msg);
            } else if (window.parent) {
              window.parent.postMessage(msg, '*');
            }
          });
          marker.bindTooltip(c.name + ' (' + Math.round(c.altitude) + ' km)', { direction: 'top' });
          constLayerGroup.addLayer(marker);
        });
      }
    }

    function handleIncomingMessage(eventData) {
      try {
        var payload = typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
        if (payload.action === 'UPDATE') {
          updateState(payload.data);
        } else if (payload.action === 'CENTER_SAT') {
          if (satMarker) map.panTo(satMarker.getLatLng());
        } else if (payload.action === 'CENTER_OBS') {
          if (obsMarker) map.panTo(obsMarker.getLatLng());
        }
      } catch (e) {
        console.error(e);
      }
    }

    window.addEventListener('message', function(event) {
      handleIncomingMessage(event.data);
    });

    document.addEventListener('message', function(event) {
      handleIncomingMessage(event.data);
    });
  </script>
</body>
</html>
    `;
  };

  // Push updates to webview/iframe when props change
  useEffect(() => {
    const payload = JSON.stringify({
      action: 'UPDATE',
      data: {
        satPos: position,
        groundTracks: groundTrackSegments,
        footprint: footprintPoints,
        constellation: showConstellation ? constellationPositions : [],
      },
    });

    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  }, [position, groundTrackSegments, footprintPoints, showConstellation, constellationPositions]);

  const handleCenterSat = () => {
    const msg = JSON.stringify({ action: 'CENTER_SAT' });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webViewRef.current?.postMessage(msg);
    }
  };

  const handleCenterObs = () => {
    const msg = JSON.stringify({ action: 'CENTER_OBS' });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webViewRef.current?.postMessage(msg);
    }
  };

  const onMessage = (event: any) => {
    try {
      const data = typeof event.nativeEvent?.data === 'string'
        ? JSON.parse(event.nativeEvent.data)
        : event.data ? JSON.parse(event.data) : null;
      if (data?.type === 'SELECT_SAT' && onSelectSatellite) {
        onSelectSatellite(data.id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: MessageEvent) => onMessage(e);
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, [onSelectSatellite]);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={generateMapHtml()}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#090d16' } as any}
        />
      ) : (
        <NativeWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: generateMapHtml() }}
          style={styles.webView}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onMessage}
          nestedScrollEnabled={false}
        />
      )}

      {/* Floating map controls */}
      <View style={styles.controlsOverlay}>
        <TouchableOpacity style={styles.controlButton} onPress={handleCenterSat} activeOpacity={0.7}>
          <Text style={styles.controlButtonText}>🛰️ Centrar Sat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleCenterObs} activeOpacity={0.7}>
          <Text style={styles.controlButtonText}>📍 Centrar Obs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(19, 27, 46, 0.88)',
    borderWidth: 1,
    borderColor: '#202d4a',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '600',
  },
});
