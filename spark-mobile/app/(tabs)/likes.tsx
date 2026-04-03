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
import { useColors } from '@/hooks/useColors';
import { useSwipeStore } from '@/store/swipeStore';
import { useAuthStore } from '@/store/authStore';
import { ReceivedLike } from '@/types';
import * as userService from '@/services/user.service';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 2;

export default function LikesScreen() {
  const C = useColors();
  const { receivedLikes: likes, likesLoading: loading, loadReceivedLikes } = useSwipeStore();
  const { user, refreshUser } = useAuthStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activatingPremium, setActivatingPremium] = useState(false);

  const isPremium = user?.isPremium === true;

  // Reload likes every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadReceivedLikes();
    }, [])
  );

  const handleCardPress = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
    }
  };

  const handleActivatePremium = async () => {
    setActivatingPremium(true);
    try {
      await userService.activatePremium();
      await refreshUser();
      setShowPremiumModal(false);
      if (Platform.OS === 'web') {
        window.alert('Premium activated! You can now see who liked you.');
      } else {
        Alert.alert('Premium Activated', 'You can now see who liked you!');
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Coming soon! Premium subscriptions will be available in a future update.');
      } else {
        Alert.alert('Coming Soon', 'Premium subscriptions will be available in a future update.');
      }
    } finally {
      setActivatingPremium(false);
    }
  };

  const renderLikeCard = ({ item }: { item: ReceivedLike }) => {
    const photoUrl = item.photos[0]?.url || `https://placehold.co/300x400/FF6B6B/ffffff?text=${item.firstName[0]}`;
    const timeAgo = getTimeAgo(item.likedAt);

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: C.card }]} onPress={handleCardPress} activeOpacity={0.9}>
        {/* Photo - blurred for non-premium, clear for premium */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            blurRadius={isPremium ? 0 : (Platform.OS === 'web' ? 20 : 25)}
          />

          {/* Lock icon overlay - only for non-premium */}
          {!isPremium && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
              </View>
            </View>
          )}

          {/* Super Like badge */}
          {item.isSuperLike && (
            <View style={styles.superLikeBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.superLikeBadgeText}>Super Like</Text>
            </View>
          )}

          {/* Liked time badge */}
          <View style={styles.timeBadge}>
            <Ionicons name="heart" size={10} color={COLORS.primary} />
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>

        {/* Name - hidden for non-premium, visible for premium */}
        <View style={styles.nameContainer}>
          {isPremium ? (
            <>
              <Text style={[styles.nameClear, { color: C.text }]}>{item.firstName}</Text>
              <Text style={[styles.age, { color: C.textLight }]}>, {item.age}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.name, { color: C.textLight }]}>{'●●●●●●●'}</Text>
              <Text style={[styles.age, { color: C.textLight }]}>, {item.age}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header info */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View style={styles.countBadge}>
          <Ionicons name="heart" size={18} color={COLORS.primary} />
          <Text style={styles.countText}>{likes.length}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {likes.length === 1 ? 'person likes you' : 'people like you'}
        </Text>
        {isPremium && (
          <View style={styles.premiumBadgeSmall}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.premiumBadgeSmallText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Non-premium banner */}
      {!isPremium && likes.length > 0 && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => setShowPremiumModal(true)}
        >
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.upgradeBannerText}>Upgrade to Spark Premium to see who likes you</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFD700" />
        </TouchableOpacity>
      )}

      {likes.length === 0 ? (
        <View style={[styles.center, { backgroundColor: C.background }]}>
          <Ionicons name="heart-outline" size={64} color={C.textLight} />
          <Text style={[styles.emptyText, { color: C.text }]}>No likes yet</Text>
          <Text style={[styles.emptySubText, { color: C.textLight }]}>
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
          <View style={[styles.premiumModal, { backgroundColor: C.background }]}>
            {/* Gold gradient header */}
            <View style={styles.premiumHeader}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={[styles.premiumTitle, { color: C.text }]}>Spark Premium</Text>
              <Text style={[styles.premiumSubtitle, { color: C.textLight }]}>
                See who likes you and match instantly
              </Text>
            </View>

            {/* Features list */}
            <View style={styles.featuresList}>
              <View style={styles.featureRow}>
                <Ionicons name="eye" size={20} color={COLORS.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>See who liked you</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="flash" size={20} color={COLORS.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>Unlimited swipes</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="star" size={20} color={COLORS.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>5 Super Likes per day</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>Extended map range (500m)</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="rocket" size={20} color={COLORS.primary} />
                <Text style={[styles.featureText, { color: C.text }]}>Priority in discover</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.premiumButton, activatingPremium && { opacity: 0.6 }]}
              onPress={handleActivatePremium}
              disabled={activatingPremium}
            >
              <Text style={styles.premiumButtonText}>
                {activatingPremium ? 'Activating...' : 'Upgrade to Premium'}
              </Text>
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
    flex: 1,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0A0',
  },
  premiumBadgeSmallText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B8860B',
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8F0',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0A0',
  },
  upgradeBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#B8860B',
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
  superLikeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4FC3F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  superLikeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
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
  nameClear: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
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
