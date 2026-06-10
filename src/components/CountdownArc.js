import React, { useEffect, useRef, memo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

// Pure React Native arc using border trick — no SVG needed
const CountdownArc = memo(({ progress = 0, size = 160, color = COLORS.gold, strokeWidth = 6 }) => {
  const rotateAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // We draw the arc using two half-circle masks
  const halfSize = size / 2;
  const deg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring */}
      <View style={[styles.ring, {
        width: size, height: size,
        borderRadius: halfSize,
        borderWidth: strokeWidth,
        borderColor: `${color}22`,
      }]} />
      {/* Animated foreground — CSS-like clip trick */}
      <View style={[styles.ringOverlay, {
        width: size, height: size,
        borderRadius: halfSize,
      }]}>
        <Animated.View style={[styles.halfCircle, {
          width: halfSize,
          height: size,
          borderTopRightRadius: halfSize,
          borderBottomRightRadius: halfSize,
          borderWidth: strokeWidth,
          borderLeftWidth: 0,
          borderColor: color,
          transform: [{ rotate: deg }],
          transformOrigin: 'left center',
        }]} />
      </View>
      {/* Gold dot marker */}
      <View style={[styles.dot, {
        width: strokeWidth * 2,
        height: strokeWidth * 2,
        borderRadius: strokeWidth,
        backgroundColor: color,
        top: strokeWidth / 2 - strokeWidth + 2,
        left: halfSize - strokeWidth,
      }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  ringOverlay: {
    position: 'absolute',
    overflow: 'hidden',
  },
  halfCircle: {
    position: 'absolute',
    left: halfSize => halfSize,
    backgroundColor: 'transparent',
  },
  dot: {
    position: 'absolute',
  },
});

export default CountdownArc;
