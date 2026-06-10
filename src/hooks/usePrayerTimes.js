import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import {
  calculatePrayerTimes, getNextPrayer, gregorianToHijri, haversineKm,
  handleAsync,
} from '../services/PrayerTimeService';
import {
  getSettings, saveSettings, cachePrayerTimes, getCachedPrayerTimes,
} from '../services/StorageService';

const LOCATION_MOVE_THRESHOLD_KM = 1;

export function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes]   = useState(null);
  const [nextPrayer,  setNextPrayer]    = useState(null);
  const [hijriDate,   setHijriDate]     = useState(null);
  const [settings,    setSettings]      = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [error,       setError]         = useState(null);

  const lastCoords = useRef(null);
  const todayStr   = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load settings once
  useEffect(() => {
    (async () => {
      const [s] = await handleAsync(() => getSettings());
      if (s) setSettings(s);
    })();
  }, []);

  // Memoize calculation — only re-run when coords or date change
  const computePrayerTimes = useCallback(async (lat, lng, method, madhab) => {
    try {
      const today = new Date();
      const dateKey = today.toISOString().slice(0, 10);

      // Try cache first
      const cached = await getCachedPrayerTimes(dateKey);
      let times = cached;

      if (!cached) {
        times = calculatePrayerTimes(lat, lng, today, method, madhab);
        await cachePrayerTimes(dateKey, times);
      }

      setPrayerTimes(times);
      setNextPrayer(getNextPrayer(times));
      setHijriDate(gregorianToHijri(today));
      setError(null);
      return times;
    } catch (err) {
      console.warn('[usePrayerTimes] computePrayerTimes error:', err.message);
      setError(err.message);
      return null;
    }
  }, []);

  // Location + calculation
  useEffect(() => {
    if (!settings) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        let lat = settings.lat, lng = settings.lng;

        if (!settings.manualLocation) {
          const [loc] = await handleAsync(() =>
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          );
          if (loc && !cancelled) {
            const newLat = loc.coords.latitude;
            const newLng = loc.coords.longitude;

            // Haversine debounce — skip if moved < 1 km
            if (lastCoords.current) {
              const dist = haversineKm(lastCoords.current.lat, lastCoords.current.lng, newLat, newLng);
              if (dist < LOCATION_MOVE_THRESHOLD_KM) {
                setLoading(false);
                return;
              }
            }
            lastCoords.current = { lat: newLat, lng: newLng };
            lat = newLat; lng = newLng;

            // Reverse geocode city name (best-effort)
            const [geo] = await handleAsync(() =>
              Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
            );
            if (geo && geo[0]) {
              const city = geo[0].city || geo[0].region || 'Unknown';
              const updated = { ...settings, lat, lng, cityName: city };
              setSettings(updated);
              await saveSettings(updated);
            }
          }
        }

        if (!cancelled) {
          await computePrayerTimes(lat, lng, settings.calculationMethod, settings.madhab);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [settings?.lat, settings?.lng, settings?.calculationMethod, settings?.madhab, todayStr]);

  // Refresh next prayer every minute
  useEffect(() => {
    if (!prayerTimes) return;
    const id = setInterval(() => {
      try { setNextPrayer(getNextPrayer(prayerTimes)); } catch {}
    }, 60_000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  const refreshSettings = useCallback(async () => {
    const [s] = await handleAsync(() => getSettings());
    if (s) setSettings(s);
  }, []);

  return { prayerTimes, nextPrayer, hijriDate, settings, loading, error, refreshSettings };
}
