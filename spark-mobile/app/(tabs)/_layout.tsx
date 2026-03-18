import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotifications } from '@/hooks/useNotifications';
import { useSwipeStore } from '@/store/swipeStore';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

export default function TabsLayout() {
  // Initialize push notifications
  useNotifications();

  const insets = useSafeAreaInsets();
  const COLORS = useColors();
  const { t } = useTranslation();
  const likesCount = useSwipeStore((s) => s.receivedLikes.length);
  const matches = useChatStore((s) => s.matches);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const unreadCount = matches.filter(
    (m) =>
      m.lastMessage &&
      m.lastMessage.isRead === false &&
      m.lastMessage.senderId !== currentUserId
  ).length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tab.discover'),
          headerTitle: 'Spark',
          headerTitleStyle: { fontWeight: 'bold', color: COLORS.primary, fontSize: 24 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: t('tab.likes'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-circle" size={size} color={color} />
          ),
          tabBarBadge: likesCount > 0 ? likesCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            fontSize: 11,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tab.chat'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            fontSize: 11,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tab.nearby'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hide chat from tab bar */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
