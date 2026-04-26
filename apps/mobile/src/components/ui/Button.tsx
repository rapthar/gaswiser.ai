import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing, font } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: object;
}

export function Button({
  title, onPress, variant = 'primary', disabled, loading, icon, fullWidth, style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: 42,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.mutedBg },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  text: { fontSize: font.sm, fontWeight: '600' },
  primaryText: { color: '#fff' },
  secondaryText: { color: colors.foreground },
  outlineText: { color: colors.foreground },
  ghostText: { color: colors.primary },
});
