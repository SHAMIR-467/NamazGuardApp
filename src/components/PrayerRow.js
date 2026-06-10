import React, { memo, useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { formatTime } from '../services/PrayerTimeService';

const PrayerRow = memo(({ prayer, time, isLocked, isActive, isNext, isDark, onToggle }) => {
  const handleToggle = useCallback(() => {
    onToggle(prayer.key, !isLocked);
  }, [prayer.key, isLocked, onToggle]);

  const colors = isDark
    ? { text: COLORS.white, sub: COLORS.whiteAlpha60, border: COLORS.whiteAlpha10 }
    : { text: COLORS.lightText, sub: COLORS.lightSubtext, border: COLORS.lightBorder };

  return (
    <View style={[
      styles.row,
      { borderBottomColor: colors.border },
      isActive && styles.activeRow,
      isNext && !isActive && styles.nextRow,
    ]}>
      <View style={[styles.iconBubble, isActive && styles.iconBubbleActive]}>
        <Text style={styles.icon}>{prayer.icon}</Text>
      </View>
      <View style={styles.nameBlock}>
        <Text style={[styles.arabicName, { color: isActive ? COLORS.gold : colors.text }]}>
          {prayer.arabic}
        </Text>
        <Text style={[styles.englishName, { color: colors.sub }]}>
          {prayer.english}
          {isActive ? <Text style={styles.activeBadge}> · Active 🔒</Text> : null}
          {isNext && !isActive ? <Text style={styles.nextBadge}> · Next</Text> : null}
        </Text>
      </View>
      <Text style={[styles.time, { color: isActive ? COLORS.gold : colors.text }]}>
        {formatTime(time)}
      </Text>
      <Switch
        value={isLocked}
        onValueChange={handleToggle}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: COLORS.goldDark }}
        thumbColor={isLocked ? COLORS.gold : COLORS.whiteAlpha60}
        ios_backgroundColor="rgba(255,255,255,0.15)"
        style={styles.switch}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  activeRow: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 12, marginHorizontal: 4 },
  nextRow: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginHorizontal: 4 },
  iconBubble: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconBubbleActive: { backgroundColor: 'rgba(201,168,76,0.2)' },
  icon: { fontSize: 20 },
  nameBlock: { flex: 1 },
  arabicName: { fontSize: 16, fontWeight: '600' },
  englishName: { fontSize: 12, marginTop: 2 },
  activeBadge: { color: COLORS.gold, fontWeight: '600' },
  nextBadge: { color: COLORS.amber, fontWeight: '500' },
  time: { fontSize: 15, fontWeight: '500', marginRight: 10, minWidth: 72, textAlign: 'right' },
  switch: { marginLeft: 4 },
});

export default PrayerRow;
