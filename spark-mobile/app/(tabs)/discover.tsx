import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeStore } from '@/store/swipeStore';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket } from '@/services/socket';
import { COLORS } from '@/utils/constants';
import { useColors } from '@/hooks/useColors';
import { Profile } from '@/types';
import MatchAnimation from '@/components/match/MatchAnimation';
import PhotoCarousel from '@/components/ui/PhotoCarousel';
import * as userService from '@/services/user.service';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 20;
const CARD_HEIGHT = height * 0.72;
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_UP_THRESHOLD = height * 0.15;

export default function DiscoverScreen() {
  const C = useColors();
  const router = useRouter();
  const {
    profiles,
    energy,
    isLoading,
    lastMatch,
    superLikeRemaining,
    loadProfiles,
    loadEnergy,
    swipe,
    rewind,
    clearMatch,
    loadReceivedLikes,
    loadSuperLikeStatus,
  } = useSwipeStore();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const loadMatches = useChatStore((s) => s.loadMatches);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterAgeMin, setFilterAgeMin] = useState(String(user?.ageMin ?? 18));
  const [filterAgeMax, setFilterAgeMax] = useState(String(user?.ageMax ?? 99));
  const [filterDistance, setFilterDistance] = useState(String(user?.maxDistanceKm ?? 50));
  const swipedProfilesCache = useRef<Record<string, Profile>>({});

  const isPremium = user?.isPremium === true;

  // Cache every profile we see for match animation later
  useEffect(() => {
    profiles.forEach((p) => {
      swipedProfilesCache.current[p.id] = p;
    });
  }, [profiles]);

  useEffect(() => {
    loadProfiles();
    loadEnergy();
    loadReceivedLikes();
    loadSuperLikeStatus();
  }, []);

  // Sync filter fields when user data changes
  useEffect(() => {
    if (user) {
      setFilterAgeMin(String(user.ageMin));
      setFilterAgeMax(String(user.ageMax));
      setFilterDistance(String(user.maxDistanceKm));
    }
  }, [user?.ageMin, user?.ageMax, user?.maxDistanceKm]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfiles(), loadEnergy()]);
    setRefreshing(false);
  };

  const handleApplyFilters = async () => {
    const ageMin = Math.max(18, parseInt(filterAgeMin, 10) || 18);
    const ageMax = Math.min(99, parseInt(filterAgeMax, 10) || 99);
    const maxDistanceKm = Math.max(1, parseInt(filterDistance, 10) || 50);
    try {
      await userService.updateProfile({ ageMin, ageMax, maxDistanceKm });
      await refreshUser();
      await loadProfiles();
      setShowFilters(false);
    } catch {
      // silent
    }
  };

  const handleResetFilters = () => {
    setFilterAgeMin('18');
    setFilterAgeMax('99');
    setFilterDistance('50');
  };

  // Listen for match via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMatch = (data: { matchId: string; userId: string }) => {
      console.log('[DISCOVER] Socket new_match event:', data);
      const cached = swipedProfilesCache.current[data.userId];
      if (cached) {
        setMatchedProfile(cached);
      } else {
        setMatchedProfile({
          id: data.userId,
          firstName: 'Someone',
          age: 0,
          gender: '',
          bio: null,
          reputationScore: 50,
          isVerified: false,
          distance: null,
          photos: [],
          interests: [],
        });
      }
      loadMatches();
    };

    socket.on('new_match', handleNewMatch);
    return () => {
      socket.off('new_match', handleNewMatch);
    };
  });

  // Fallback: if swipe returned a match but socket didn't fire
  useEffect(() => {
    if (lastMatch && !matchedProfile) {
      const cached = swipedProfilesCache.current[lastMatch.userId];
      if (cached) {
        setMatchedProfile(cached);
      } else {
        setMatchedProfile({
          id: lastMatch.userId,
          firstName: 'Someone',
          age: 0,
          gender: '',
          bio: null,
          reputationScore: 50,
          isVerified: false,
          distance: null,
          photos: [],
          interests: [],
        });
      }
      loadMatches();
    }
  }, [lastMatch]);

  const handleSwipe = async (targetUserId: string, direction: 'like' | 'pass', isSuperLike?: boolean) => {
    // Cache profile before swipe removes it from the list
    const profileToCache = profiles.find((p) => p.id === targetUserId);
    if (profileToCache) {
      swipedProfilesCache.current[targetUserId] = profileToCache;
    }
    try {
      const matched = await swipe(targetUserId, direction, isSuperLike);
      // If swipe returned a match, show animation immediately
      if (matched && profileToCache) {
        setMatchedProfile(profileToCache);
        loadMatches();
      }
    } catch (err) {
      console.error('[DISCOVER] Swipe error:', err);
    }
  };

  const handleRewind = async () => {
    try {
      const success = await rewind();
      if (!success) {
        if (Platform.OS === 'web') {
          window.alert('Cannot rewind. Either no recent swipe or time expired.');
        } else {
          Alert.alert('Cannot Rewind', 'Either no recent swipe or the 5 minute window has expired.');
        }
      }
    } catch {
      // silent
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: C.backgroundDark }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textLight }]}>Finding people for you...</Text>
      </View>
    );
  }

  if (profiles.length === 0 && !refreshing) {
    return (
      <ScrollView
        contentContainerStyle={[styles.center, { backgroundColor: C.backgroundDark }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.emptyIconCircle}>
          <Ionicons name="search" size={40} color={C.primary} />
        </View>
        <Text style={[styles.emptyText, { color: C.text }]}>No more people nearby</Text>
        <Text style={[styles.emptySubText, { color: C.textLight }]}>Check back later for new profiles</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadProfiles}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const energyPercent = (energy.remaining / energy.max) * 100;
  const energyColor = energyPercent > 50 ? COLORS.success : energyPercent > 20 ? COLORS.warning : COLORS.danger;

  const isBoosted = user?.boostedUntil ? new Date(user.boostedUntil) > new Date() : false;
  const isTraveling = user?.isTravelMode === true && !!user?.travelCity;

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundDark }]}>
      {/* Travel Mode banner */}
      {isTraveling && (
        <View style={styles.travelBanner}>
          <Ionicons name="airplane" size={16} color="#fff" />
          <Text style={styles.travelBannerText}>Traveling to {user?.travelCity}</Text>
        </View>
      )}

      {/* Boosted badge */}
      {isBoosted && (
        <View style={styles.boostedBanner}>
          <Ionicons name="rocket" size={16} color="#fff" />
          <Text style={styles.boostedBannerText}>BOOSTED</Text>
        </View>
      )}

      {/* Energy bar */}
      <View style={styles.energyBar}>
        <View style={styles.energyLeft}>
          <Ionicons name="flash" size={18} color={isPremium ? '#FFD700' : energyColor} />
          {isPremium ? (
            <Text style={[styles.energyCount, { color: '#FFD700' }]}>Unlimited</Text>
          ) : (
            <Text style={[styles.energyCount, { color: energyColor }]}>{energy.remaining}</Text>
          )}
        </View>
        {!isPremium && (
          <View style={styles.energyTrack}>
            <Animated.View
              style={[styles.energyFill, { width: `${energyPercent}%`, backgroundColor: energyColor }]}
            />
          </View>
        )}
        <Text style={[styles.energyLabel, { color: C.textLight }]}>{isPremium ? 'Premium' : 'swipes left today'}</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.filterBtn, { backgroundColor: C.background, borderColor: C.border }]}>
          <Ionicons name="options" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Card stack with pull-to-refresh */}
      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
      <View style={styles.cardContainer}>
        {profiles.slice(0, 2).reverse().map((profile, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            isTop={index === profiles.slice(0, 2).length - 1}
            onSwipe={(direction, isSuperLike) => handleSwipe(profile.id, direction, isSuperLike)}
            onRewind={handleRewind}
            energy={energy.remaining}
            isPremium={isPremium}
            superLikeRemaining={superLikeRemaining}
          />
        ))}
      </View>
      </ScrollView>

      {/* Match animation */}
      <MatchAnimation
        visible={!!matchedProfile}
        currentUserPhoto={user?.photos[0]?.url || 'https://placehold.co/150x150/FF6B6B/ffffff?text=You'}
        matchedUserPhoto={matchedProfile?.photos[0]?.url || 'https://placehold.co/150x150/FF6B6B/ffffff?text=S'}
        matchedUserName={matchedProfile?.firstName || ''}
        onClose={() => {
          setMatchedProfile(null);
          clearMatch();
        }}
        onChat={() => {
          setMatchedProfile(null);
          clearMatch();
          router.push(`/(tabs)/matches`);
        }}
      />

      {/* Filters Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={[styles.filterModal, { backgroundColor: C.background }]}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterTitle, { color: C.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: C.text }]}>Age Range</Text>
              <View style={styles.filterRow}>
                <TextInput
                  style={[styles.filterInput, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
                  keyboardType="number-pad"
                  value={filterAgeMin}
                  onChangeText={setFilterAgeMin}
                  placeholder="Min"
                  placeholderTextColor={C.textLight}
                  maxLength={2}
                />
                <Text style={[styles.filterDash, { color: C.textLight }]}>-</Text>
                <TextInput
                  style={[styles.filterInput, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
                  keyboardType="number-pad"
                  value={filterAgeMax}
                  onChangeText={setFilterAgeMax}
                  placeholder="Max"
                  placeholderTextColor={C.textLight}
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: C.text }]}>Max Distance (km)</Text>
              <TextInput
                style={[styles.filterInput, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
                keyboardType="number-pad"
                value={filterDistance}
                onChangeText={setFilterDistance}
                placeholder="Distance"
                placeholderTextColor={C.textLight}
                maxLength={4}
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.resetBtn, { borderColor: C.border }]} onPress={handleResetFilters}>
                <Text style={[styles.resetBtnText, { color: C.textLight }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SwipeCard({
  profile,
  isTop,
  onSwipe,
  onRewind,
  energy,
  isPremium,
  superLikeRemaining,
}: {
  profile: Profile;
  isTop: boolean;
  onSwipe: (direction: 'like' | 'pass', isSuperLike?: boolean) => void;
  onRewind: () => void;
  energy: number;
  isPremium: boolean;
  superLikeRemaining: number;
}) {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          doSwipe('like');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          doSwipe('pass');
        } else if (gesture.dy < -SWIPE_UP_THRESHOLD) {
          doSuperLike();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const doSwipe = (direction: 'like' | 'pass') => {
    if (!isPremium && energy <= 0) {
      if (Platform.OS === 'web') {
        window.alert('No energy! You have no swipes left today.');
      }
      resetPosition();
      return;
    }
    const toX = direction === 'like' ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x: toX, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => onSwipe(direction));
  };

  const doSuperLike = () => {
    if (superLikeRemaining <= 0) {
      if (Platform.OS === 'web') {
        window.alert('No super likes remaining today!');
      } else {
        Alert.alert('No Super Likes', 'You have no super likes remaining today.');
      }
      resetPosition();
      return;
    }
    Animated.timing(position, {
      toValue: { x: 0, y: -height },
      duration: 300,
      useNativeDriver: false,
    }).start(() => onSwipe('like', true));
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-width / 5, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const superLikeOpacity = position.y.interpolate({
    inputRange: [-height / 5, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const animatedStyle = isTop
    ? { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }
    : { transform: [{ scale: nextCardScale }], opacity: 0.9 };

  const age = profile.age;

  return (
    <Animated.View
      style={[styles.card, animatedStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Full card photo */}
      <PhotoCarousel
        photos={profile.photos}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        borderRadius={20}
        fallbackText={profile.firstName[0]}
      />

      {/* Gradient overlay at bottom */}
      <View style={styles.gradientOverlay} />

      {/* Like/Pass/Super Like stamp overlays */}
      {isTop && (
        <>
          <Animated.View style={[styles.stampContainer, styles.likeStamp, { opacity: likeOpacity }]}>
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stampContainer, styles.passStamp, { opacity: passOpacity }]}>
            <Text style={[styles.stampText, styles.passStampText]}>NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.stampContainer, styles.superLikeStamp, { opacity: superLikeOpacity }]}>
            <Text style={[styles.stampText, styles.superLikeStampText]}>SUPER LIKE</Text>
          </Animated.View>
        </>
      )}

      {/* Reputation badge top right */}
      <View style={styles.repBadge}>
        <Ionicons name="star" size={13} color={COLORS.accent} />
        <Text style={styles.repText}>{Math.round(profile.reputationScore)}</Text>
      </View>

      {/* Profile info overlay at bottom */}
      <View style={styles.infoOverlay}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{profile.firstName}</Text>
          <Text style={styles.cardAge}>{age}</Text>
          {profile.isVerified && (
            <Ionicons name="checkmark-circle" size={22} color="#4FC3F7" />
          )}
        </View>

        {profile.distance !== null && (
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.distanceText}>{profile.distance} km away</Text>
          </View>
        )}

        {profile.bio && (
          <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>
        )}

        <View style={styles.tagsRow}>
          {profile.interests.slice(0, 4).map((interest) => (
            <View key={interest.id} style={styles.tag}>
              <Text style={styles.tagText}>{interest.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action buttons */}
      {isTop && (
        <View style={styles.actions}>
          {isPremium && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.rewindActionBtn]}
              onPress={onRewind}
            >
              <Ionicons name="arrow-undo" size={22} color="#FFD700" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.passActionBtn]}
            onPress={() => doSwipe('pass')}
          >
            <Ionicons name="close" size={32} color={COLORS.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.superLikeActionBtn]}
            onPress={doSuperLike}
          >
            <Ionicons name="star" size={24} color="#4FC3F7" />
            {/* Super like remaining badge */}
            <View style={styles.superLikeBadge}>
              <Text style={styles.superLikeBadgeText}>{superLikeRemaining}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.likeActionBtn]}
            onPress={() => doSwipe('like')}
          >
            <Ionicons name="heart" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textLight,
    marginTop: 4,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Energy bar
  energyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  energyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  energyCount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  energyTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    borderRadius: 2,
  },
  energyLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  // Cards
  cardContainer: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.45,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // Stamps
  stampContainer: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: 12,
    transform: [{ rotate: '-15deg' }],
  },
  likeStamp: {
    left: 24,
    borderColor: COLORS.success,
  },
  passStamp: {
    right: 24,
    borderColor: COLORS.danger,
    transform: [{ rotate: '15deg' }],
  },
  superLikeStamp: {
    left: '50%',
    marginLeft: -80,
    top: 80,
    borderColor: '#4FC3F7',
    transform: [{ rotate: '0deg' }],
  },
  stampText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 3,
  },
  passStampText: {
    color: COLORS.danger,
  },
  superLikeStampText: {
    color: '#4FC3F7',
  },
  // Reputation
  repBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  repText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Info overlay
  infoOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cardName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardAge: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.85)',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  // Action buttons
  actions: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  passActionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.2)',
  },
  superLikeActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.2)',
    position: 'relative',
  },
  superLikeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#4FC3F7',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  superLikeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rewindActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  likeActionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  // Travel & Boost banners
  travelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5C6BC0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  travelBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  boostedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF9800',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  boostedBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Filter button
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Filter modal
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundDark,
  },
  filterDash: {
    fontSize: 18,
    color: COLORS.textLight,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
