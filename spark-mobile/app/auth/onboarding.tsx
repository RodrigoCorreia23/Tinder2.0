import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, MIN_INTERESTS } from '@/utils/constants';
import * as userService from '@/services/user.service';
import { Interest } from '@/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      const data = await userService.getAllInterests();
      setInterests(data);
    } catch {
      Alert.alert('Error', 'Failed to load interests');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // For MVP, use the local URI. In production, upload to S3 first
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const toggleInterest = (id: number) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Update bio
      if (bio) await userService.updateProfile({ bio } as any);

      // Update interests
      if (selectedInterests.length >= MIN_INTERESTS) {
        await userService.updateInterests(selectedInterests);
      }

      // Upload photos
      for (const photoUri of photos) {
        await userService.addPhoto(photoUri);
      }

      // Request location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        await userService.updateLocation(
          location.coords.latitude,
          location.coords.longitude
        );
      }

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // Group interests by category
  const grouped = interests.reduce(
    (acc, interest) => {
      const cat = interest.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(interest);
      return acc;
    },
    {} as Record<string, Interest[]>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete your profile</Text>
      <Text style={styles.stepText}>Step {step} of 3</Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <Text style={styles.hint}>Add at least 1 photo</Text>

          <View style={styles.photoGrid}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoBox}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}
                >
                  <Text style={styles.removePhotoText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 6 && (
              <TouchableOpacity style={styles.addPhotoBox} onPress={pickImage}>
                <Text style={styles.addPhotoText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, photos.length === 0 && styles.buttonDisabled]}
            onPress={() => {
              if (photos.length === 0) {
                Alert.alert('Error', 'Add at least 1 photo');
                return;
              }
              setStep(2);
            }}
            disabled={photos.length === 0}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Interests</Text>
          <Text style={styles.hint}>
            Choose at least {MIN_INTERESTS} ({selectedInterests.length} selected)
          </Text>

          {Object.entries(grouped).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <View style={styles.chipRow}>
                {items.map((interest) => (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.chip,
                      selectedInterests.includes(interest.id) && styles.chipActive,
                    ]}
                    onPress={() => toggleInterest(interest.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedInterests.includes(interest.id) && styles.chipTextActive,
                      ]}
                    >
                      {interest.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                { flex: 1 },
                selectedInterests.length < MIN_INTERESTS && styles.buttonDisabled,
              ]}
              onPress={() => {
                if (selectedInterests.length < MIN_INTERESTS) {
                  Alert.alert('Error', `Select at least ${MIN_INTERESTS} interests`);
                  return;
                }
                setStep(3);
              }}
              disabled={selectedInterests.length < MIN_INTERESTS}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About you</Text>
          <Text style={styles.hint}>Write a short bio (optional)</Text>

          <TextInput
            style={styles.bioInput}
            placeholder="Tell people about yourself..."
            placeholderTextColor={COLORS.textLight}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : "Let's Go!"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoBox: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  addPhotoText: {
    fontSize: 32,
    color: COLORS.textLight,
  },
  categorySection: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundDark,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.text,
    fontSize: 13,
  },
  chipTextActive: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
  },
  bioInput: {
    height: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundDark,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  button: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});
