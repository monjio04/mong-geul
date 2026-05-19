import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../theme';
import { Text } from './ui';

interface Props {
  title: string;
  subtitle?: string;
  style?: any;
}

export function OnboardingHead({ title, subtitle, style }: Props) {
  const { wp } = useResponsive();
  return (
    <View style={[styles.container, { maxWidth: wp(300) }, style]}>
      <Text style={styles.title} align="left">{title}</Text>
      {subtitle ? <Text style={styles.subtitle} align="left">{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    color: '#1E1E1E',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 33,
    letterSpacing: -0.44,
  },
  subtitle: {
    color: '#93A09A',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22.5,
    letterSpacing: -0.3,
  },
});
