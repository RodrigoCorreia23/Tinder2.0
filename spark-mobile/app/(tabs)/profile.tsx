import { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLanguageStore } from '@/store/languageStore';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, MAX_PHOTOS, MIN_INTERESTS, MAX_INTERESTS } from '@/utils/constants';
import * as userService from '@/services/user.service';
import { Interest } from '@/types';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ProfileScreen() {
  const { user, logout, refreshUser, deleteAccount } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; reason: string } | null>(null);
  const [activatingPremium, setActivatingPremium] = useState(false);
  const [sharing, setSharing] = useState(false);

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const COLORS = useColors();
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  // Edit bio state
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Edit interests state
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);

  // Edit preferences state
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefLookingFor, setPrefLookingFor] = useState<string[]>([]);
  const [prefAgeMin, setPrefAgeMin] = useState('');
  const [prefAgeMax, setPrefAgeMax] = useState('');
  const [prefDistance, setPrefDistance] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Boost & Travel state
  const [boosting, setBoosting] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [togglingTravel, setTogglingTravel] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  const router = useRouter();

  if (!user) return null;

  const age = Math.floor(
    (Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const isPremium = user.isPremium === true;
  const premiumTier = user.premiumTier || null;
  const isGold = isPremium && premiumTier === 'gold';
  const isBoosted = user.boostedUntil ? new Date(user.boostedUntil) > new Date() : false;
  const isTraveling = user.isTravelMode === true && !!user.travelCity;

  // Bio editing
  const handleEditBio = () => {
    setBioText(user.bio || '');
    setEditingBio(true);
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await userService.updateProfile({ bio: bioText.trim() || null });
      await refreshUser();
      setEditingBio(false);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to update bio.');
      } else {
        Alert.alert('Error', 'Failed to update bio.');
      }
    } finally {
      setSavingBio(false);
    }
  };

  // Interests editing
  const handleEditInterests = async () => {
    setLoadingInterests(true);
    setShowInterestsModal(true);
    setSelectedInterestIds(user.interests.map((i) => i.id));
    try {
      const interests = await userService.getAllInterests();
      setAllInterests(interests);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to load interests.');
      } else {
        Alert.alert('Error', 'Failed to load interests.');
      }
      setShowInterestsModal(false);
    } finally {
      setLoadingInterests(false);
    }
  };

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      }
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, interestId];
    });
  };

  const handleSaveInterests = async () => {
    if (selectedInterestIds.length < MIN_INTERESTS) {
      if (Platform.OS === 'web') {
        window.alert(`Please select at least ${MIN_INTERESTS} interests.`);
      } else {
        Alert.alert('Too few interests', `Please select at least ${MIN_INTERESTS} interests.`);
      }
      return;
    }
    setSavingInterests(true);
    try {
      await userService.updateInterests(selectedInterestIds);
      await refreshUser();
      setShowInterestsModal(false);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to update interests.');
      } else {
        Alert.alert('Error', 'Failed to update interests.');
      }
    } finally {
      setSavingInterests(false);
    }
  };

  // Preferences editing
  const handleEditPrefs = () => {
    setPrefLookingFor([...user.lookingFor]);
    setPrefAgeMin(String(user.ageMin));
    setPrefAgeMax(String(user.ageMax));
    setPrefDistance(String(user.maxDistanceKm));
    setEditingPrefs(true);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await userService.updateProfile({
        lookingFor: prefLookingFor,
        ageMin: parseInt(prefAgeMin) || 18,
        ageMax: parseInt(prefAgeMax) || 99,
        maxDistanceKm: parseInt(prefDistance) || 50,
      });
      await refreshUser();
      setEditingPrefs(false);
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to update preferences.');
      } else {
        Alert.alert('Error', 'Failed to update preferences.');
      }
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleLookingFor = (value: string) => {
    setPrefLookingFor((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  };

  // Photo management
  const handleMovePhoto = async (index: number, direction: 'up' | 'down') => {
    const photos = [...user.photos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const temp = photos[index];
    photos[index] = photos[targetIndex];
    photos[targetIndex] = temp;

    const photoIds = photos.map((p) => p.id);
    try {
      await userService.reorderPhotos(photoIds);
      await refreshUser();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to reorder photos.');
      } else {
        Alert.alert('Error', 'Failed to reorder photos.');
      }
    }
  };

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
    setVerifyResult(null);

    // Launch camera to capture a selfie
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      if (Platform.OS === 'web') {
        window.alert('Camera permission is required to verify your profile.');
      } else {
        Alert.alert('Permission Required', 'Camera permission is required to verify your profile.');
      }
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.Front,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) return;

    setVerifying(true);
    try {
      // Upload the selfie to get a URL
      const uploadRes = await userService.uploadPhoto(pickerResult.assets[0].uri);
      const selfieUrl = uploadRes.url || pickerResult.assets[0].uri;

      const result = await userService.requestVerification(selfieUrl);

      if (result.verified) {
        setVerifyResult({ verified: true, reason: result.reason });
        await refreshUser();
        if (Platform.OS === 'web') {
          window.alert('Your profile has been verified!');
        } else {
          Alert.alert('Verified!', 'Your profile has been verified successfully.');
        }
      } else {
        setVerifyResult({ verified: false, reason: result.reason });
        if (Platform.OS === 'web') {
          window.alert(`Verification failed: ${result.reason}`);
        } else {
          Alert.alert('Verification Failed', result.reason);
        }
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to verify. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to verify. Please try again later.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleShareProfile = async () => {
    setSharing(true);
    try {
      const { link } = await userService.generateShareLink();
      await Share.share({
        message: `Check out my Spark profile! ${link}`,
        url: link,
      });
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to generate share link.');
      } else {
        Alert.alert('Error', 'Failed to generate share link.');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSubscribe = async (tier: 'premium' | 'gold') => {
    setActivatingPremium(true);
    try {
      await userService.activatePremiumDebug(tier);
      await refreshUser();
      const label = tier === 'gold' ? 'Gold' : 'Premium';
      const msg = `Spark ${label} activated for 7 days!`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Success', msg);
      }
    } catch {
      const msg = 'Failed to activate premium. Please try again later.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setActivatingPremium(false);
    }
  };

  const TRAVEL_CITIES = [
    { name: 'Lisbon', lat: 38.7223, lng: -9.1393 },
    { name: 'Porto', lat: 41.1579, lng: -8.6291 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.006 },
    { name: 'Barcelona', lat: 41.3874, lng: 2.1686 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  ];

  const handleBoost = async () => {
    setBoosting(true);
    try {
      const result = await userService.activateBoost();
      await refreshUser();
      const expiryTime = new Date(result.boostedUntil).toLocaleTimeString();
      if (Platform.OS === 'web') {
        window.alert(`Profile boosted until ${expiryTime}!`);
      } else {
        Alert.alert('Boosted!', `Your profile will appear at the top for 30 minutes (until ${expiryTime}).`);
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to activate boost.');
      } else {
        Alert.alert('Error', 'Failed to activate boost. Make sure you have premium.');
      }
    } finally {
      setBoosting(false);
    }
  };

  const handleEnableTravel = async (city: { name: string; lat: number; lng: number }) => {
    setTogglingTravel(true);
    try {
      await userService.enableTravelMode(city.lat, city.lng, city.name);
      await refreshUser();
      setShowTravelModal(false);
      if (Platform.OS === 'web') {
        window.alert(`Travel mode activated! You are now exploring ${city.name}.`);
      } else {
        Alert.alert('Travel Mode', `You are now exploring ${city.name}! Swipe to meet people there.`);
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to enable travel mode.');
      } else {
        Alert.alert('Error', 'Failed to enable travel mode. Make sure you have premium.');
      }
    } finally {
      setTogglingTravel(false);
    }
  };

  const handleDisableTravel = async () => {
    setTogglingTravel(true);
    try {
      await userService.disableTravelMode();
      await refreshUser();
      if (Platform.OS === 'web') {
        window.alert('Travel mode disabled. Back to your real location.');
      } else {
        Alert.alert('Travel Mode Off', 'You are back to your real location.');
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to disable travel mode.');
      } else {
        Alert.alert('Error', 'Failed to disable travel mode.');
      }
    } finally {
      setTogglingTravel(false);
    }
  };

  const getReputationLevel = (score: number) => {
    if (score >= 80) return { label: t('profile.excellent'), color: COLORS.success };
    if (score >= 60) return { label: t('profile.good'), color: COLORS.secondary };
    if (score >= 40) return { label: t('profile.average'), color: COLORS.warning };
    return { label: t('profile.low'), color: COLORS.danger };
  };

  const rep = getReputationLevel(user.reputationScore);

  // Translate gender values for display
  const translateGender = (gender: string) => {
    const key = `general.${gender}` as string;
    return t(key);
  };

  // Group interests by category for the modal
  const interestsByCategory: Record<string, Interest[]> = {};
  allInterests.forEach((interest) => {
    const cat = interest.category || 'Other';
    if (!interestsByCategory[cat]) interestsByCategory[cat] = [];
    interestsByCategory[cat].push(interest);
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLORS.backgroundDark }]} contentContainerStyle={styles.content}>
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
            <View style={[styles.premiumCrown, isGold && { backgroundColor: '#FFD700', borderColor: '#DAA520' }]}>
              <Ionicons name={isGold ? 'trophy' : 'star'} size={16} color={isGold ? '#fff' : '#FFD700'} />
            </View>
          )}
        </View>
        <View style={styles.headerNameRow}>
          <Text style={[styles.name, { color: COLORS.text }]}>
            {user.firstName}, {age}
          </Text>
          {user.isVerified && (
            <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
          )}
        </View>

        {/* Editable Bio */}
        {editingBio ? (
          <View style={styles.bioEditContainer}>
            <TextInput
              style={[styles.bioInput, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.primary }]}
              value={bioText}
              onChangeText={setBioText}
              placeholder="Write something about yourself..."
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={300}
              autoFocus
            />
            <Text style={styles.bioCharCount}>{bioText.length}/300</Text>
            <View style={styles.bioEditActions}>
              <TouchableOpacity
                style={styles.bioEditCancelBtn}
                onPress={() => setEditingBio(false)}
              >
                <Text style={styles.bioEditCancelText}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bioEditSaveBtn, savingBio && { opacity: 0.6 }]}
                onPress={handleSaveBio}
                disabled={savingBio}
              >
                {savingBio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.bioEditSaveText}>{t('profile.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={handleEditBio} style={styles.bioTouchable}>
            <Text style={[styles.bio, { color: COLORS.textLight }]}>
              {user.bio || t('profile.tapToAddBio')}
            </Text>
            <Ionicons name="pencil" size={14} color={COLORS.textLight} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabRow, { backgroundColor: COLORS.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && { backgroundColor: COLORS.primary }]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="person" size={18} color={activeTab === 'profile' ? '#fff' : COLORS.textLight} />
          <Text style={[styles.tabText, { color: activeTab === 'profile' ? '#fff' : COLORS.textLight }]}>{t('profile.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && { backgroundColor: COLORS.primary }]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="settings" size={18} color={activeTab === 'settings' ? '#fff' : COLORS.textLight} />
          <Text style={[styles.tabText, { color: activeTab === 'settings' ? '#fff' : COLORS.textLight }]}>{t('profile.settings')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'settings' && (
        <>
          {/* Theme Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="color-palette" size={20} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.theme')}</Text>
            </View>
            <View style={styles.themeRow}>
              {([
                { mode: 'light' as ThemeMode, label: t('profile.light'), icon: 'sunny' as const },
                { mode: 'dark' as ThemeMode, label: t('profile.dark'), icon: 'moon' as const },
                { mode: 'system' as ThemeMode, label: t('profile.system'), icon: 'phone-portrait' as const },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.mode}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: themeMode === opt.mode ? COLORS.primary : COLORS.backgroundDark,
                      borderColor: themeMode === opt.mode ? COLORS.primary : COLORS.border,
                    },
                  ]}
                  onPress={() => setThemeMode(opt.mode)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={themeMode === opt.mode ? '#FFFFFF' : COLORS.textLight}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: themeMode === opt.mode ? '#FFFFFF' : COLORS.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Card */}
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="language" size={20} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.language')}</Text>
            </View>
            <View style={styles.themeRow}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: language === 'en' ? COLORS.primary : COLORS.backgroundDark,
                    borderColor: language === 'en' ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text style={{ fontSize: 18 }}>{'\ud83c\uddec\ud83c\udde7'}</Text>
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: language === 'en' ? '#FFFFFF' : COLORS.text },
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: language === 'pt' ? COLORS.primary : COLORS.backgroundDark,
                    borderColor: language === 'pt' ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setLanguage('pt')}
              >
                <Text style={{ fontSize: 18 }}>{'\ud83c\uddf5\ud83c\uddf9'}</Text>
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: language === 'pt' ? '#FFFFFF' : COLORS.text },
                  ]}
                >
                  Português
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferences */}
          <View style={[styles.card, { backgroundColor: COLORS.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="options" size={20} color={COLORS.secondary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.preferences')}</Text>
              {!editingPrefs && (
                <TouchableOpacity onPress={handleEditPrefs} style={styles.editBtn}>
                  <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {editingPrefs ? (
              <View style={{ gap: 16 }}>
                {/* Looking for chips */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.lookingFor')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['male', 'female', 'other'] as const).map((gender) => {
                      const isSelected = prefLookingFor.includes(gender);
                      return (
                        <TouchableOpacity
                          key={gender}
                          style={[
                            styles.prefChip,
                            {
                              backgroundColor: isSelected ? COLORS.primary : COLORS.backgroundDark,
                              borderColor: isSelected ? COLORS.primary : COLORS.border,
                            },
                          ]}
                          onPress={() => toggleLookingFor(gender)}
                        >
                          <Text
                            style={[
                              styles.prefChipText,
                              { color: isSelected ? '#FFFFFF' : COLORS.text },
                            ]}
                          >
                            {translateGender(gender)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Age range inputs */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.ageRange')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      style={[styles.prefInput, { backgroundColor: COLORS.backgroundDark, color: COLORS.text, borderColor: COLORS.border }]}
                      value={prefAgeMin}
                      onChangeText={setPrefAgeMin}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="18"
                      placeholderTextColor={COLORS.textLight}
                    />
                    <Text style={{ color: COLORS.textLight, fontSize: 16 }}>-</Text>
                    <TextInput
                      style={[styles.prefInput, { backgroundColor: COLORS.backgroundDark, color: COLORS.text, borderColor: COLORS.border }]}
                      value={prefAgeMax}
                      onChangeText={setPrefAgeMax}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="99"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>

                {/* Max distance input */}
                <View style={{ gap: 8 }}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.maxDistance')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[styles.prefInput, { backgroundColor: COLORS.backgroundDark, color: COLORS.text, borderColor: COLORS.border }]}
                      value={prefDistance}
                      onChangeText={setPrefDistance}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="50"
                      placeholderTextColor={COLORS.textLight}
                    />
                    <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{t('general.km')}</Text>
                  </View>
                </View>

                {/* Save / Cancel buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                  <TouchableOpacity
                    style={styles.bioEditCancelBtn}
                    onPress={() => setEditingPrefs(false)}
                  >
                    <Text style={[styles.bioEditCancelText, { color: COLORS.text }]}>{t('profile.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bioEditSaveBtn, savingPrefs && { opacity: 0.6 }]}
                    onPress={handleSavePrefs}
                    disabled={savingPrefs}
                  >
                    {savingPrefs ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.bioEditSaveText}>{t('profile.save')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.lookingFor')}</Text>
                  <Text style={[styles.settingValue, { color: COLORS.text }]}>
                    {user.lookingFor.map((g) => translateGender(g)).join(', ')}
                  </Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.ageRange')}</Text>
                  <Text style={[styles.settingValue, { color: COLORS.text }]}>{user.ageMin} - {user.ageMax}</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: COLORS.textLight }]}>{t('profile.maxDistance')}</Text>
                  <Text style={[styles.settingValue, { color: COLORS.text }]}>{user.maxDistanceKm} {t('general.km')}</Text>
                </View>
              </>
            )}
          </View>
        </>
      )}

      {activeTab === 'settings' && (
        <>
      {/* Verification Card */}
      <View style={[styles.card, { backgroundColor: COLORS.card }, user.isVerified ? styles.verifiedCard : null]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={20} color={user.isVerified ? '#4FC3F7' : COLORS.textLight} />
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.verification')}</Text>
        </View>
        {user.isVerified ? (
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={16} color="#4FC3F7" />
              <Text style={styles.verifiedPillText}>{t('profile.verifiedProfile')}</Text>
            </View>
            <Text style={styles.verifiedHint}>{t('profile.verifiedHint')}</Text>
          </View>
        ) : (
          <View style={styles.verifySection}>
            <Text style={styles.verifyDescription}>
              {t('profile.verifyDescription')}
            </Text>
            {verifyResult && !verifyResult.verified && (
              <View style={styles.verifyFailedBox}>
                <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                <Text style={styles.verifyFailedText}>{verifyResult.reason}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.verifyButton, verifying && { opacity: 0.6 }]}
              onPress={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <ActivityIndicator size="small" color="#4FC3F7" />
                  <Text style={styles.verifyButtonText}>{t('profile.verifying')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color="#4FC3F7" />
                  <Text style={styles.verifyButtonText}>
                    {verifyResult && !verifyResult.verified ? t('profile.retryVerification') : t('profile.takeSelfie')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Premium Card */}
      {isPremium ? (
        <View style={[styles.card, { backgroundColor: COLORS.card }, isGold ? styles.goldCardActive : styles.premiumCardActive]}>
          <View style={styles.cardHeader}>
            <Ionicons name={isGold ? 'trophy' : 'star'} size={20} color={isGold ? '#DAA520' : '#FFD700'} />
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>
              {isGold ? t('profile.sparkGold') : t('profile.sparkPremium')}
            </Text>
            <View style={[styles.activeBadge, isGold && { backgroundColor: '#DAA520' }]}>
              <Text style={styles.activeBadgeText}>{t('profile.active')}</Text>
            </View>
          </View>
          <View style={styles.premiumActiveSection}>
            <Text style={[styles.premiumActiveText, isGold && { color: '#8B6914' }]}>
              {isGold
                ? t('profile.enjoyingGold')
                : t('profile.enjoyingPremium')}
            </Text>
            {user.premiumUntil && (
              <Text style={styles.premiumExpiry}>
                {t('profile.expires')}: {new Date(user.premiumUntil).toLocaleDateString()}
              </Text>
            )}
          </View>
          {/* Show upgrade to Gold button if on Premium tier */}
          {!isGold && (
            <TouchableOpacity
              style={[styles.goldUpgradeButton, activatingPremium && { opacity: 0.6 }]}
              onPress={() => handleSubscribe('gold')}
              disabled={activatingPremium}
            >
              <Ionicons name="trophy" size={18} color="#fff" />
              <Text style={styles.upgradeButtonText}>
                {activatingPremium ? 'Loading...' : `${t('profile.upgradeToGold')} - \u20AC24.99${t('general.mo')}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Spark Premium Tier */}
          <View style={[styles.card, { backgroundColor: COLORS.card }, styles.premiumCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.sparkPremium')}</Text>
              <Text style={styles.tierPrice}>{'\u20AC'}9.99{t('general.mo')}</Text>
            </View>
            <View style={styles.premiumUpgradeSection}>
              <View style={styles.benefitRow}>
                <Ionicons name="flash" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.unlimitedSwipesBenefit')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="eye" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.seeWhoLikedYou')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.superLikesPerDay')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="location" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.extendedMapRange')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="arrow-undo" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.rewindLastSwipe')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="rocket" size={16} color="#FFD700" />
                <Text style={styles.benefitText}>{t('profile.boost30min')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.upgradeButton, activatingPremium && { opacity: 0.6 }]}
                onPress={() => handleSubscribe('premium')}
                disabled={activatingPremium}
              >
                <Ionicons name="star" size={18} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {activatingPremium ? 'Loading...' : `${t('profile.subscribe')} - \u20AC9.99${t('general.mo')}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Spark Gold Tier */}
          <View style={[styles.card, { backgroundColor: COLORS.card }, styles.goldCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy" size={20} color="#DAA520" />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.sparkGold')}</Text>
              <Text style={styles.tierPriceGold}>{'\u20AC'}24.99{t('general.mo')}</Text>
            </View>
            <View style={styles.premiumUpgradeSection}>
              <Text style={styles.goldIncludesText}>{t('profile.everythingInPremium')}</Text>
              <View style={styles.benefitRow}>
                <Ionicons name="airplane" size={16} color="#DAA520" />
                <Text style={styles.benefitText}>{t('profile.travelMode')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="trending-up" size={16} color="#DAA520" />
                <Text style={styles.benefitText}>{t('profile.priorityInDiscover')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="infinite" size={16} color="#DAA520" />
                <Text style={styles.benefitText}>{t('profile.unlimitedSuperLikes')}</Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="shield-checkmark" size={16} color="#DAA520" />
                <Text style={styles.benefitText}>{t('profile.goldCrownBadge')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.goldUpgradeButton, activatingPremium && { opacity: 0.6 }]}
                onPress={() => handleSubscribe('gold')}
                disabled={activatingPremium}
              >
                <Ionicons name="trophy" size={18} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  {activatingPremium ? 'Loading...' : `${t('profile.subscribe')} Gold - \u20AC24.99${t('general.mo')}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Boost Card (Premium only) */}
      {isPremium && (
        <View style={[styles.card, { backgroundColor: COLORS.card }, styles.boostCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="rocket" size={20} color="#FF9800" />
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.boost')}</Text>
            {isBoosted && (
              <View style={[styles.activeBadge, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.activeBadgeText}>{t('profile.active')}</Text>
              </View>
            )}
          </View>
          {isBoosted ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500' }}>
                {t('profile.profileBoosted')}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textLight }}>
                {t('profile.expires')}: {new Date(user.boostedUntil!).toLocaleTimeString()}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 20 }}>
                {t('profile.boostDescription')}
              </Text>
              <TouchableOpacity
                style={[styles.boostButton, boosting && { opacity: 0.6 }]}
                onPress={handleBoost}
                disabled={boosting}
              >
                <Ionicons name="rocket" size={18} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>
                  {boosting ? t('profile.boosting') : t('profile.boostNow')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Travel Mode Card (Premium only) */}
      {isPremium && (
        <View style={[styles.card, { backgroundColor: COLORS.card }, styles.travelCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="airplane" size={20} color="#5C6BC0" />
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.travelModeTitle')}</Text>
            {isTraveling && (
              <View style={[styles.activeBadge, { backgroundColor: '#5C6BC0' }]}>
                <Text style={styles.activeBadgeText}>{t('profile.active')}</Text>
              </View>
            )}
          </View>
          {isTraveling ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="location" size={16} color="#5C6BC0" />
                <Text style={{ fontSize: 15, color: COLORS.text, fontWeight: '600' }}>
                  {t('profile.exploring')} {user.travelCity}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.travelDisableBtn, togglingTravel && { opacity: 0.6 }]}
                onPress={handleDisableTravel}
                disabled={togglingTravel}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.danger }}>
                  {togglingTravel ? t('profile.disabling') : t('profile.disableTravelMode')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 20 }}>
                {t('profile.exploreDescription')}
              </Text>
              <TouchableOpacity
                style={styles.travelEnableBtn}
                onPress={() => setShowTravelModal(true)}
              >
                <Ionicons name="airplane" size={18} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>
                  {t('profile.exploreCity')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>{t('profile.logOut')}</Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
          </TouchableOpacity>
        </>
      )}

      {activeTab === 'profile' && (
        <>
      {/* Reputation Card */}
      <View style={[styles.card, { backgroundColor: COLORS.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="star" size={20} color={COLORS.accent} />
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.reputation')}</Text>
        </View>
        <View style={styles.repRow}>
          <Text style={[styles.repScore, { color: COLORS.text }]}>{Math.round(user.reputationScore)}</Text>
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
          {t('profile.replyWithin48h')}
        </Text>
      </View>

      {/* Energy Card */}
      <View style={[styles.card, { backgroundColor: COLORS.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash" size={20} color={COLORS.accent} />
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.dailyEnergy')}</Text>
        </View>
        {isPremium ? (
          <Text style={[styles.energyNum, { color: COLORS.text }]}>
            {t('profile.unlimitedSwipes')}
          </Text>
        ) : (
          <>
            <Text style={[styles.energyNum, { color: COLORS.text }]}>
              {user.energyRemaining} <Text style={[styles.energyMax, { color: COLORS.textLight }]}>/ 25 {t('profile.swipes')}</Text>
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
      <View style={[styles.card, { backgroundColor: COLORS.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart" size={20} color={COLORS.primary} />
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.interests')}</Text>
          <TouchableOpacity onPress={handleEditInterests} style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
            <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
          </TouchableOpacity>
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
      <View style={[styles.card, { backgroundColor: COLORS.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="images" size={20} color={COLORS.secondary} />
          <Text style={[styles.cardTitle, { color: COLORS.text }]}>{t('profile.photos')} ({user.photos.length}/{MAX_PHOTOS})</Text>
        </View>
        <View style={styles.photoGrid}>
          {user.photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoBox}>
              <Image source={{ uri: photo.url }} style={styles.gridPhoto} />
              {index === 0 && (
                <View style={styles.mainPhotoBadge}>
                  <Text style={styles.mainPhotoBadgeText}>Main</Text>
                </View>
              )}
              <View style={styles.photoActions}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.photoMoveBtn}
                    onPress={() => handleMovePhoto(index, 'up')}
                  >
                    <Ionicons name="arrow-up" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
                {index < user.photos.length - 1 && (
                  <TouchableOpacity
                    style={styles.photoMoveBtn}
                    onPress={() => handleMovePhoto(index, 'down')}
                  >
                    <Ionicons name="arrow-down" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
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

        </>
      )}

      {/* Share Profile (always visible) */}
      <TouchableOpacity
        style={[styles.shareButton, sharing && { opacity: 0.6 }]}
        onPress={handleShareProfile}
        disabled={sharing}
      >
        {sharing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>{t('profile.shareProfile')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Travel Mode Modal */}
      <Modal visible={showTravelModal} animationType="slide" transparent>
        <View style={styles.travelOverlay}>
          <View style={[styles.travelModalContent, { backgroundColor: COLORS.background }]}>
            <View style={styles.travelModalHeader}>
              <Text style={[styles.travelModalTitle, { color: COLORS.text }]}>{t('profile.chooseCity')}</Text>
              <TouchableOpacity onPress={() => setShowTravelModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 16 }}>
              {t('profile.selectCity')}
            </Text>
            {TRAVEL_CITIES.map((city) => (
              <TouchableOpacity
                key={city.name}
                style={[styles.travelCityBtn, { borderColor: COLORS.border }]}
                onPress={() => handleEnableTravel(city)}
                disabled={togglingTravel}
              >
                <Ionicons name="location-outline" size={18} color="#5C6BC0" />
                <Text style={[styles.travelCityText, { color: COLORS.text }]}>{city.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
            {togglingTravel && (
              <ActivityIndicator size="small" color="#5C6BC0" style={{ marginTop: 12 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* Interests Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>{t('profile.editInterests')}</Text>
              <TouchableOpacity onPress={() => setShowInterestsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select {MIN_INTERESTS}-{MAX_INTERESTS} interests ({selectedInterestIds.length} selected)
            </Text>

            {loadingInterests ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView style={styles.interestsList} contentContainerStyle={{ paddingBottom: 16 }}>
                {Object.entries(interestsByCategory).map(([category, interests]) => (
                  <View key={category} style={styles.interestCategory}>
                    <Text style={styles.interestCategoryTitle}>{category}</Text>
                    <View style={styles.interestChipRow}>
                      {interests.map((interest) => {
                        const selected = selectedInterestIds.includes(interest.id);
                        return (
                          <TouchableOpacity
                            key={interest.id}
                            style={[
                              styles.interestChip,
                              selected && styles.interestChipSelected,
                            ]}
                            onPress={() => toggleInterest(interest.id)}
                          >
                            <Text
                              style={[
                                styles.interestChipText,
                                selected && styles.interestChipTextSelected,
                              ]}
                            >
                              {interest.name}
                            </Text>
                            {selected && (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.saveInterestsBtn,
                (savingInterests || selectedInterestIds.length < MIN_INTERESTS) && { opacity: 0.6 },
              ]}
              onPress={handleSaveInterests}
              disabled={savingInterests || selectedInterestIds.length < MIN_INTERESTS}
            >
              {savingInterests ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveInterestsBtnText}>{t('profile.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  bioTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  bioEditContainer: {
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
  },
  bioInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  bioCharCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  bioEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  bioEditCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bioEditCancelText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  bioEditSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    minWidth: 70,
    alignItems: 'center',
  },
  bioEditSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
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
  // Theme
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  editBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Preferences
  prefChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  prefChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefInput: {
    width: 70,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
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
  verifyFailedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEA',
    padding: 10,
    borderRadius: 8,
  },
  verifyFailedText: {
    fontSize: 13,
    color: COLORS.danger,
    flex: 1,
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
  goldCardActive: {
    borderWidth: 2,
    borderColor: '#DAA520',
    backgroundColor: '#FFF8E7',
  },
  goldCard: {
    borderWidth: 1.5,
    borderColor: '#DAA520',
    backgroundColor: '#FFFEF5',
  },
  tierPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B8860B',
  },
  tierPriceGold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B6914',
  },
  goldIncludesText: {
    fontSize: 13,
    color: '#8B6914',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  goldUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DAA520',
    marginTop: 4,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainPhotoBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  photoActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    gap: 2,
  },
  photoMoveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  // Boost Card
  boostCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
  },
  boostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9800',
    marginTop: 4,
  },
  // Travel Mode Card
  travelCard: {
    borderWidth: 1,
    borderColor: 'rgba(92,107,192,0.3)',
  },
  travelEnableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5C6BC0',
    marginTop: 4,
  },
  travelDisableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  // Travel Modal
  travelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  travelModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  travelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  travelModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  travelCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  travelCityText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  // Interests Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  interestsList: {
    maxHeight: 400,
  },
  interestCategory: {
    marginBottom: 16,
  },
  interestCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interestChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  interestChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  interestChipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  interestChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  saveInterestsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveInterestsBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
