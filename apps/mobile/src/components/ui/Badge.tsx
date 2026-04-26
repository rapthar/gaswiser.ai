import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, font } from '@/lib/theme';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

interface BadgeProps {
  label: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  default: { bg: '#DBEAFE', text: colors.primary },
  success: { bg: '#DCFCE7', text: colors.green },
  warning: { bg: '#FEF3C7', text: colors.amber },
  destructive: { bg: '#FEE2E2', text: colors.destructive },
  outline: { bg: 'transparent', text: colors.muted },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: {
    fontSize: font.xs,
    fontWeight: '600',
  },
});
