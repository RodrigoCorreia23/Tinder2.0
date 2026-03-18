import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function ChatLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.backgroundDark },
        headerTintColor: C.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
