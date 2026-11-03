import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import { sensorService, CompassHeading } from '../../services/observer/sensorService';
import { formatAzimuthWithCardinal } from '../../services/orbital/orbitUtils';

interface AssistedCompassProps {
  targetAzimuth?: number; // Target satellite azimuth (0-360)
  targetElevation?: number; // Target satellite elevation (-90 to +90)
  satName?: string;
  size?: number;
}

export const AssistedCompass: React.FC<AssistedCompassProps> = ({
  targetAzimuth = 0,
  targetElevation = 0,
  satName = 'Satélite',
  size = Math.min(Dimensions.get('window').width - 48, 300),
}) => {
  const [heading, setHeading] = useState<CompassHeading>({ headingDegrees: 0 });

  useEffect(() => {
    const unsubscribe = sensorService.subscribe((h) => {
      setHeading(h);
    });
    return () => unsubscribe();
  }, []);

  const center = size / 2;
  const radius = center - 20;

  // Calculate delta angle between target azimuth and device heading
  let deltaAngle = targetAzimuth - heading.headingDegrees;
  while (deltaAngle > 180) deltaAngle -= 360;
  while (deltaAngle < -180) deltaAngle += 360;

  const isAligned = Math.abs(deltaAngle) <= 6 && targetElevation > 0;
  const isAboveHorizon = targetElevation > 0;

  // Compass rotation angle (dial rotates opposite to heading)
  const dialRotation = -heading.headingDegrees;

  // Target arrow relative to screen orientation
  const targetAngleOnScreen = deltaAngle;

  return (
    <View style={styles.container}>
      <View style={[styles.svgWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Compass Dial Outer Ring */}
          <Circle cx={center} cy={center} r={radius} fill="#0d1424" stroke="#1c2b4a" strokeWidth={2} />
          <Circle cx={center} cy={center} r={radius - 8} fill="none" stroke="#253a66" strokeWidth={1} strokeDasharray="3 3" />
          <Circle cx={center} cy={center} r={radius / 2} fill="none" stroke="#16223b" strokeWidth={1} />

          {/* Rotating Compass Ring */}
          <G rotation={dialRotation} origin={`${center}, ${center}`}>
            {/* North Indicator */}
            <Polygon
              points={`${center},${center - radius + 10} ${center - 8},${center - radius + 26} ${center + 8},${center - radius + 26}`}
              fill="#ff3366"
            />
            {/* South Indicator */}
            <Polygon
              points={`${center},${center + radius - 10} ${center - 8},${center + radius - 26} ${center + 8},${center + radius - 26}`}
              fill="#627d98"
            />

            {/* Cardinal Letters */}
            <SvgText x={center} y={center - radius + 38} fill="#ff3366" fontSize={14} fontWeight="bold" textAnchor="middle">
              N
            </SvgText>
            <SvgText x={center + radius - 22} y={center + 5} fill="#829ab1" fontSize={13} fontWeight="bold" textAnchor="middle">
              E
            </SvgText>
            <SvgText x={center} y={center + radius - 14} fill="#829ab1" fontSize={13} fontWeight="bold" textAnchor="middle">
              S
            </SvgText>
            <SvgText x={center - radius + 22} y={center + 5} fill="#829ab1" fontSize={13} fontWeight="bold" textAnchor="middle">
              W
            </SvgText>

            {/* Degree ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <Line
                key={`tick-${deg}`}
                x1={center}
                y1={center - radius}
                x2={center}
                y2={center - radius + (deg % 90 === 0 ? 8 : 4)}
                stroke="#334e68"
                strokeWidth={deg % 90 === 0 ? 2 : 1}
                transform={`rotate(${deg} ${center} ${center})`}
              />
            ))}
          </G>

          {/* Center Crosshairs */}
          <Line x1={center - 12} y1={center} x2={center + 12} y2={center} stroke="#00f0ff" strokeWidth={1.5} />
          <Line x1={center} y1={center - 12} x2={center} y2={center + 12} stroke="#00f0ff" strokeWidth={1.5} />
          <Circle cx={center} cy={center} r={4} fill={isAligned ? '#00e676' : '#00f0ff'} />

          {/* Target Satellite Pointer Arrow */}
          <G rotation={targetAngleOnScreen} origin={`${center}, ${center}`}>
            <Line
              x1={center}
              y1={center - 10}
              x2={center}
              y2={center - radius + 14}
              stroke={isAligned ? '#00e676' : '#ffd600'}
              strokeWidth={3}
              strokeDasharray="4 2"
            />
            <Polygon
              points={`${center},${center - radius + 4} ${center - 10},${center - radius + 22} ${center + 10},${center - radius + 22}`}
              fill={isAligned ? '#00e676' : '#ffd600'}
            />
          </G>
        </Svg>
      </View>

      {/* Guidance Cards */}
      <View style={styles.guidanceBox}>
        <Text style={[styles.alignmentBadge, isAligned ? styles.alignedText : styles.unalignedText]}>
          {isAligned
            ? '🎯 ¡SATÉLITE ALINEADO CON TU VISTA!'
            : isAboveHorizon
            ? deltaAngle > 0
              ? `👉 Gira ${Math.abs(Math.round(deltaAngle))}° a la DERECHA`
              : `👈 Gira ${Math.abs(Math.round(deltaAngle))}° a la IZQUIERDA`
            : '🌑 Satélite bajo el horizonte local'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Rumbo Dispositivo</Text>
            <Text style={styles.statValue}>{formatAzimuthWithCardinal(heading.headingDegrees)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Azimut Satélite</Text>
            <Text style={styles.statValue}>{formatAzimuthWithCardinal(targetAzimuth)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Elevación Satélite</Text>
            <Text style={[styles.statValue, { color: isAboveHorizon ? '#00e676' : '#ff3366' }]}>
              {targetElevation.toFixed(1)}°
            </Text>
          </View>
        </View>

        {isAboveHorizon && (
          <View style={styles.elevationGuide}>
            <Text style={styles.elevationGuideText}>
              📐 Inclina el móvil hacia arriba {targetElevation.toFixed(0)}° respecto a la horizontal.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceBox: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202d4a',
  },
  alignmentBadge: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  alignedText: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    color: '#00e676',
    borderColor: '#00e676',
    borderWidth: 1,
  },
  unalignedText: {
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    color: '#ffd600',
    borderColor: '#ffd600',
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1c2b4a',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#829ab1',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  elevationGuide: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  elevationGuideText: {
    color: '#9fb3c8',
    fontSize: 12,
    textAlign: 'center',
  },
});
