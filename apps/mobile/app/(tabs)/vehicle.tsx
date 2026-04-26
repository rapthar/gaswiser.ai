import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { VehicleDb } from '@gaswiser/api-client';

export default function VehicleScreen() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<VehicleDb | null>(null);
  const [tank, setTank] = useState(50);
  const [showSearch, setShowSearch] = useState(false);

  const { data: currentData, isLoading } = useQuery({
    queryKey: ['user-vehicle'],
    queryFn: () => apiClient.getUserVehicle(),
  });

  const { data: searchData } = useQuery({
    queryKey: ['vehicles', q],
    queryFn: () => apiClient.searchVehicles(q, 10),
    enabled: q.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No vehicle selected');
      return apiClient.setUserVehicle(selected.id);
    },
    onSuccess: () => {
      Alert.alert('Saved', 'Vehicle saved!');
      setShowSearch(false);
      setSelected(null);
      setQ('');
      qc.invalidateQueries({ queryKey: ['user-vehicle'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const tankMutation = useMutation({
    mutationFn: () => {
      const vid = selected?.id ?? currentData?.userVehicle?.vehicle_db_id;
      if (!vid) throw new Error('No vehicle');
      return apiClient.updateTankLevel(vid, tank);
    },
    onSuccess: () => {
      Alert.alert('Updated', 'Tank level updated!');
      qc.invalidateQueries({ queryKey: ['user-vehicle'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const current = currentData?.vehicle;

  const tankColor = tank <= 20 ? colors.destructive : tank <= 40 ? colors.amber : colors.green;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Vehicle</Text>
        <Text style={styles.subtitle}>Set your vehicle for personalized planning.</Text>

        {isLoading ? (
          <Skeleton height={100} style={{ marginBottom: spacing.md }} />
        ) : current ? (
          <Card style={styles.card}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>
                  {current.year} {current.make} {current.model}{current.trim ? ` ${current.trim}` : ''}
                </Text>
                <Text style={styles.vehicleSub}>
                  {[
                    current.mpg_combined != null ? `${current.mpg_combined} mpg` : null,
                    current.fuel_type,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              {current.mpg_city != null && <MpgStat label="City" value={current.mpg_city} />}
              {current.mpg_highway != null && <MpgStat label="Hwy" value={current.mpg_highway} />}
              {current.tank_size_gallons != null && <MpgStat label="Tank (gal)" value={current.tank_size_gallons} />}
            </View>
          </Card>
        ) : (
          <Card style={[styles.card, styles.emptyCard]}>
            <Ionicons name="car-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyText}>No vehicle set yet</Text>
          </Card>
        )}

        {/* Search */}
        <TouchableOpacity onPress={() => setShowSearch(v => !v)} style={styles.sectionToggle}>
          <Text style={styles.sectionTitle}>{showSearch ? '– ' : '+ '}Change Vehicle</Text>
        </TouchableOpacity>

        {showSearch && (
          <>
            <Input
              value={q}
              onChangeText={setQ}
              placeholder="Search (e.g. 2022 Toyota Camry)…"
              style={{ marginBottom: spacing.sm }}
            />

            {q.length >= 2 && (
              <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
                {searchData?.vehicles?.length === 0 && (
                  <Text style={styles.noResults}>No vehicles found</Text>
                )}
                {searchData?.vehicles?.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => { setSelected(v); setQ(`${v.year} ${v.make} ${v.model}`); setShowSearch(false); }}
                    style={[styles.vehicleItem, selected?.id === v.id && styles.vehicleItemActive]}
                  >
                    <Text style={styles.vehicleItemName}>{v.year} {v.make} {v.model}{v.trim ? ` ${v.trim}` : ''}</Text>
                    <Text style={styles.vehicleItemSub}>
                      {[v.mpg_combined != null ? `${v.mpg_combined} mpg` : null, v.fuel_type].filter(Boolean).join(' · ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <Button
              title="Save Vehicle"
              onPress={() => saveMutation.mutate()}
              disabled={!selected}
              loading={saveMutation.isPending}
              fullWidth
              style={{ marginBottom: spacing.md }}
            />
          </>
        )}

        {/* Tank slider */}
        {(current || selected) && (
          <>
            <Text style={styles.sectionTitle}>Tank Level</Text>
            <Card style={styles.card}>
              <View style={styles.tankHeader}>
                <Text style={styles.tankLabel}>Current fuel level</Text>
                <Text style={[styles.tankValue, { color: tankColor }]}>{tank}%</Text>
              </View>

              <View style={styles.tankTrack}>
                <View style={[styles.tankFill, { width: `${tank}%` as `${number}%`, backgroundColor: tankColor }]} />
              </View>

              <View style={styles.tankButtons}>
                {[0, 25, 50, 75, 100].map(v => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setTank(v)}
                    style={[styles.tankBtn, tank === v && styles.tankBtnActive]}
                  >
                    <Text style={[styles.tankBtnText, tank === v && styles.tankBtnTextActive]}>{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Update Tank Level"
                onPress={() => tankMutation.mutate()}
                loading={tankMutation.isPending}
                variant="outline"
                fullWidth
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MpgStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: font.md, fontWeight: '700', color: colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: font.xs, color: colors.muted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: font.sm, color: colors.muted, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  vehicleIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: font.base, fontWeight: '700', color: colors.foreground },
  vehicleSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.muted, fontSize: font.sm },
  sectionToggle: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.base, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  noResults: { padding: spacing.md, color: colors.muted, textAlign: 'center' },
  vehicleItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  vehicleItemActive: { backgroundColor: `${colors.primary}10` },
  vehicleItemName: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
  vehicleItemSub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  tankLabel: { fontSize: font.sm, color: colors.muted },
  tankValue: { fontSize: font.md, fontWeight: '700' },
  tankTrack: { height: 10, backgroundColor: colors.mutedBg, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  tankFill: { height: '100%', borderRadius: radius.full, minWidth: 4 },
  tankButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  tankBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.mutedBg },
  tankBtnActive: { backgroundColor: colors.primary },
  tankBtnText: { fontSize: font.xs, color: colors.muted, fontWeight: '600' },
  tankBtnTextActive: { color: '#fff' },
});
