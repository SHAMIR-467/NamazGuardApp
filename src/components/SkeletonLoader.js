import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

const SkeletonBox = ({ width, height, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[styles.skeleton, { width, height, opacity }, style]} />;
};

export const HomeScreenSkeleton = () => (
  <View style={styles.container}>
    <SkeletonBox width={200} height={28} style={styles.centerItem} />
    <SkeletonBox width={160} height={16} style={[styles.centerItem, { marginTop: 8 }]} />
    <View style={styles.card}>
      <SkeletonBox width={120} height={20} style={styles.centerItem} />
      <SkeletonBox width={200} height={56} style={[styles.centerItem, { marginTop: 12 }]} />
      <SkeletonBox width={160} height={16} style={[styles.centerItem, { marginTop: 8 }]} />
    </View>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.row}>
        <SkeletonBox width={40} height={40} style={{ borderRadius: 20 }} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBox width={80} height={14} />
          <SkeletonBox width={60} height={12} style={{ marginTop: 4 }} />
        </View>
        <SkeletonBox width={70} height={20} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  skeleton: { backgroundColor: COLORS.whiteAlpha20, borderRadius: 8 },
  centerItem: { alignSelf: 'center' },
  card: { backgroundColor: COLORS.whiteAlpha10, borderRadius: 16, padding: 24, marginVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.whiteAlpha10 },
});

export default SkeletonBox;
