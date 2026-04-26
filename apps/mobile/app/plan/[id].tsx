import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCost, formatPrice, formatMiles } from '@/lib/utils';
import { colors, spacing, font, radius } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'plan' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('plan');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => apiClient.getPlan(id),
  });

  const { data: chatData } = useQuery({
    queryKey: ['chat', id],
    queryFn: () => apiClient.getChatHistory(id),
  });

  useEffect(() => {
    if (chatData?.messages && messages.length === 0) {
      setMessages(chatData.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    }
  }, [chatData]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    let assistantContent = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      for await (const chunk of apiClient.streamChat(id, text)) {
        assistantContent += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantContent };
          return next;
        });
        flatListRef.current?.scrollToEnd({ animated: false });
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong.' };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Fuel Plan</Text>
          {plan && (
            <Text style={styles.date}>
              {new Date(plan.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['plan', 'chat'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Ionicons
              name={t === 'plan' ? 'map' : 'chatbubble'}
              size={16}
              color={tab === t ? colors.primary : colors.muted}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'plan' ? 'Plan' : 'Ask AI'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Plan tab */}
      {tab === 'plan' && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {isLoading && (
            <View style={{ gap: spacing.sm }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={70} />)}
            </View>
          )}

          {plan && (
            <>
              {/* Summary stats */}
              <View style={styles.statsRow}>
                <StatChip icon="cash" label="Total Cost" value={formatCost(plan.total_fuel_cost)} color={colors.primary} />
                <StatChip icon="trending-down" label="Savings" value={formatCost(plan.projected_savings)} color={colors.green} />
                <StatChip icon="navigate" label="Distance" value={formatMiles(plan.total_distance_miles)} color={colors.muted} />
              </View>

              {plan.ai_summary && (
                <Card style={styles.card}>
                  <Text style={styles.aiSummary}>{plan.ai_summary}</Text>
                </Card>
              )}

              {/* Stops */}
              <Text style={styles.stopsTitle}>Fuel Stops</Text>
              {plan.stops?.map((stop, i) => (
                <Card key={i} style={styles.stopCard}>
                  <View style={styles.stopRow}>
                    <View style={styles.stopNum}>
                      <Text style={styles.stopNumText}>{stop.sequence ?? i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>{stop.station?.name ?? 'Station'}</Text>
                      <Text style={styles.stopAddr}>{stop.station?.address ?? ''}</Text>
                      {stop.detour_miles > 0.1 && (
                        <Text style={styles.stopDetour}>+{stop.detour_miles.toFixed(1)} mi detour</Text>
                      )}
                    </View>
                    <View style={styles.stopRight}>
                      <Text style={styles.stopPrice}>{formatPrice(stop.price_per_gallon)}</Text>
                      <Text style={styles.stopGal}>{stop.gallons_to_fill?.toFixed(1)} gal</Text>
                      <Text style={styles.stopCost}>{formatCost(stop.estimated_cost)}</Text>
                    </View>
                  </View>
                </Card>
              ))}

              {plan.ai_reasoning && (
                <Card style={styles.card}>
                  <Text style={styles.reasoningLabel}>AI Reasoning</Text>
                  <Text style={styles.reasoningText}>{plan.ai_reasoning}</Text>
                </Card>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.chatList}
            ListEmptyComponent={
              <Text style={styles.chatEmpty}>Ask me anything about your fuel plan.</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                  {item.content || (streaming && item.role === 'assistant' ? '…' : '')}
                </Text>
              </View>
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your plan…"
              placeholderTextColor={colors.muted}
              style={styles.chatInput}
              editable={!streaming}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={sendMessage} disabled={streaming || !input.trim()} style={styles.sendBtn}>
              {streaming
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon as never} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.md, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  date: { fontSize: font.xs, color: colors.muted, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: font.sm, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.primary },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statChip: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center', gap: 2 },
  statValue: { fontSize: font.md, fontWeight: '800' },
  statLabel: { fontSize: font.xs, color: colors.muted },
  card: { marginBottom: spacing.md },
  aiSummary: { fontSize: font.sm, color: colors.foreground, lineHeight: 20 },
  stopsTitle: { fontSize: font.base, fontWeight: '700', color: colors.foreground, marginBottom: spacing.sm },
  stopCard: { marginBottom: spacing.sm, padding: spacing.md },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stopNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { fontSize: font.xs, fontWeight: '700', color: colors.primary },
  stopName: { fontSize: font.sm, fontWeight: '600', color: colors.foreground },
  stopAddr: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  stopDetour: { fontSize: font.xs, color: colors.amber, marginTop: 2 },
  stopRight: { alignItems: 'flex-end' },
  stopPrice: { fontSize: font.sm, fontWeight: '700', color: colors.foreground },
  stopGal: { fontSize: font.xs, color: colors.muted },
  stopCost: { fontSize: font.sm, fontWeight: '700', color: colors.primary },
  reasoningLabel: { fontSize: font.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: spacing.xs },
  reasoningText: { fontSize: font.xs, color: colors.muted, lineHeight: 17 },
  chatList: { padding: spacing.md, paddingBottom: spacing.md, flexGrow: 1 },
  chatEmpty: { textAlign: 'center', color: colors.muted, fontSize: font.sm, marginTop: spacing.xl },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm },
  bubbleUser: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.mutedBg, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: font.sm, color: colors.foreground, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
  },
  chatInput: {
    flex: 1, height: 40, backgroundColor: colors.mutedBg, borderRadius: radius.full,
    paddingHorizontal: spacing.md, fontSize: font.sm, color: colors.foreground,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
});
