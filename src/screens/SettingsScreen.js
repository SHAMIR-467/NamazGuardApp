import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, TextInput, Switch, SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS, CALC_METHODS, MADHABS, DEFAULT_SETTINGS, LOCATION_MODES } from '../constants';
import { saveSettings, clearAllData } from '../services/StorageService';
import { handleAsync } from '../utils';

const SectionHeader = ({ title, isDark }) => (
  <Text style={[styles.sectionHeader, { color: isDark ? COLORS.gold : COLORS.goldDark }]}>{title}</Text>
);

const SettingsScreen = ({ settings, onSettingsChange, onBack, isDark }) => {
  const [local, setLocal] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const colors = isDark
    ? { bg: COLORS.navyMid, card: COLORS.navyLight, text: COLORS.white, sub: COLORS.whiteAlpha60, border: COLORS.whiteAlpha10 }
    : { bg: COLORS.lightBg, card: COLORS.lightCard, text: COLORS.lightText, sub: COLORS.lightSubtext, border: COLORS.lightBorder };

  const update = useCallback((key, value) => setLocal((prev) => ({ ...prev, [key]: value })), []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const [, err] = await handleAsync(() => saveSettings(local));
    setSaving(false);
    if (err) Alert.alert('Error', 'Failed to save settings. Please try again.');
    else { onSettingsChange?.(local); onBack?.(); }
  }, [local, onSettingsChange, onBack]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will clear all your settings, lock preferences, and tasbih counts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything', style: 'destructive',
          onPress: async () => {
            const [, err] = await handleAsync(() => clearAllData());
            if (!err) { setLocal({ ...DEFAULT_SETTINGS }); Alert.alert('Done', 'All data cleared. Restart the app.'); }
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backText, { color: COLORS.gold }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings إعدادات</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, { color: COLORS.gold }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader title="CALCULATION METHOD" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker selectedValue={local.calcMethod} onValueChange={(v) => update('calcMethod', v)} style={{ color: colors.text }} dropdownIconColor={COLORS.gold}>
            {Object.entries(CALC_METHODS).map(([key, val]) => (
              <Picker.Item key={key} label={val.name} value={key} color={isDark ? COLORS.white : COLORS.lightText} />
            ))}
          </Picker>
        </View>

        <SectionHeader title="MADHAB (ASR CALCULATION)" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(MADHABS).map(([key, val]) => (
            <TouchableOpacity key={key} style={[styles.radioRow, { borderBottomColor: colors.border }]} onPress={() => update('madhab', key)}>
              <View style={[styles.radioCircle, local.madhab === key && styles.radioSelected]} />
              <Text style={[styles.radioLabel, { color: colors.text }]}>{val.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="LOCATION SOURCE (ALADHAN API)" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(LOCATION_MODES).map(([key, val]) => (
            <TouchableOpacity key={key} style={[styles.radioRow, { borderBottomColor: colors.border }]} onPress={() => update('locationMode', key)}>
              <View style={[styles.radioCircle, local.locationMode === key && styles.radioSelected]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, { color: colors.text }]}>{val.label}</Text>
                <Text style={{ fontSize: 11, color: colors.sub, marginTop: 2 }}>{val.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="LOCATION DETAILS" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
          <Text style={[styles.inputLabel, { color: colors.sub }]}>City</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={local.cityName} onChangeText={(v) => update('cityName', v)} placeholder="e.g. Karachi" placeholderTextColor={colors.sub} />
          <Text style={[styles.inputLabel, { color: colors.sub }]}>Country</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={local.country || ''} onChangeText={(v) => update('country', v)} placeholder="e.g. Pakistan" placeholderTextColor={colors.sub} />
          <Text style={[styles.inputLabel, { color: colors.sub }]}>Full Address (for address mode)</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={local.address || ''} onChangeText={(v) => update('address', v)} placeholder="e.g. Karachi, Pakistan" placeholderTextColor={colors.sub} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.sub }]}>Latitude</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={String(local.latitude)} onChangeText={(v) => update('latitude', parseFloat(v) || 0)} keyboardType="decimal-pad" placeholder="24.8607" placeholderTextColor={colors.sub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.sub }]}>Longitude</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={String(local.longitude)} onChangeText={(v) => update('longitude', parseFloat(v) || 0)} keyboardType="decimal-pad" placeholder="67.0011" placeholderTextColor={colors.sub} />
            </View>
          </View>
        </View>

        <SectionHeader title="NOTIFICATION LEAD TIME" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
          <Text style={[styles.radioLabel, { color: colors.text, marginBottom: 12 }]}>Notify {local.notificationLead} min before prayer</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[5, 10, 15, 20, 30].map((v) => (
              <TouchableOpacity key={v} onPress={() => update('notificationLead', v)} style={[styles.chipBtn, local.notificationLead === v && styles.chipBtnActive]}>
                <Text style={[styles.chipText, local.notificationLead === v && { color: COLORS.navy }]}>{v}m</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SectionHeader title="APPEARANCE" isDark={isDark} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.radioRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.radioLabel, { color: colors.text, flex: 1 }]}>Dark Mode</Text>
            <Switch value={local.theme === 'dark'} onValueChange={(v) => update('theme', v ? 'dark' : 'light')} trackColor={{ false: colors.border, true: COLORS.goldDark }} thumbColor={local.theme === 'dark' ? COLORS.gold : colors.sub} />
          </View>
        </View>

        <SectionHeader title="DANGER ZONE" isDark={isDark} />
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
          <Text style={styles.dangerText}>🗑  Reset All Data & Settings</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  backText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden', marginBottom: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gold, marginRight: 12 },
  radioSelected: { backgroundColor: COLORS.gold },
  radioLabel: { fontSize: 15 },
  inputLabel: { fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gold },
  chipBtnActive: { backgroundColor: COLORS.gold },
  chipText: { color: COLORS.gold, fontWeight: '600', fontSize: 13 },
  dangerBtn: { backgroundColor: 'rgba(224,82,82,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(224,82,82,0.3)', padding: 16, alignItems: 'center' },
  dangerText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
});

export default SettingsScreen;
