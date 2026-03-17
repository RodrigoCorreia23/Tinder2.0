import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { Match } from '@/types';
import PhotoCarousel from '@/components/ui/PhotoCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  match: Match | undefined;
}

export default function ProfileModal({ visible, onClose, match }: ProfileModalProps) {
  if (!match) return null;

  const { otherUser } = match;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          {/* Photos */}
          <PhotoCarousel
            photos={otherUser.photos}
            width={SCREEN_WIDTH}
            height={SCREEN_WIDTH * 1.2}
            borderRadius={0}
            fallbackText={otherUser.firstName[0]}
          />

          {/* Profile info */}
          <View style={styles.infoSection}>
            <Text style={styles.name}>{otherUser.firstName}</Text>

            {match.compatibilityScore > 0 && (
              <View style={styles.compatRow}>
                <Ionicons name="heart" size={16} color={COLORS.primary} />
                <Text style={styles.compatText}>
                  {Math.round(match.compatibilityScore)}% compatible
                </Text>
              </View>
            )}

            {match.expiresAt && (
              <View style={styles.expiryRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.expiryText}>
                  Match expires {new Date(match.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
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
    elevation: 4,
  },
  content: {
    paddingBottom: 40,
  },
  infoSection: {
    padding: 20,
    gap: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compatText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});
