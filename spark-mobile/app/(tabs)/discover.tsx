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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeStore } from '@/store/swipeStore';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { COLORS } from '@/utils/constants';
import { Profile } from '@/types';
import MatchAnimation from '@/components/match/MatchAnimation';
import PhotoCarousel from '@/components/ui/PhotoCarousel';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 20;
const CARD_HEIGHT = height * 0.72;
const SWIPE_THRESHOLD = width * 0.25;

export default function DiscoverScreen() {
  const router = useRouter();
  const { profiles, energy, isLoading, lastMatch, loadProfiles, loadEnergy, swipe, clearMatch, loadReceivedLikes } =
    useSwipeStore();
  const user = useAuthStore((s) => s.user);
  const loadMatches = useChatStore((s) => s.loadMatches);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const profilesRef = useRef<Profile[]>([]);
  profilesRef.current = profiles;

  useEffect(() => {
    loadProfiles();
    loadEnergy();
    loadReceivedLikes();
  }, []);

  const handleSwipe = async (targetUserId: string, direction: 'like' | 'pass') => {
    // Deep copy the profile BEFORE swipe removes it from the store
    const targetProfile = JSON.parse(
      JSON.stringify(profilesRef.current.find((p) => p.id === targetUserId) || null)
    ) as Profile | null;

    try {
      const matched = await swipe(targetUserId, direction);
      console.log('[DISCOVER] Swipe result:', { targetUserId, direction, matched, hasProfile: !!targetProfile });
      if (matched) {
        if (targetProfile) {
          setMatchedProfile(targetProfile);
        } else {
          // Fallback: show a basic match alert if profile not found
          console.log('[DISCOVER] Match but profile not found, using fallback');
          setMatchedProfile({
            id: targetUserId,
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
    } catch (err) {
      console.error('[DISCOVER] Swipe error:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding people for you...</Text>
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="search" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyText}>No more people nearby</Text>
        <Text style={styles.emptySubText}>Check back later for new profiles</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadProfiles}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const energyPercent = (energy.remaining / energy.max) * 100;
  const energyColor = energyPercent > 50 ? COLORS.success : energyPercent > 20 ? COLORS.warning : COLORS.danger;

  return (
    <View style={styles.container}>
      {/* Energy bar */}
      <View style={styles.energyBar}>
        <View style={styles.energyLeft}>
          <Ionicons name="flash" size={18} color={energyColor} />
          <Text style={[styles.energyCount, { color: energyColor }]}>{energy.remaining}</Text>
        </View>
        <View style={styles.energyTrack}>
          <Animated.View
            style={[styles.energyFill, { width: `${energyPercent}%`, backgroundColor: energyColor }]}
          />
        </View>
        <Text style={styles.energyLabel}>swipes left today</Text>
      </View>

      {/* Card stack */}
      <View style={styles.cardContainer}>
        {profiles.slice(0, 2).reverse().map((profile, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            isTop={index === profiles.slice(0, 2).length - 1}
            onSwipe={(direction) => handleSwipe(profile.id, direction)}
            energy={energy.remaining}
          />
        ))}
      </View>

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
    </View>
  );
}

function SwipeCard({
  profile,
  isTop,
  onSwipe,
  energy,
}: {
  profile: Profile;
  isTop: boolean;
  onSwipe: (direction: 'like' | 'pass') => void;
  energy: number;
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
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const doSwipe = (direction: 'like' | 'pass') => {
    if (energy <= 0) {
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

      {/* Like/Pass stamp overlays */}
      {isTop && (
        <>
          <Animated.View style={[styles.stampContainer, styles.likeStamp, { opacity: likeOpacity }]}>
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stampContainer, styles.passStamp, { opacity: passOpacity }]}>
            <Text style={[styles.stampText, styles.passStampText]}>NOPE</Text>
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
          <TouchableOpacity
            style={[styles.actionBtn, styles.passActionBtn]}
            onPress={() => doSwipe('pass')}
          >
            <Ionicons name="close" size={32} color={COLORS.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.superLikeBtn]}
            onPress={() => doSwipe('like')}
          >
            <Ionicons name="star" size={24} color="#4FC3F7" />
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
  stampText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.success,
    letterSpacing: 3,
  },
  passStampText: {
    color: COLORS.danger,
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
  superLikeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.2)',
  },
  likeActionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
});
