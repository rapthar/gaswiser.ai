import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCost, formatMiles } from '@/lib/utils';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function PlansScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.getPlans(),
  });

  const plans = data?.plans ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fuel Plans</Text>
            <Text style={styles.subtitle}>AI-optimized fuel stop history</Text>
          </View>
          <Button
            title="New"
            onPress={() => router.push('/plan/new')}
            icon={<Ionicons name="add" size={16} color="#fff" />}
          />
        </View>

        {isLoading && (
          <View style={{ gap: spacing.sm }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={80} />)}
          </View>
        )}

        {!isLoading && plans.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptySub}>Generate your first AI fuel plan</Text>
            <Button
              title="Generate Plan"
              onPress={() => router.push('/plan/new')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        {plans.map(plan => (
          <TouchableOpacity key={plan.id} onPress={() => router.push(`/plan/${plan.id}`)}>
            <Card style={styles.planCard}>
              <View style={styles.planRow}>
                <View style={styles.planIcon}>
                  <Ionicons name="flash" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planDate}>
                    {new Date(plan.generated_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                  <View style={styles.planMeta}>
                    {plan.total_distance_miles != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="navigate-outline" size={11} color={colors.muted} />
                        <Text style={styles.metaText}>{formatMiles(plan.total_distance_miles)}</Text>
                      </View>
                    )}
                    {plan.projected_savings != null && plan.projected_savings > 0.01 && (
                      <View style={[styles.metaChip, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="trending-down-outline" size={11} color={colors.green} />
                        <Text style={[styles.metaText, { color: colors.green }]}>
                          {formatCost(plan.projected_savings)} saved
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.planRight}>
                  <Text style={styles.planCost}>{formatCost(plan.total_fuel_cost)}</Text>
                  <Text style={styles.planCostLabel}>total</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginTop: 2 }} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: font.sm, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.xs },
  emptyTitle: { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  emptySub: { fontSize: font.sm, color: colors.muted },
  planCard: { marginBottom: spacing.sm, padding: spacing.md },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center',
  },
  planDate: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
  planMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.mutedBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  metaText: { fontSize: font.xs, color: colors.muted },
  planRight: { alignItems: 'flex-end' },
  planCost: { fontSize: font.lg, fontWeight: '800', color: colors.foreground },
  planCostLabel: { fontSize: font.xs, color: colors.muted },
});
