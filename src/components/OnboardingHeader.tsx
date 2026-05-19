import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../theme';
import { Text } from './ui';

interface Props {
  title: string;
  subtitle: string;
  style?: any;
}

export function OnboardingHeader({ title, subtitle, style }: Props) {
  const { wp } = useResponsive();
  return (
    <View style={[styles.container, { maxWidth: wp(270) }, style]}>
      <Text style={styles.title} align="center">{title}</Text>
      <Text style={styles.subtitle} align="center">{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 17,
  },
  title: {
    color: '#000',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.48,
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22.5,
    letterSpacing: -0.3,
  },
});
