import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function AuthLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
      }}
    />
  );
}
