import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Path, G } from 'react-native-svg';
import { PassPrediction, SatellitePosition } from '../../types/satellite';

interface PolarSkyChartProps {
  pass: PassPrediction | null;
  currentPosition?: SatellitePosition | null;
  size?: number;
}

export const PolarSkyChart: React.FC<PolarSkyChartProps> = ({
  pass,
  currentPosition,
  size = Math.min(Dimensions.get('window').width - 32, 340),
}) => {
  const center = size / 2;
  const radius = center - 24; // Padding for cardinal labels

  // Coordinate transformation: Az/El to (X, Y)
  const getCoordinates = (azimuth: number, elevation: number) => {
    // Clamp elevation to 0-90 for plotting inside the dome
    const clampedEl = Math.max(0, Math.min(90, elevation));
    const r = radius * ((90 - clampedEl) / 90);
    const rad = (azimuth * Math.PI) / 180;
    const x = center + r * Math.sin(rad);
    const y = center - r * Math.cos(rad);
    return { x, y };
  };

  // Generate SVG path for pass trajectory
  let trajectoryPath = '';
  if (pass && pass.trajectory.length > 1) {
    trajectoryPath = pass.trajectory.reduce((path, pt, index) => {
      const { x, y } = getCoordinates(pt.azimuth, pt.elevation);
      return index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${path} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }

  // Markers
  const aosCoords = pass ? getCoordinates(pass.aos.azimuth, pass.aos.elevation) : null;
  const pcaCoords = pass ? getCoordinates(pass.pca.azimuth, pass.pca.elevation) : null;
  const losCoords = pass ? getCoordinates(pass.los.azimuth, pass.los.elevation) : null;

  // Live satellite marker
  const liveCoords =
    currentPosition && currentPosition.azimuth !== undefined && currentPosition.elevation !== undefined && currentPosition.elevation >= 0
      ? getCoordinates(currentPosition.azimuth, currentPosition.elevation)
      : null;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Sky Dome */}
        <Circle cx={center} cy={center} r={radius} fill="#0d1424" stroke="#1c2b4a" strokeWidth={2} />

        {/* Concentric Elevation Rings */}
        {/* 0° Horizon */}
        <Circle cx={center} cy={center} r={radius} fill="none" stroke="#253a66" strokeWidth={1.5} />
        {/* 30° Elevation */}
        <Circle cx={center} cy={center} r={(radius * 2) / 3} fill="none" stroke="#1c2b4a" strokeWidth={1} strokeDasharray="4 4" />
        {/* 60° Elevation */}
        <Circle cx={center} cy={center} r={radius / 3} fill="none" stroke="#1c2b4a" strokeWidth={1} strokeDasharray="4 4" />
        {/* 90° Zenith Point */}
        <Circle cx={center} cy={center} r={3} fill="#00f0ff" />

        {/* Cardinal Grid Crosshairs */}
        <Line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#1a2742" strokeWidth={1} />
        <Line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#1a2742" strokeWidth={1} />

        {/* Diagonal Crosshairs */}
        <Line
          x1={center - (radius * Math.SQRT2) / 2}
          y1={center - (radius * Math.SQRT2) / 2}
          x2={center + (radius * Math.SQRT2) / 2}
          y2={center + (radius * Math.SQRT2) / 2}
          stroke="#131c30"
          strokeWidth={0.8}
        />
        <Line
          x1={center - (radius * Math.SQRT2) / 2}
          y1={center + (radius * Math.SQRT2) / 2}
          x2={center + (radius * Math.SQRT2) / 2}
          y2={center - (radius * Math.SQRT2) / 2}
          stroke="#131c30"
          strokeWidth={0.8}
        />

        {/* Elevation Angle Labels */}
        <SvgText x={center + 4} y={center - (radius * 2) / 3 - 3} fill="#627d98" fontSize={9} fontWeight="600">
          30°
        </SvgText>
        <SvgText x={center + 4} y={center - radius / 3 - 3} fill="#627d98" fontSize={9} fontWeight="600">
          60°
        </SvgText>
        <SvgText x={center + 4} y={center - 6} fill="#00f0ff" fontSize={9} fontWeight="600">
          Z (90°)
        </SvgText>

        {/* Cardinal Direction Labels */}
        <SvgText x={center} y={15} fill="#ff3366" fontSize={13} fontWeight="bold" textAnchor="middle">
          N
        </SvgText>
        <SvgText x={size - 10} y={center + 4} fill="#829ab1" fontSize={12} fontWeight="bold" textAnchor="middle">
          E
        </SvgText>
        <SvgText x={center} y={size - 6} fill="#829ab1" fontSize={12} fontWeight="bold" textAnchor="middle">
          S
        </SvgText>
        <SvgText x={10} y={center + 4} fill="#829ab1" fontSize={12} fontWeight="bold" textAnchor="middle">
          W
        </SvgText>

        {/* Pass Trajectory Arc */}
        {trajectoryPath ? (
          <Path
            d={trajectoryPath}
            fill="none"
            stroke="#00f0ff"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* AOS (Acquisition of Signal) Point */}
        {aosCoords ? (
          <G>
            <Circle cx={aosCoords.x} cy={aosCoords.y} r={5} fill="#00e676" />
            <SvgText
              x={aosCoords.x}
              y={aosCoords.y - 7}
              fill="#00e676"
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              AOS
            </SvgText>
          </G>
        ) : null}

        {/* PCA (Peak Maximum Elevation) Point */}
        {pcaCoords && pass ? (
          <G>
            <Circle cx={pcaCoords.x} cy={pcaCoords.y} r={6} fill="#ffd600" stroke="#fff" strokeWidth={1} />
            <SvgText
              x={pcaCoords.x}
              y={pcaCoords.y - 8}
              fill="#ffd600"
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
            >
              MAX {pass.pca.elevation.toFixed(0)}°
            </SvgText>
          </G>
        ) : null}

        {/* LOS (Loss of Signal) Point */}
        {losCoords ? (
          <G>
            <Circle cx={losCoords.x} cy={losCoords.y} r={5} fill="#ff3366" />
            <SvgText
              x={losCoords.x}
              y={losCoords.y - 7}
              fill="#ff3366"
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              LOS
            </SvgText>
          </G>
        ) : null}

        {/* Live Satellite Position on Sky Dome */}
        {liveCoords ? (
          <G>
            <Circle cx={liveCoords.x} cy={liveCoords.y} r={10} fill="none" stroke="#00f0ff" strokeWidth={2} opacity={0.6} />
            <Circle cx={liveCoords.x} cy={liveCoords.y} r={5} fill="#00f0ff" />
            <SvgText
              x={liveCoords.x}
              y={liveCoords.y + 16}
              fill="#00f0ff"
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              EN VIVO
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d16',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
});

