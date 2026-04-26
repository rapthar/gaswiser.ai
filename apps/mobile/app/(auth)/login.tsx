import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, font, radius } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      let error;
      if (mode === 'login') {
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        ({ error } = await supabase.auth.signUp({ email, password }));
      }
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <Text style={styles.logoBlue}>Gas</Text>
          <Text style={styles.logoRed}>Wiser</Text>
        </View>
        <Text style={styles.tagline}>AI Fuel Intelligence</Text>

        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Sign in to your account' : 'Start saving on fuel today'}
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            style={styles.inputWrap}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.inputWrap}
          />

          <Button
            title={mode === 'login' ? 'Sign in' : 'Create account'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={styles.submitBtn}
          />
        </View>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.switchLink}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xs },
  logoBlue: { fontSize: font.xxl, fontWeight: '800', color: colors.primary },
  logoRed: { fontSize: font.xxl, fontWeight: '800', color: colors.red },
  tagline: { textAlign: 'center', color: colors.muted, fontSize: font.sm, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.muted, marginBottom: spacing.md },
  inputWrap: { marginBottom: spacing.md },
  submitBtn: { marginTop: spacing.xs },
  switchRow: { marginTop: spacing.lg, alignItems: 'center' },
  switchText: { fontSize: font.sm, color: colors.muted },
  switchLink: { color: colors.primary, fontWeight: '600' },
});
