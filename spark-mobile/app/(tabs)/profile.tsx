import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { COLORS, MAX_PHOTOS } from '@/utils/constants';
import * as userService from '@/services/user.service';

export default function ProfileScreen() {
  const { user, logout, refreshUser, deleteAccount } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [activatingPremium, setActivatingPremium] = useState(false);

  if (!user) return null;

  const age = Math.floor(
    (Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const router = useRouter();
  const isPremium = user.isPremium === true;

  const handleDeleteAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (window.confirm('This is permanent. All your data will be lost. Proceed?')) {
          try {
            await deleteAccount();
            router.replace('/auth/login');
          } catch {
            window.alert('Failed to delete account. Please try again.');
          }
        }
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirm Deletion',
                'This is permanent. All your data will be lost. Proceed?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteAccount();
                        router.replace('/auth/login');
                      } catch {
                        Alert.alert('Error', 'Failed to delete account. Please try again.');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await logout();
        router.replace('/auth/login');
      }
    } else {
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/auth/login');
        }},
      ]);
    }
  };

  const handlePickPhoto = async () => {
    if (user.photos.length >= MAX_PHOTOS) {
      if (Platform.OS === 'web') {
        window.alert(`You can only have up to ${MAX_PHOTOS} photos.`);
      } else {
        Alert.alert('Photo Limit', `You can only have up to ${MAX_PHOTOS} photos.`);
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        await userService.uploadPhoto(result.assets[0].uri);
        await refreshUser();
      } catch {
        // Fallback to addPhoto with URI if uploadPhoto fails
        try {
          await userService.addPhoto(result.assets[0].uri);
          await refreshUser();
        } catch {
          if (Platform.OS === 'web') {
            window.alert('Failed to upload photo.');
          } else {
            Alert.alert('Error', 'Failed to upload photo.');
          }
        }
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const doDelete = async () => {
      try {
        await userService.deletePhoto(photoId);
        await refreshUser();
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete photo.');
        } else {
          Alert.alert('Error', 'Failed to delete photo.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this photo?')) {
        await doDelete();
      }
    } else {
      Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await userService.requestVerification();
      await refreshUser();
      if (Platform.OS === 'web') {
        window.alert('Verification request submitted! Your profile will be verified shortly.');
      } else {
        Alert.alert('Verification Requested', 'Your profile will be verified shortly.');
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to request verification. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to request verification. Please try again later.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleActivatePremium = async () => {
    setActivatingPremium(true);
    try {
      await userService.activatePremium();
      await refreshUser();
      if (Platform.OS === 'web') {
        window.alert('Premium activated!');
      } else {
        Alert.alert('Premium Activated', 'Enjoy your premium features!');
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

  const getReputationLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: COLORS.success };
    if (score >= 60) return { label: 'Good', color: COLORS.secondary };
    if (score >= 40) return { label: 'Average', color: COLORS.warning };
    return { label: 'Low', color: COLORS.danger };
  };

  const rep = getReputationLevel(user.reputationScore);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profilePhotoContainer}>
          <Image
            source={{ uri: user.photos[0]?.url || 'https://placehold.co/150x150/FF6B6B/ffffff?text=S' }}
            style={styles.profilePhoto}
          />
          {user.isVerified && (
            <View style={styles.verifiedBadgeOnPhoto}>
              <Ionicons name="checkmark-circle" size={28} color="#4FC3F7" />
            </View>
          )}
          {isPremium && (
            <View style={styles.premiumCrown}>
              <Ionicons name="star" size={16} color="#FFD700" />
            </View>
          )}
        </View>
        <View style={styles.headerNameRow}>
          <Text style={styles.name}>
            {user.firstName}, {age}
          </Text>
          {user.isVerified && (
            <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
          )}
        </View>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {/* Verification Card */}
      <View style={[styles.card, user.isVerified ? styles.verifiedCard : null]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={user.isVerified ? '#4FC3F7' : COLORS.textLight} />
          <Text style={styles.cardTitle}>Verification</Text>
        </View>
        {user.isVerified ? (
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={16} color="#4FC3F7" />
              <Text style={styles.verifiedPillText}>Verified Profile</Text>
            </View>
            <Text style={styles.verifiedHint}>Your profile is verified and trusted by the community</Text>
          </View>
        ) : (
          <View style={styles.verifySection}>
            <Text style={styles.verifyDescription}>
              Get a blue checkmark to show others you're real. Verified profiles get more matches!
            </Text>
            <TouchableOpacity
              style={[styles.verifyButton, verifying && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#4FC3F7" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#4FC3F7" />
                  <Text style={styles.verifyButtonText}>Verify Your Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Premium Card */}
      <View style={[styles.card, isPremium ? styles.premiumCardActive : styles.premiumCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.cardTitle}>Spark Premium</Text>
          {isPremium && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
        </View>
        {isPremium ? (
          <View style={styles.premiumActiveSection}>
            <Text style={styles.premiumActiveText}>
              You're enjoying all Premium benefits!
            </Text>
            {user.premiumUntil && (
              <Text style={styles.premiumExpiry}>
                Expires: {new Date(user.premiumUntil).toLocaleDateString()}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.premiumUpgradeSection}>
            <View style={styles.benefitRow}>
              <Ionicons name="flash" size={16} color="#FFD700" />
              <Text style={styles.benefitText}>Unlimited swipes</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="eye" size={16} color="#FFD700" />
              <Text style={styles.benefitText}>See who liked you</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.benefitText}>5 Super Likes per day</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="location" size={16} color="#FFD700" />
              <Text style={styles.benefitText}>Extended map range</Text>
            </View>
            <TouchableOpacity
              style={[styles.upgradeButton, activatingPremium && { opacity: 0.6 }]}
              onPress={handleActivatePremium}
              disabled={activatingPremium}
            >
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.upgradeButtonText}>
                {activatingPremium ? 'Activating...' : 'Upgrade to Premium'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Reputation Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="star" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Reputation</Text>
        </View>
        <View style={styles.repRow}>
          <Text style={styles.repScore}>{Math.round(user.reputationScore)}</Text>
          <Text style={[styles.repLevel, { color: rep.color }]}>{rep.label}</Text>
        </View>
        <View style={styles.repBar}>
          <View
            style={[
              styles.repFill,
              { width: `${user.reputationScore}%`, backgroundColor: rep.color },
            ]}
          />
        </View>
        <Text style={styles.repHint}>
          Reply to matches within 48h to keep your score high
        </Text>
      </View>

      {/* Energy Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Daily Energy</Text>
        </View>
        {isPremium ? (
          <Text style={styles.energyNum}>
            Unlimited <Text style={styles.energyMax}>swipes</Text>
          </Text>
        ) : (
          <>
            <Text style={styles.energyNum}>
              {user.energyRemaining} <Text style={styles.energyMax}>/ 25 swipes</Text>
            </Text>
            <View style={styles.repBar}>
              <View
                style={[
                  styles.repFill,
                  { width: `${(user.energyRemaining / 25) * 100}%`, backgroundColor: COLORS.accent },
                ]}
              />
            </View>
          </>
        )}
      </View>

      {/* Interests */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Interests</Text>
        </View>
        <View style={styles.chipRow}>
          {user.interests.map((i) => (
            <View key={i.id} style={styles.chip}>
              <Text style={styles.chipText}>{i.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Photos */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="images" size={20} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Photos ({user.photos.length}/{MAX_PHOTOS})</Text>
        </View>
        <View style={styles.photoGrid}>
          {user.photos.map((photo) => (
            <View key={photo.id} style={styles.photoBox}>
              <Image source={{ uri: photo.url }} style={styles.gridPhoto} />
              <TouchableOpacity
                style={styles.deletePhotoBtn}
                onPress={() => handleDeletePhoto(photo.id)}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {user.photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhotoBox} onPress={handlePickPhoto} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="add" size={28} color={COLORS.primary} />
                  <Text style={styles.addPhotoLabel}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Looking for</Text>
          <Text style={styles.settingValue}>{user.lookingFor.join(', ')}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Age range</Text>
          <Text style={styles.settingValue}>{user.ageMin} - {user.ageMax}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Max distance</Text>
          <Text style={styles.settingValue}>{user.maxDistanceKm} km</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  verifiedBadgeOnPhoto: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  premiumCrown: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE0A0',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  bio: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Card styles
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  // Verification
  verifiedCard: {
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
    backgroundColor: '#F8FDFF',
  },
  verifiedRow: {
    gap: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  verifiedPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0288D1',
  },
  verifiedHint: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  verifySection: {
    gap: 12,
  },
  verifyDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    backgroundColor: '#E1F5FE',
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4FC3F7',
  },
  // Premium
  premiumCard: {
    borderWidth: 1,
    borderColor: '#FFE0A0',
    backgroundColor: '#FFFDF5',
  },
  premiumCardActive: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFF8F0',
  },
  activeBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  premiumActiveSection: {
    gap: 4,
  },
  premiumActiveText: {
    fontSize: 14,
    color: '#B8860B',
    fontWeight: '500',
  },
  premiumExpiry: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  premiumUpgradeSection: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.text,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    marginTop: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Reputation
  repRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  repScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  repLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  repBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  repFill: {
    height: '100%',
    borderRadius: 3,
  },
  repHint: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  energyNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  energyMax: {
    fontSize: 16,
    fontWeight: 'normal',
    color: COLORS.textLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundDark,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 11,
  },
  addPhotoBox: {
    width: 100,
    height: 130,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
  },
  deleteText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
