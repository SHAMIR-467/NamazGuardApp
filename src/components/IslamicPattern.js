import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

// Pure React Native geometric Islamic pattern — no SVG library needed
const Diamond = memo(({ x, y, size, color, opacity = 0.12 }) => (
  <View style={[styles.diamond, {
    left: x - size / 2,
    top:  y - size / 2,
    width: size,
    height: size,
    borderColor: color,
    opacity,
    transform: [{ rotate: '45deg' }],
  }]} />
));

const IslamicPattern = memo(({ width = 400, height = 400, color = COLORS.gold }) => {
  const step = 48;
  const diamonds = [];
  for (let row = 0; row * step < height + step; row++) {
    for (let col = 0; col * step < width + step; col++) {
      const offset = row % 2 === 0 ? 0 : step / 2;
      diamonds.push({ x: col * step + offset, y: row * step, size: 36 });
      // Inner smaller diamond
      diamonds.push({ x: col * step + offset, y: row * step, size: 18, opacity: 0.07 });
    }
  }

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {diamonds.map((d, i) => (
        <Diamond key={i} x={d.x} y={d.y} size={d.size} color={color} opacity={d.opacity ?? 0.1} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden',
  },
  diamond: {
    position: 'absolute',
    borderWidth: 0.8,
    backgroundColor: 'transparent',
  },
});

export default IslamicPattern;
