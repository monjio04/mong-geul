import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Memo'>;

export default function MemoScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>메모 화면</Text>
      <Text style={styles.subtitle}>걱정 타임 전까지 메모 추가 가능 (디자인 연결 예정)</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#aaa', marginBottom: 40 },
  button: { backgroundColor: '#4A90E2', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
