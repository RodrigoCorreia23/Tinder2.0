import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import * as mapService from '@/services/map.service';
import { useAuthStore } from '@/store/authStore';
import { NearbyUser } from '@/types';
import ProfileModal from '@/components/map/ProfileModal';

// Platform-specific map components
let WebMap: any = null;
let NativeMap: any = null;
if (Platform.OS === 'web') {
  WebMap = require('@/components/map/WebMap').default;
} else {
  NativeMap = require('@/components/map/NativeMap').default;
}

export default function MapScreen() {
  const user = useAuthStore((s) => s.user);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(1000);
  const [isPremium, setIsPremium] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Filters
  const [filterReputation, setFilterReputation] = useState(false);
  const [filterCommonInterests, setFilterCommonInterests] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      let lat: number;
      let lng: number;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          setLocation(loc);
        } catch {
          if (user?.latitude && user?.longitude) {
            lat = user.latitude;
            lng = user.longitude;
            setLocation({ coords: { latitude: lat, longitude: lng } } as any);
          } else {
            setError('Could not determine location');
            setLoading(false);
            return;
          }
        }
      } else if (user?.latitude && user?.longitude) {
        lat = user.latitude;
        lng = user.longitude;
        setLocation({ coords: { latitude: lat, longitude: lng } } as any);
      } else {
        setError('Location permission required');
        setLoading(false);
        return;
      }

      await loadNearby(lat!, lng!);
    } catch {
      setError('Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async (lat: number, lng: number) => {
    try {
      const filters: any = {};
      if (filterReputation) filters.minReputation = 60;
      if (filterCommonInterests) filters.commonInterestsOnly = true;

      const result = await mapService.getNearby(lat, lng, filters);
      let users = result.users;

      // Client-side online filter
      if (showOnlineOnly) {
        users = users.filter((u) => u.isOnline);
      }

      setNearbyUsers(users);
      setRadius(result.radius);
      setIsPremium(result.isPremium);
    } catch (err) {
      console.error('[MAP] Error loading nearby:', err);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    if (location) {
      loadNearby(location.coords.latitude, location.coords.longitude);
    }
  };

  const handlePremiumFilter = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return false;
    }
    return true;
  };

  const handleLike = (userId: string) => {
    console.log('Like from map:', userId);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding people nearby...</Text>
      </View>
    );
  }

  if (error || !location) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || 'Unable to get location'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initLocation}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const radiusLabel = radius >= 1000 ? `${radius / 1000}km` : `${radius}m`;
  const onlineCount = nearbyUsers.filter((u) => u.isOnline).length;

  return (
    <View style={styles.container}>
      {/* Map */}
      {Platform.OS === 'web' ? (
        <WebMap
          latitude={location.coords.latitude}
          longitude={location.coords.longitude}
          nearbyUsers={nearbyUsers}
          onPinPress={setSelectedUser}
        />
      ) : (
        <NativeMap
          latitude={location.coords.latitude}
          longitude={location.coords.longitude}
          nearbyUsers={nearbyUsers}
          onPinPress={setSelectedUser}
        />
      )}

      {/* Info bar */}
      <View style={styles.infoBar}>
        <Ionicons name="people" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} within {radiusLabel}
        </Text>
        {onlineCount > 0 && (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{onlineCount}</Text>
          </View>
        )}
        <TouchableOpacity onPress={initLocation} style={styles.iconBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.iconBtn}>
          <Ionicons name="options" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Range upgrade banner */}
      {!isPremium && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => setShowPremiumModal(true)}
        >
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.upgradeText}>Upgrade to see people within 5km</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFD700" />
        </TouchableOpacity>
      )}

      {/* Profile modal */}
      <ProfileModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onLike={handleLike}
        onPass={() => {}}
      />

      {/* Filters modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.filtersOverlay}>
          <View style={styles.filtersModal}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Map Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Online only */}
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => setShowOnlineOnly(!showOnlineOnly)}
            >
              <View style={styles.filterInfo}>
                <Ionicons name="ellipse" size={16} color={COLORS.success} />
                <Text style={styles.filterLabel}>Online now</Text>
              </View>
              <View style={[styles.toggle, showOnlineOnly && styles.toggleActive]}>
                <View style={[styles.toggleDot, showOnlineOnly && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>

            {/* High reputation */}
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => {
                if (!isPremium) { setShowPremiumModal(true); setShowFilters(false); return; }
                setFilterReputation(!filterReputation);
              }}
            >
              <View style={styles.filterInfo}>
                <Ionicons name="star" size={16} color={COLORS.accent} />
                <Text style={styles.filterLabel}>High reputation (60+)</Text>
                {!isPremium && (
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumTagText}>PRO</Text>
                  </View>
                )}
              </View>
              <View style={[styles.toggle, filterReputation && styles.toggleActive]}>
                <View style={[styles.toggleDot, filterReputation && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>

            {/* Common interests */}
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => {
                if (!isPremium) { setShowPremiumModal(true); setShowFilters(false); return; }
                setFilterCommonInterests(!filterCommonInterests);
              }}
            >
              <View style={styles.filterInfo}>
                <Ionicons name="heart" size={16} color={COLORS.primary} />
                <Text style={styles.filterLabel}>Common interests only</Text>
                {!isPremium && (
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumTagText}>PRO</Text>
                  </View>
                )}
              </View>
              <View style={[styles.toggle, filterCommonInterests && styles.toggleActive]}>
                <View style={[styles.toggleDot, filterCommonInterests && styles.toggleDotActive]} />
              </View>
            </TouchableOpacity>

            {/* Range info */}
            <View style={styles.rangeInfo}>
              <Ionicons name="radio-outline" size={18} color={COLORS.textLight} />
              <Text style={styles.rangeText}>
                Range: {radiusLabel} {!isPremium && '(5km with Premium)'}
              </Text>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Premium modal */}
      <Modal visible={showPremiumModal} transparent animationType="fade">
        <View style={styles.premiumOverlay}>
          <View style={styles.premiumModal}>
            <View style={styles.premiumHeader}>
              <View style={styles.premiumIconCircle}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={styles.premiumTitle}>Spark Premium</Text>
              <Text style={styles.premiumSubtitle}>Unlock the full map experience</Text>
            </View>

            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeatureRow}>
                <Ionicons name="radio-outline" size={20} color={COLORS.primary} />
                <Text style={styles.premiumFeatureText}>5km range (instead of 1km)</Text>
              </View>
              <View style={styles.premiumFeatureRow}>
                <Ionicons name="ellipse" size={20} color={COLORS.success} />
                <Text style={styles.premiumFeatureText}>See who's online right now</Text>
              </View>
              <View style={styles.premiumFeatureRow}>
                <Ionicons name="star" size={20} color={COLORS.accent} />
                <Text style={styles.premiumFeatureText}>Filter by high reputation</Text>
              </View>
              <View style={styles.premiumFeatureRow}>
                <Ionicons name="heart" size={20} color={COLORS.primary} />
                <Text style={styles.premiumFeatureText}>Filter by common interests</Text>
              </View>
              <View style={styles.premiumFeatureRow}>
                <Ionicons name="eye" size={20} color={COLORS.primary} />
                <Text style={styles.premiumFeatureText}>See who liked you</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.premiumBtn}
              onPress={() => {
                setShowPremiumModal(false);
                if (Platform.OS === 'web') {
                  window.alert('Coming soon!');
                } else {
                  const { Alert } = require('react-native');
                  Alert.alert('Coming Soon', 'Premium will be available soon!');
                }
              }}
            >
              <Text style={styles.premiumBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterBtn}
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={styles.laterBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
  },
  loadingText: { fontSize: 16, color: COLORS.textLight },
  errorText: { fontSize: 16, color: COLORS.text },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
  // Info bar
  infoBar: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  infoText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: { fontSize: 11, fontWeight: 'bold', color: COLORS.success },
  iconBtn: { padding: 4 },
  // Upgrade banner
  upgradeBanner: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeText: { fontSize: 13, color: '#FFD700', fontWeight: '600' },
  // Filters modal
  filtersOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filtersModal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filtersTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterLabel: { fontSize: 15, color: COLORS.text },
  premiumTag: {
    backgroundColor: '#FFF0D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumTagText: { fontSize: 10, fontWeight: 'bold', color: '#B8860B' },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleDotActive: { alignSelf: 'flex-end' },
  rangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  rangeText: { fontSize: 13, color: COLORS.textLight },
  applyBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Premium modal
  premiumOverlay: {
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
  premiumTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  premiumSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 4 },
  premiumFeatures: { padding: 24, gap: 16 },
  premiumFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumFeatureText: { fontSize: 15, color: COLORS.text },
  premiumBtn: {
    marginHorizontal: 24,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  laterBtn: { alignItems: 'center', paddingVertical: 16 },
  laterBtnText: { fontSize: 15, color: COLORS.textLight },
});
