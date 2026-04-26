import { View, StyleSheet } from 'react-native';
import { colors, radius } from '@/lib/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  style?: object;
}

export function Skeleton({ width = '100%', height, style }: SkeletonProps) {
  return (
    <View style={[styles.skeleton, { width: width as number, height }, style]} />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.mutedBg,
    borderRadius: radius.md,
  },
});
