import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/utils/constants';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuthStore();

  if (!user) return null;

  const age = Math.floor(
    (Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const router = useRouter();

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        await logout();
        router.replace('/auth/login');
      }
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/auth/login');
        }},
      ]);
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
        <Image
          source={{ uri: user.photos[0]?.url || 'https://placehold.co/150x150/FF6B6B/ffffff?text=S' }}
          style={styles.profilePhoto}
        />
        <Text style={styles.name}>
          {user.firstName}, {age}
        </Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
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
          <Text style={styles.cardTitle}>Photos ({user.photos.length}/6)</Text>
        </View>
        <View style={styles.photoGrid}>
          {user.photos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.url }} style={styles.gridPhoto} />
          ))}
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
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
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
  },
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridPhoto: {
    width: 100,
    height: 130,
    borderRadius: 12,
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
});
