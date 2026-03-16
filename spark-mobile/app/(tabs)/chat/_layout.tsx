import { Stack } from 'expo-router';
import { COLORS } from '@/utils/constants';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
