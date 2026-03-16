import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
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

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      let lat: number;
      let lng: number;

      // Try browser/device location first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          setLocation(loc);
        } catch {
          // Browser location failed, fall back to profile location
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
        // Permission denied — use profile location
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
      console.log('[MAP] Loading nearby users at:', lat, lng);
      const users = await mapService.getNearby(lat, lng);
      console.log('[MAP] Found', users.length, 'nearby users');
      setNearbyUsers(users);
    } catch (err) {
      console.error('[MAP] Error loading nearby:', err);
    }
  };

  const handleLike = (userId: string) => {
    // TODO: call swipe API
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
          {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} within 200m
        </Text>
        <TouchableOpacity onPress={initLocation} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Profile modal */}
      <ProfileModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onLike={handleLike}
        onPass={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
  infoBar: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  refreshBtn: {
    marginLeft: 4,
    padding: 4,
  },
});
