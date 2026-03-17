import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '@/store/chatStore';
import { COLORS } from '@/utils/constants';
import { Match } from '@/types';

export default function MatchesScreen() {
  const router = useRouter();
  const { matches, isLoading, loadMatches } = useChatStore();

  // Reload matches every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  // Split into new matches (no messages) and active conversations
  // Deduplicate matches by id
  const uniqueMatches = matches.filter(
    (m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx
  );
  const newMatches = uniqueMatches.filter((m) => !m.lastMessage);
  const conversations = uniqueMatches.filter((m) => m.lastMessage);

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const openChat = (matchId: string) => {
    router.push(`/(tabs)/chat/${matchId}`);
  };

  const renderNewMatch = (match: Match) => {
    const isExpiring = match.expiresAt &&
      new Date(match.expiresAt).getTime() - Date.now() < 6 * 60 * 60 * 1000;
    const timeRemaining = getTimeRemaining(match.expiresAt);

    return (
      <TouchableOpacity
        key={match.id}
        style={styles.newMatchCard}
        onPress={() => openChat(match.id)}
      >
        <View style={styles.newMatchImageContainer}>
          <Image
            source={{
              uri: match.otherUser.photos[0]?.url || 'https://placehold.co/100x100/FF6B6B/ffffff?text=S',
            }}
            style={styles.newMatchImage}
          />
          {match.compatibilityScore > 0 && (
            <View style={styles.newMatchScore}>
              <Text style={styles.newMatchScoreText}>
                {Math.round(match.compatibilityScore)}%
              </Text>
            </View>
          )}
          {match.otherUser.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4FC3F7" />
            </View>
          )}
        </View>
        <Text style={styles.newMatchName} numberOfLines={1}>
          {match.otherUser.firstName}
        </Text>
        {timeRemaining && (
          <View style={[styles.timerBadge, isExpiring && styles.timerExpiring]}>
            <Ionicons
              name="time-outline"
              size={9}
              color={isExpiring ? COLORS.danger : COLORS.textLight}
            />
            <Text style={[styles.timerText, isExpiring && styles.timerTextExpiring]}>
              {timeRemaining}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }: { item: Match }) => {
    const isExpiring = item.expiresAt &&
      new Date(item.expiresAt).getTime() - Date.now() < 6 * 60 * 60 * 1000;
    const timeRemaining = getTimeRemaining(item.expiresAt);

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() => openChat(item.id)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: item.otherUser.photos[0]?.url || 'https://placehold.co/100x100/FF6B6B/ffffff?text=S',
            }}
            style={styles.avatar}
          />
          {item.compatibilityScore > 0 && (
            <View style={styles.scoreRing}>
              <Text style={styles.scoreRingText}>
                {Math.round(item.compatibilityScore)}%
              </Text>
            </View>
          )}
          {item.otherUser.isVerified && (
            <View style={styles.verifiedBadgeConvo}>
              <Ionicons name="checkmark-circle" size={18} color="#4FC3F7" />
            </View>
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.nameRow}>
            <View style={styles.nameWithBadge}>
              <Text style={styles.conversationName}>{item.otherUser.firstName}</Text>
              {item.otherUser.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#4FC3F7" />
              )}
            </View>
            {item.lastMessage && (
              <Text style={styles.timeText}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.content || ''}
          </Text>

          {timeRemaining && (
            <View style={[styles.timerBadgeSmall, isExpiring && styles.timerExpiring]}>
              <Ionicons
                name="time-outline"
                size={10}
                color={isExpiring ? COLORS.danger : COLORS.textLight}
              />
              <Text style={[styles.timerText, isExpiring && styles.timerTextExpiring]}>
                {timeRemaining}
              </Text>
            </View>
          )}
        </View>

        {item.lastMessage && !item.lastMessage.isRead && (
          <View style={styles.unreadDot} />
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>No matches yet</Text>
        <Text style={styles.emptySubText}>Keep swiping to find your spark!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ListHeaderComponent={
          newMatches.length > 0 ? (
            <View style={styles.newMatchesSection}>
              <Text style={styles.sectionTitle}>New Matches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.newMatchesRow}>
                  {newMatches.map(renderNewMatch)}
                </View>
              </ScrollView>
              {conversations.length > 0 && (
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Messages</Text>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        onRefresh={loadMatches}
        refreshing={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
  },
  list: {
    flexGrow: 1,
  },
  // New matches horizontal section
  newMatchesSection: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  newMatchesRow: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 16,
  },
  newMatchCard: {
    alignItems: 'center',
    width: 76,
    gap: 4,
  },
  newMatchImageContainer: {
    position: 'relative',
  },
  newMatchImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  newMatchScore: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  newMatchScoreText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
  newMatchName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  // Conversations list
  conversationRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  scoreRing: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  scoreRingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  conversationInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  timerBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  timerExpiring: {
    backgroundColor: '#FFF0F0',
  },
  timerText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  timerTextExpiring: {
    color: COLORS.danger,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  verifiedBadgeConvo: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: '#fff',
    borderRadius: 9,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
