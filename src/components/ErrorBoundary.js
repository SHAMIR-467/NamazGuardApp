import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS } from '../constants';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.warn('[ErrorBoundary] Caught:', error, info);
  }
  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.icon}>🕌</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            NamazGuard encountered an unexpected error. Your prayer times and settings are safe.
          </Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gold, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.whiteAlpha80, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  errorText: { fontSize: 12, color: COLORS.danger, textAlign: 'center', marginBottom: 32, fontFamily: 'monospace' },
  button: { backgroundColor: COLORS.gold, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 28 },
  buttonText: { color: COLORS.navy, fontWeight: '700', fontSize: 16 },
});

export default ErrorBoundary;
