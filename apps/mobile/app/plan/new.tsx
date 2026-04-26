import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { VehicleDb } from '@gaswiser/api-client';

type FuelGrade = 'regular' | 'midgrade' | 'premium' | 'diesel';

export default function NewPlanScreen() {
  const router = useRouter();
  const [waypoints, setWaypoints] = useState([{ address: '' }, { address: '' }]);
  const [fuelGrade, setFuelGrade] = useState<FuelGrade>('regular');
  const [tankLevel, setTankLevel] = useState(50);
  const [maxDetour, setMaxDetour] = useState(3);
  const [loading, setLoading] = useState(false);

  // Get user's primary vehicle
  const { data: vehicleData } = useQuery({
    queryKey: ['user-vehicle'],
    queryFn: () => apiClient.getUserVehicle(),
  });

  const vehicle = vehicleData?.vehicle;

  const addWaypoint = () => setWaypoints(prev => [...prev, { address: '' }]);
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  const updateWaypoint = (i: number, address: string) =>
    setWaypoints(prev => prev.map((w, idx) => idx === i ? { address } : w));

  const generate = async () => {
    if (!vehicle) {
      Alert.alert('No Vehicle', 'Please set your vehicle on the Vehicle tab first.');
      return;
    }
    const filled = waypoints.filter(w => w.address.trim());
    if (filled.length < 2) {
      Alert.alert('Waypoints', 'Please enter at least a start and end address.');
      return;
    }

    setLoading(true);
    try {
      const plan = await apiClient.generatePlan({
        vehicle_db_id: vehicle.id,
        tank_level_percent: tankLevel,
        fuel_grade: fuelGrade,
        max_detour_miles: maxDetour,
        waypoints: filled as never,
      });
      router.replace(`/plan/${plan.id}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const grades: FuelGrade[] = ['regular', 'midgrade', 'premium', 'diesel'];
  const tankColor = tankLevel <= 20 ? colors.destructive : tankLevel <= 40 ? colors.amber : colors.green;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>New Fuel Plan</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Vehicle */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Vehicle</Text>
          {vehicle ? (
            <View style={styles.vehicleRow}>
              <Ionicons name="car" size={18} color={colors.primary} />
              <View>
                <Text style={styles.vehicleName}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
                {vehicle.mpg_combined != null && (
                  <Text style={styles.vehicleSub}>{vehicle.mpg_combined} mpg combined</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noVehicle}>No vehicle set — go to the Vehicle tab first</Text>
          )}
        </Card>

        {/* Route */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Route Waypoints</Text>
          {waypoints.map((w, i) => (
            <View key={i} style={styles.waypointRow}>
              <View style={styles.waypointDot}>
                <Text style={styles.waypointNum}>{i + 1}</Text>
              </View>
              <Input
                value={w.address}
                onChangeText={addr => updateWaypoint(i, addr)}
                placeholder={i === 0 ? 'Start address…' : i === waypoints.length - 1 ? 'Destination…' : 'Via…'}
                style={{ flex: 1 }}
                autoCapitalize="words"
              />
              {waypoints.length > 2 && (
                <TouchableOpacity onPress={() => removeWaypoint(i)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addWaypoint} style={styles.addWaypointBtn}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addWaypointText}>Add stop</Text>
          </TouchableOpacity>
        </Card>

        {/* Fuel grade */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Fuel Grade</Text>
          <View style={styles.gradeRow}>
            {grades.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => setFuelGrade(g)}
                style={[styles.gradeBtn, fuelGrade === g && styles.gradeBtnActive]}
              >
                <Text style={[styles.gradeBtnText, fuelGrade === g && styles.gradeBtnTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Tank level */}
        <Card style={styles.card}>
          <View style={styles.tankHeader}>
            <Text style={styles.sectionLabel}>Tank Level</Text>
            <Text style={[styles.tankValue, { color: tankColor }]}>{tankLevel}%</Text>
          </View>
          <View style={styles.tankTrack}>
            <View style={[styles.tankFill, { width: `${tankLevel}%` as `${number}%`, backgroundColor: tankColor }]} />
          </View>
          <View style={styles.tankBtns}>
            {[0, 25, 50, 75, 100].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => setTankLevel(v)}
                style={[styles.tankBtn, tankLevel === v && styles.tankBtnActive]}
              >
                <Text style={[styles.tankBtnText, tankLevel === v && styles.tankBtnTextActive]}>{v}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Max detour */}
        <Card style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={styles.sectionLabel}>Max Detour</Text>
          <View style={styles.detourRow}>
            <TouchableOpacity onPress={() => setMaxDetour(d => Math.max(0, d - 1))} style={styles.detourBtn}>
              <Ionicons name="remove" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.detourValue}>{maxDetour} mi</Text>
            <TouchableOpacity onPress={() => setMaxDetour(d => Math.min(20, d + 1))} style={styles.detourBtn}>
              <Ionicons name="add" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          title={loading ? 'Optimizing route…' : 'Generate Fuel Plan'}
          onPress={generate}
          loading={loading}
          disabled={!vehicle}
          fullWidth
          icon={loading ? undefined : <Ionicons name="flash" size={18} color="#fff" />}
          style={styles.generateBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  card: { marginBottom: spacing.md },
  sectionLabel: { fontSize: font.sm, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vehicleName: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
  vehicleSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  noVehicle: { fontSize: font.sm, color: colors.muted },
  waypointRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  waypointDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center',
  },
  waypointNum: { fontSize: font.xs, fontWeight: '700', color: colors.primary },
  removeBtn: { padding: 4 },
  addWaypointBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  addWaypointText: { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  gradeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  gradeBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md,
    backgroundColor: colors.mutedBg, borderWidth: 1, borderColor: colors.border,
  },
  gradeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  gradeBtnText: { fontSize: font.sm, fontWeight: '600', color: colors.muted },
  gradeBtnTextActive: { color: '#fff' },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  tankValue: { fontSize: font.base, fontWeight: '700' },
  tankTrack: { height: 10, backgroundColor: colors.mutedBg, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  tankFill: { height: '100%', borderRadius: radius.full, minWidth: 4 },
  tankBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  tankBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.mutedBg },
  tankBtnActive: { backgroundColor: colors.primary },
  tankBtnText: { fontSize: font.xs, color: colors.muted, fontWeight: '600' },
  tankBtnTextActive: { color: '#fff' },
  detourRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detourBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.mutedBg, alignItems: 'center', justifyContent: 'center',
  },
  detourValue: { fontSize: font.base, fontWeight: '700', color: colors.foreground, width: 48, textAlign: 'center' },
  generateBtn: { marginTop: spacing.xs },
});
