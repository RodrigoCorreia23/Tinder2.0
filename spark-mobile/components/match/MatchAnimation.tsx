import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';

const { width, height } = Dimensions.get('window');

interface MatchAnimationProps {
  visible: boolean;
  currentUserPhoto: string;
  matchedUserPhoto: string;
  matchedUserName: string;
  onClose: () => void;
  onChat: () => void;
}

export default function MatchAnimation({
  visible,
  currentUserPhoto,
  matchedUserPhoto,
  matchedUserName,
  onClose,
  onChat,
}: MatchAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const leftSlide = useRef(new Animated.Value(-width)).current;
  const rightSlide = useRef(new Animated.Value(width)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset all values
      scaleAnim.setValue(0);
      leftSlide.setValue(-width);
      rightSlide.setValue(width);
      heartScale.setValue(0);
      heartRotate.setValue(0);
      textOpacity.setValue(0);
      buttonsOpacity.setValue(0);
      sparkle1.setValue(0);
      sparkle2.setValue(0);
      sparkle3.setValue(0);
      bgOpacity.setValue(0);

      Animated.sequence([
        // 1. Fade in background
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // 2. Slide in both photos from sides
        Animated.parallel([
          Animated.spring(leftSlide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(rightSlide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // 3. Heart pops up with bounce
        Animated.parallel([
          Animated.spring(heartScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(heartRotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // 4. Sparkles
        Animated.stagger(100, [
          Animated.spring(sparkle1, { toValue: 1, tension: 80, friction: 4, useNativeDriver: true }),
          Animated.spring(sparkle2, { toValue: 1, tension: 80, friction: 4, useNativeDriver: true }),
          Animated.spring(sparkle3, { toValue: 1, tension: 80, friction: 4, useNativeDriver: true }),
        ]),
        // 5. Text and buttons fade in
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(buttonsOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Continuous heart pulse
      const pulse = () => {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) pulse();
        });
      };
      setTimeout(pulse, 1500);
    }
  }, [visible]);

  const heartRotation = heartRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-15deg', '0deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        {/* Sparkles */}
        <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1, transform: [{ scale: sparkle1 }] }]}>
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2, transform: [{ scale: sparkle2 }] }]}>
          <Text style={styles.sparkleText}>💫</Text>
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3, transform: [{ scale: sparkle3 }] }]}>
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle4, { opacity: sparkle1, transform: [{ scale: sparkle1 }] }]}>
          <Text style={styles.sparkleText}>💖</Text>
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkle5, { opacity: sparkle2, transform: [{ scale: sparkle2 }] }]}>
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
          It's a Spark!
        </Animated.Text>

        {/* Profile photos */}
        <View style={styles.photosContainer}>
          <Animated.View
            style={[
              styles.photoWrapper,
              styles.leftPhoto,
              { transform: [{ translateX: leftSlide }, { rotate: '-8deg' }] },
            ]}
          >
            <Image
              source={{ uri: currentUserPhoto }}
              style={styles.photo}
            />
          </Animated.View>

          {/* Heart in the middle */}
          <Animated.View
            style={[
              styles.heartContainer,
              {
                transform: [
                  { scale: Animated.multiply(heartScale, scaleAnim.interpolate({
                    inputRange: [0, 1.15],
                    outputRange: [1, 1.15],
                  })) },
                  { rotate: heartRotation },
                ],
              },
            ]}
          >
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={36} color={COLORS.primary} />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.photoWrapper,
              styles.rightPhoto,
              { transform: [{ translateX: rightSlide }, { rotate: '8deg' }] },
            ]}
          >
            <Image
              source={{ uri: matchedUserPhoto }}
              style={styles.photo}
            />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.subtitle, { opacity: textOpacity }]}>
          You and {matchedUserName} liked each other!
        </Animated.Text>

        {/* Action buttons */}
        <Animated.View style={[styles.buttons, { opacity: buttonsOpacity }]}>
          <TouchableOpacity style={styles.chatButton} onPress={onChat}>
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.chatButtonText}>Send a message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepButton} onPress={onClose}>
            <Text style={styles.keepButtonText}>Keep swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 32,
    textShadowColor: 'rgba(255, 107, 107, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  photoWrapper: {
    width: 140,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  leftPhoto: {
    marginRight: -20,
    zIndex: 1,
  },
  rightPhoto: {
    marginLeft: -20,
    zIndex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  heartContainer: {
    zIndex: 10,
    marginHorizontal: -10,
  },
  heartCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  keepButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepButtonText: {
    color: '#888',
    fontSize: 16,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: { top: '15%', left: '10%' },
  sparkle2: { top: '20%', right: '15%' },
  sparkle3: { bottom: '25%', left: '15%' },
  sparkle4: { top: '30%', left: '80%' },
  sparkle5: { bottom: '30%', right: '10%' },
  sparkleText: {
    fontSize: 28,
  },
});
