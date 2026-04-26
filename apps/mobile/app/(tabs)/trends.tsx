import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - spacing.md * 2 - spacing.md * 2; // account for scroll padding + card padding
const CHART_HEIGHT = 160;

export default function TrendsScreen() {
  const [state, setState] = useState('CA');
  const [showPicker, setShowPicker] = useState(false);

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['price-history', state],
    queryFn: () => apiClient.getPriceHistory(state),
  });

  const { data: predData } = useQuery({
    queryKey: ['price-prediction', state],
    queryFn: () => apiClient.getPricePrediction(state),
  });

  const { data: commuteData } = useQuery({
    queryKey: ['commute-advice', state],
    queryFn: () => apiClient.getCommuteAdvice(state),
  });

  const history = histData?.history ?? [];
  const prediction = predData?.prediction;
  const advice = commuteData?.advice;

  // Build simple bar chart data from history
  const regularHistory = history
    .filter(h => h.regular != null)
    .slice(-24); // last 24 data points

  const allPrices = regularHistory.map(h => h.regular!).filter(Boolean);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 0.1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Price Trends</Text>
            <Text style={styles.subtitle}>72-hour statewide averages</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPicker(v => !v)} style={styles.statePicker}>
            <Text style={styles.stateText}>{state}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* State picker */}
        {showPicker && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stateScroll}
            contentContainerStyle={styles.stateList}
          >
            {US_STATES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => { setState(s); setShowPicker(false); }}
                style={[styles.stateChip, s === state && styles.stateChipActive]}
              >
                <Text style={[styles.stateChipText, s === state && styles.stateChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Chart */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Regular Gas — {state}</Text>

          {histLoading && <Skeleton height={CHART_HEIGHT} style={{ marginTop: spacing.sm }} />}

          {!histLoading && regularHistory.length === 0 && (
            <Text style={styles.noData}>No price data available for {state}.</Text>
          )}

          {!histLoading && regularHistory.length > 0 && (
            <View style={styles.chart}>
              {/* Y axis labels */}
              <View style={styles.yAxis}>
                <Text style={styles.axisLabel}>{formatPrice(maxPrice)}</Text>
                <Text style={styles.axisLabel}>{formatPrice((maxPrice + minPrice) / 2)}</Text>
                <Text style={styles.axisLabel}>{formatPrice(minPrice)}</Text>
              </View>
              {/* Bars */}
              <View style={styles.bars}>
                {regularHistory.map((h, i) => {
                  const barH = ((h.regular! - minPrice) / priceRange) * (CHART_HEIGHT - 20) + 4;
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <View style={[styles.bar, { height: barH, backgroundColor: colors.primary }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Regular unleaded ($/gal)</Text>
          </View>
        </Card>

        {/* Price prediction */}
        {prediction && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Price Prediction</Text>
            <View style={styles.predRow}>
              <View style={styles.predIcon}>
                <Ionicons
                  name={prediction.direction === 'rising' ? 'trending-up' : prediction.direction === 'falling' ? 'trending-down' : 'remove'}
                  size={24}
                  color={prediction.direction === 'rising' ? colors.destructive : prediction.direction === 'falling' ? colors.green : colors.muted}
                />
              </View>
              <View>
                <Text style={[styles.predValue, {
                  color: prediction.direction === 'rising' ? colors.destructive : prediction.direction === 'falling' ? colors.green : colors.muted,
                }]}>
                  {prediction.direction === 'stable'
                    ? 'Stable prices'
                    : `${prediction.direction === 'rising' ? '+' : '-'}${Math.abs(prediction.predicted_delta * 100).toFixed(1)}¢`}
                </Text>
                <Text style={styles.predSub}>
                  {(prediction.confidence * 100).toFixed(0)}% confident · next {prediction.hours_ahead}h
                </Text>
              </View>
            </View>
            {prediction.reasoning && (
              <Text style={styles.reasoning} numberOfLines={4}>{prediction.reasoning}</Text>
            )}
          </Card>
        )}

        {/* Commute coach */}
        {advice && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Commute Coach</Text>
            <View style={styles.coachGrid}>
              <CoachStat label="Best Day" value={advice.best_day} icon="calendar" />
              <CoachStat label="Best Time" value={advice.best_time} icon="time" />
              <CoachStat
                label="Save/gal"
                value={advice.expected_savings_per_gallon != null ? `$${advice.expected_savings_per_gallon.toFixed(2)}` : '—'}
                icon="cash"
                valueColor={colors.green}
              />
            </View>
            {advice.reasoning && (
              <Text style={styles.reasoning} numberOfLines={4}>{advice.reasoning}</Text>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CoachStat({ label, value, icon, valueColor }: { label: string; value: string; icon: string; valueColor?: string }) {
  return (
    <View style={styles.coachItem}>
      <Ionicons name={icon as never} size={18} color={colors.primary} />
      <Text style={[styles.coachValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={styles.coachLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: font.sm, color: colors.muted },
  statePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.primary}15`, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6,
  },
  stateText: { fontSize: font.base, fontWeight: '700', color: colors.primary },
  stateScroll: { marginBottom: spacing.md },
  stateList: { gap: spacing.xs, paddingHorizontal: 2 },
  stateChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.mutedBg, borderWidth: 1, borderColor: colors.border,
  },
  stateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stateChipText: { fontSize: font.sm, fontWeight: '600', color: colors.muted },
  stateChipTextActive: { color: '#fff' },
  card: { marginBottom: spacing.md },
  cardTitle: { fontSize: font.base, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  noData: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  chart: { flexDirection: 'row', height: CHART_HEIGHT },
  yAxis: { width: 46, justifyContent: 'space-between', paddingVertical: 4, alignItems: 'flex-end', paddingRight: 6 },
  axisLabel: { fontSize: 9, color: colors.muted },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barWrapper: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2, opacity: 0.8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: font.xs, color: colors.muted },
  predRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  predIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.mutedBg,
    alignItems: 'center', justifyContent: 'center',
  },
  predValue: { fontSize: font.xl, fontWeight: '800' },
  predSub: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  reasoning: { fontSize: font.xs, color: colors.muted, lineHeight: 17, marginTop: spacing.xs },
  coachGrid: { flexDirection: 'row', marginBottom: spacing.sm },
  coachItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  coachValue: { fontSize: font.base, fontWeight: '700', color: colors.foreground },
  coachLabel: { fontSize: font.xs, color: colors.muted },
});
