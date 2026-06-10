/**
 * NamazGuard — Islamic Prayer Lock App
 * No backend · No DB · Pure frontend
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  StatusBar, useColorScheme, Platform,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';

import ErrorBoundary from './src/components/ErrorBoundary';
import PermissionsGate from './src/components/PermissionsGate';
import HomeScreen from './src/screens/HomeScreen';
import { COLORS } from './src/constants';
import { hasGrantedPermissions } from './src/services/StorageService';
import { requestNotificationPermission } from './src/services/NotificationService';
import { registerBackgroundFetch } from './src/services/BackgroundTaskService';
import { handleAsync } from './src/utils';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Animated splash overlay ────────────────────────────────────────────────────
const NamazSplash = ({ onDone }) => {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale, { toValue: 2.5, duration: 900, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
      Animated.delay(200),
    ]).start(() => onDone?.());
  }, []);

  return (
    <View style={splash.container}>
      <Animated.View style={[splash.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Text style={splash.icon}>🕌</Text>
        <Text style={splash.title}>NamazGuard</Text>
        <Text style={splash.subtitle}>نَمَاز گارڈ</Text>
      </Animated.View>
      <Text style={splash.tagline}>Focus. Pray. Grow.</Text>
    </View>
  );
};

const splash = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: COLORS.gold },
  icon: { fontSize: 80, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.gold, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 18, color: COLORS.whiteAlpha60, textAlign: 'center', marginTop: 4 },
  tagline: { position: 'absolute', bottom: 60, fontSize: 13, color: COLORS.whiteAlpha60, letterSpacing: 2 },
});

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState('splash'); // 'splash' | 'permissions' | 'home'
  const scheme = useColorScheme();

  const handleSplashDone = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const [granted] = await handleAsync(() => hasGrantedPermissions());
      if (granted) {
        await registerBackgroundFetch();
        setAppState('home');
      } else {
        setAppState('permissions');
      }
    } catch (err) {
      console.warn('[App] handleSplashDone error:', err);
      setAppState('permissions');
    }
  }, []);

  const handlePermissionsComplete = useCallback(async () => {
    try {
      await requestNotificationPermission();
      await registerBackgroundFetch();
      setAppState('home');
    } catch (err) {
      console.warn('[App] handlePermissionsComplete error:', err);
      setAppState('home');
    }
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle={scheme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={COLORS.navy}
        translucent
      />
      {appState === 'splash' && (
        <NamazSplash onDone={handleSplashDone} />
      )}
      {appState === 'permissions' && (
        <PermissionsGate onComplete={handlePermissionsComplete} />
      )}
      {appState === 'home' && (
        <HomeScreen />
      )}
    </ErrorBoundary>
  );
}
