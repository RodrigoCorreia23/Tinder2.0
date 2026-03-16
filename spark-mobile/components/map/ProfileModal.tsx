import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { NearbyUser } from '@/types';
import PhotoCarousel from '@/components/ui/PhotoCarousel';

const { width } = Dimensions.get('window');

interface ProfileModalProps {
  user: NearbyUser | null;
  onClose: () => void;
  onLike: (userId: string) => void;
  onPass: () => void;
}

export default function ProfileModal({ user, onClose, onLike, onPass }: ProfileModalProps) {
  if (!user) return null;

  return (
    <Modal visible={!!user} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.textLight} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <PhotoCarousel
              photos={user.photos?.length > 0 ? user.photos : (user.photo ? [user.photo] : [])}
              width={Math.min(width - 40, 420)}
              height={350}
              fallbackText={user.firstName[0]}
            />

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.firstName}, {user.age}</Text>
                <View style={styles.repBadge}>
                  <Ionicons name="star" size={14} color={COLORS.accent} />
                  <Text style={styles.repText}>{Math.round(user.reputationScore)}</Text>
                </View>
              </View>

              {user.bio && (
                <Text style={styles.bio}>{user.bio}</Text>
              )}

              {/* Interests */}
              {user.interests.length > 0 && (
                <View style={styles.interestsSection}>
                  <Text style={styles.sectionLabel}>Interests</Text>
                  <View style={styles.interestsRow}>
                    {user.interests.map((interest) => (
                      <View key={interest.id} style={styles.interestChip}>
                        <Text style={styles.interestText}>{interest.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Nearby indicator */}
              <View style={styles.nearbyBadge}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.nearbyText}>Within 200m of you</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.passBtn}
              onPress={() => {
                onPass();
                onClose();
              }}
            >
              <Ionicons name="close" size={32} color={COLORS.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.likeBtn}
              onPress={() => {
                onLike(user.id);
                onClose();
              }}
            >
              <Ionicons name="heart" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: Math.min(width - 40, 420),
    maxHeight: '85%',
    backgroundColor: COLORS.background,
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    padding: 20,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  repBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  repText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  bio: {
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  interestsSection: {
    marginTop: 4,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundDark,
  },
  interestText: {
    fontSize: 13,
    color: COLORS.text,
  },
  nearbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  nearbyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  passBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
