import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function ChatLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.background },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', color: '#FFFFFF' },
        headerShadowVisible: false,
      }}
    />
  );
}
