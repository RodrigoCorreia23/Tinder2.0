import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';

const GIPHY_API_KEY = 'dc6zaTOxFJmzC';
const GIPHY_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`;
const GIPHY_SEARCH_URL = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`;

interface GifData {
  id: string;
  images: {
    fixed_height_small: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
    original: { url: string };
  };
  title: string;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 8;
const PADDING = 16;
const ITEM_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export default function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      loadTrending();
      setQuery('');
    }
  }, [visible]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(GIPHY_TRENDING_URL);
      const json = await res.json();
      setGifs(json.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (q: string) => {
    if (!q.trim()) {
      loadTrending();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${GIPHY_SEARCH_URL}&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setGifs(json.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchGifs(text);
    }, 300);
  };

  const handleSelect = (gif: GifData) => {
    const url = gif.images.original.url;
    onSelect(url);
    onClose();
  };

  const renderGif = useCallback(({ item }: { item: GifData }) => {
    const thumbUrl = item.images.fixed_height_small?.url || item.images.fixed_height?.url;
    return (
      <TouchableOpacity
        style={styles.gifItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: thumbUrl }}
          style={styles.gifImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>GIFs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor={COLORS.textLight}
              value={query}
              onChangeText={handleChangeText}
              autoFocus={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); loadTrending(); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* GIF Grid */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={gifs}
              keyExtractor={(item) => item.id}
              renderItem={renderGif}
              numColumns={COLUMN_COUNT}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="images-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>No GIFs found</Text>
                </View>
              }
            />
          )}

          {/* Giphy attribution */}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>Powered by GIPHY</Text>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundDark,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  gridContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 8,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  gifItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundDark,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  attribution: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attributionText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
