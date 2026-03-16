import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { useSwipeStore } from '@/store/swipeStore';
import { ReceivedLike } from '@/types';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

export default function LikesScreen() {
  const { receivedLikes: likes, likesLoading: loading, loadReceivedLikes } = useSwipeStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Reload likes every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadReceivedLikes();
    }, [])
  );

  const handleCardPress = () => {
    setShowPremiumModal(true);
  };

  const renderLikeCard = ({ item }: { item: ReceivedLike }) => {
    const photoUrl = item.photos[0]?.url || `https://placehold.co/300x400/FF6B6B/ffffff?text=${item.firstName[0]}`;
    const timeAgo = getTimeAgo(item.likedAt);

    return (
      <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.9}>
        {/* Blurred photo */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUrl }} style={styles.photo} blurRadius={Platform.OS === 'web' ? 20 : 25} />

          {/* Lock icon overlay */}
          <View style={styles.lockOverlay}>
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
            </View>
          </View>

          {/* Liked time badge */}
          <View style={styles.timeBadge}>
            <Ionicons name="heart" size={10} color={COLORS.primary} />
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>

        {/* Blurred name */}
        <View style={styles.nameContainer}>
          <Text style={styles.name}>
            {'●●●●●●●'}
          </Text>
          <Text style={styles.age}>, {item.age}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <View style={styles.countBadge}>
          <Ionicons name="heart" size={18} color={COLORS.primary} />
          <Text style={styles.countText}>{likes.length}</Text>
        </View>
        <Text style={styles.headerTitle}>
          {likes.length === 1 ? 'person likes you' : 'people like you'}
        </Text>
      </View>

      {likes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No likes yet</Text>
          <Text style={styles.emptySubText}>
            When someone likes you, they'll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={likes}
          keyExtractor={(item) => item.id}
          renderItem={renderLikeCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          onRefresh={loadReceivedLikes}
          refreshing={loading}
        />
      )}

      {/* Premium modal */}
      <Modal visible={showPremiumModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModal}>
            {/* Gold gradient header */}
            <View style={styles.premiumHeader}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={styles.premiumTitle}>Spark Premium</Text>
              <Text style={styles.premiumSubtitle}>
                See who likes you and match instantly
              </Text>
            </View>

            {/* Features list */}
            <View style={styles.featuresList}>
              <View style={styles.featureRow}>
                <Ionicons name="eye" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>See who liked you</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="flash" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Unlimited swipes</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="arrow-undo" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Rewind last swipe</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Extended range (500m)</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="rocket" size={20} color={COLORS.primary} />
                <Text style={styles.featureText}>Priority in discover</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.premiumButton}
              onPress={() => {
                setShowPremiumModal(false);
                if (Platform.OS === 'web') {
                  window.alert('Coming soon! Premium subscriptions will be available in a future update.');
                } else {
                  Alert.alert('Coming Soon', 'Premium subscriptions will be available in a future update.');
                }
              }}
            >
              <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={styles.closeModalText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  grid: {
    padding: 16,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    width: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  photoContainer: {
    width: '100%',
    height: CARD_SIZE * 1.3,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '500',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
    letterSpacing: 2,
  },
  age: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Premium modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    overflow: 'hidden',
  },
  premiumHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#FFF8F0',
  },
  premiumIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  featuresList: {
    padding: 24,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text,
  },
  premiumButton: {
    marginHorizontal: 24,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  closeModalText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
});
