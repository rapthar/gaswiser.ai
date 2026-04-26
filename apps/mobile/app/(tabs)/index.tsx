import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPrice, priceBand } from '@/lib/utils';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const PIN_COLORS = { cheap: colors.priceCheap, mid: colors.priceMid, high: colors.priceHigh };
const DEFAULT_STATE = 'CA';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      setLocationGranted(true);
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      });
    });
  }, []);

  const { data: nearbyData, isLoading: nearbyLoading, refetch } = useQuery({
    queryKey: ['nearby', coords?.lat, coords?.lng],
    queryFn: () => coords ? apiClient.getNearbyStations(coords.lat, coords.lng, 5, 'regular') : Promise.resolve({ stations: [], count: 0 }),
    enabled: !!coords,
  });

  const { data: predData } = useQuery({
    queryKey: ['price-prediction', DEFAULT_STATE],
    queryFn: () => apiClient.getPricePrediction(DEFAULT_STATE),
  });

  const stations = nearbyData?.stations ?? [];
  const priced = stations.filter(s => s.regular_price != null);
  const avgPrice = priced.length ? priced.reduce((s, st) => s + (st.regular_price ?? 0), 0) / priced.length : 0;
  const cheapest = [...priced].sort((a, b) => (a.regular_price ?? 0) - (b.regular_price ?? 0))[0];

  const prediction = predData?.prediction;

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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {user?.email ? `Hi, ${user.email.split('@')[0]}!` : 'Gas Wiser'}
            </Text>
            <Text style={styles.subGreeting}>Fuel intelligence overview</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="location"
            label="Nearby"
            value={nearbyLoading ? '…' : `${stations.length}`}
            color={colors.primary}
          />
          <StatCard
            icon="trending-down"
            label="Cheapest"
            value={cheapest ? formatPrice(cheapest.regular_price) : '—'}
            color={colors.green}
          />
          <StatCard
            icon="flame"
            label="Avg Price"
            value={avgPrice > 0 ? formatPrice(avgPrice) : '—'}
            color={colors.amber}
          />
        </View>

        {/* Map */}
        {coords && (
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={{
                latitude: coords.lat,
                longitude: coords.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation
            >
              {stations.map(s => {
                if (!s.latitude || !s.longitude) return null;
                const band = s.regular_price ? priceBand(s.regular_price, avgPrice) : 'mid';
                return (
                  <Marker
                    key={s.id}
                    coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                    pinColor={PIN_COLORS[band]}
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutName}>{s.store_name}</Text>
                        <Text style={styles.calloutPrice}>{formatPrice(s.regular_price)}</Text>
                        <Text style={styles.calloutAddr}>{s.street_address}</Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        )}

        {!locationGranted && (
          <Card style={styles.locationCard}>
            <Ionicons name="location-outline" size={20} color={colors.muted} />
            <Text style={styles.locationText}>Enable location for nearby stations</Text>
          </Card>
        )}

        {/* Price prediction */}
        {prediction && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Price Prediction</Text>
              <View style={[styles.dirBadge, {
                backgroundColor: prediction.direction === 'rising' ? '#FEE2E2'
                  : prediction.direction === 'falling' ? '#DCFCE7' : colors.mutedBg,
              }]}>
                <Text style={[styles.dirText, {
                  color: prediction.direction === 'rising' ? colors.destructive
                    : prediction.direction === 'falling' ? colors.green : colors.muted,
                }]}>
                  {prediction.direction === 'stable' ? 'Stable'
                    : `${prediction.direction === 'rising' ? '↑' : '↓'} ${Math.abs(prediction.predicted_delta * 100).toFixed(1)}¢`}
                </Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>
              {(prediction.confidence * 100).toFixed(0)}% confident · next {prediction.hours_ahead}h · {DEFAULT_STATE}
            </Text>
            {prediction.reasoning && (
              <Text style={styles.cardReasoning} numberOfLines={3}>{prediction.reasoning}</Text>
            )}
          </Card>
        )}

        {/* Best deal */}
        {cheapest && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Best Deal Nearby</Text>
            <View style={styles.dealRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealName}>{cheapest.store_name}</Text>
                <Text style={styles.dealAddr}>{cheapest.street_address}, {cheapest.city}</Text>
                {cheapest.distance_miles != null && (
                  <Text style={styles.dealDist}>{cheapest.distance_miles.toFixed(1)} mi away</Text>
                )}
              </View>
              <Text style={styles.dealPrice}>{formatPrice(cheapest.regular_price)}</Text>
            </View>
          </Card>
        )}

        {/* CTA */}
        <Button
          title="Generate Fuel Plan"
          onPress={() => router.push('/plan/new')}
          fullWidth
          style={styles.cta}
          icon={<Ionicons name="flash" size={18} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as never} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { fontSize: font.lg, fontWeight: '700', color: colors.foreground },
  subGreeting: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  signOutBtn: { padding: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm,
    alignItems: 'center', borderWidth: 1,
  },
  statIcon: { borderRadius: radius.sm, padding: 6, marginBottom: spacing.xs },
  statValue: { fontSize: font.md, fontWeight: '700', color: colors.foreground },
  statLabel: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  mapWrapper: { height: 220, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  map: { flex: 1 },
  callout: { padding: spacing.xs, minWidth: 140 },
  calloutName: { fontWeight: '700', fontSize: font.sm },
  calloutPrice: { color: colors.green, fontWeight: '700', fontSize: font.md },
  calloutAddr: { color: colors.muted, fontSize: font.xs, marginTop: 2 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  locationText: { color: colors.muted, fontSize: font.sm },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: font.base, fontWeight: '700', color: colors.foreground },
  cardMeta: { fontSize: font.xs, color: colors.muted, marginBottom: 6 },
  cardReasoning: { fontSize: font.xs, color: colors.muted, lineHeight: 17 },
  dirBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  dirText: { fontSize: font.sm, fontWeight: '700' },
  dealRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: spacing.sm },
  dealName: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
  dealAddr: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  dealDist: { fontSize: font.xs, color: colors.primary, marginTop: 2 },
  dealPrice: { fontSize: font.xl, fontWeight: '800', color: colors.green },
  cta: { marginTop: spacing.xs },
});
