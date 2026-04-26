import { TextInput, View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, font } from '@/lib/theme';

interface InputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  style?: object;
  multiline?: boolean;
}

export function Input({
  value, onChangeText, placeholder, label, secureTextEntry, keyboardType,
  autoCapitalize = 'none', style, multiline,
}: InputProps) {
  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: font.sm,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.base,
    color: colors.foreground,
    height: 44,
  },
  multiline: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
});
