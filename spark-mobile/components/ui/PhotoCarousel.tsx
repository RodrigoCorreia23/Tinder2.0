import { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: { id: string; url: string }[];
  width?: number;
  height?: number;
  borderRadius?: number;
  fallbackText?: string;
}

export default function PhotoCarousel({
  photos,
  width = SCREEN_WIDTH,
  height = 400,
  borderRadius = 0,
  fallbackText = 'S',
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageList = photos.length > 0
    ? photos
    : [{ id: 'placeholder', url: `https://placehold.co/${Math.round(width)}x${Math.round(height)}/FF6B6B/ffffff?text=${fallbackText}` }];

  const goNext = () => {
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      <Image
        source={{ uri: imageList[currentIndex].url }}
        style={[styles.image, { borderRadius }]}
      />

      {/* Tap zones */}
      {imageList.length > 1 && (
        <View style={styles.tapZones}>
          <TouchableWithoutFeedback onPress={goPrev}>
            <View style={styles.tapLeft} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={goNext}>
            <View style={styles.tapRight} />
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* Progress bars at top (like Instagram stories) */}
      {imageList.length > 1 && (
        <View style={styles.progressContainer}>
          {imageList.map((_, index) => (
            <View key={index} style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  index < currentIndex
                    ? styles.progressDone
                    : index === currentIndex
                    ? styles.progressActive
                    : styles.progressPending,
                ]}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tapZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  // Instagram-style progress bars
  progressContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressDone: {
    width: '100%',
    backgroundColor: '#fff',
  },
  progressActive: {
    width: '100%',
    backgroundColor: '#fff',
  },
  progressPending: {
    width: '0%',
  },
});
