import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';
import { COLORS } from '@/utils/constants';
import { useColors } from '@/hooks/useColors';
import { Message } from '@/types';
import DatePlanFlow from '@/components/chat/DatePlanFlow';
import ProfileModal from '@/components/chat/ProfileModal';
import GifPicker from '@/components/chat/GifPicker';
import * as matchService from '@/services/match.service';
import * as blockService from '@/services/block.service';
import api from '@/services/api';

const isGifMessage = (content: string): boolean => {
  return content.includes('giphy.com') || content.endsWith('.gif');
};

export default function ChatScreen() {
  const C = useColors();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { matches, messages, loadMessages, sendMessage, addMessage, markAsRead, markMessagesAsReadLocally, loadMatches } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [showDatePlan, setShowDatePlan] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [iceBreakers, setIceBreakers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);

  // Typing indicator animation
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isTyping) return;
    const animate = () => {
      Animated.sequence([
        Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        if (isTyping) animate();
      });
    };
    animate();
    return () => {
      dot1Opacity.setValue(0.3);
      dot2Opacity.setValue(0.3);
      dot3Opacity.setValue(0.3);
    };
  }, [isTyping]);

  const chatMessages = messages[matchId!] || [];

  const currentMatch = matches.find((m) => m.id === matchId);

  const REPORT_REASONS = ['Inappropriate content', 'Spam', 'Harassment', 'Fake profile', 'Other'];

  const handleUnmatch = async () => {
    setShowActions(false);
    try {
      await matchService.unmatch(matchId!);
      await loadMatches();
      if (navigation.canGoBack()) navigation.goBack();
    } catch {
      // silent
    }
  };

  const handleBlock = async () => {
    setShowActions(false);
    const otherUserId = currentMatch?.otherUser.id;
    if (!otherUserId) return;
    try {
      await blockService.blockUser(otherUserId);
      await loadMatches();
      if (navigation.canGoBack()) navigation.goBack();
    } catch {
      // silent
    }
  };

  const handleReport = async (reason: string) => {
    setShowReportModal(false);
    setShowActions(false);
    const otherUserId = currentMatch?.otherUser.id;
    if (!otherUserId) return;
    try {
      await blockService.reportUser({ reportedId: otherUserId, reason });
    } catch {
      // silent
    }
  };

  // Set header with other user's name and photo + actions button
  useEffect(() => {
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const photoUrl = match.otherUser.photos[0]?.url;
      navigation.setOptions({
        headerStyle: { backgroundColor: C.background },
        headerShadowVisible: false,
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => setShowProfile(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : null}
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' }}>
              {match.otherUser.firstName}
            </Text>
          </TouchableOpacity>
        ),
        headerTintColor: '#FFFFFF',
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowActions(true)} style={{ paddingHorizontal: 12 }}>
            <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      });
    }
  }, [matchId, matches, C]);

  useEffect(() => {
    if (!matchId) return;
    loadMessages(matchId);
    markAsRead(matchId);

    // Load ice breakers if no messages
    loadIceBreakers();
  }, [matchId]);

  const loadIceBreakers = async () => {
    if (!matchId) return;
    try {
      const res = await api.get(`/matches/${matchId}/ice-breakers`);
      setIceBreakers(res.data.iceBreakers || []);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    if (!matchId) return;

    // Join socket room
    const socket = getSocket();
    if (socket) {
      socket.emit('join_match', matchId);

      socket.on('new_message', (data: { matchId: string; message: Message }) => {
        if (data.matchId === matchId) {
          addMessage(matchId, data.message);
          markAsRead(matchId);
        }
      });

      socket.on('user_typing', (data: { matchId: string }) => {
        if (data.matchId === matchId) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      });

      socket.on('message_read', (data: { matchId: string; readBy: string }) => {
        if (data.matchId === matchId) {
          markMessagesAsReadLocally(matchId, data.readBy);
        }
      });

      return () => {
        socket.emit('leave_match', matchId);
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('message_read');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [matchId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !matchId) return;
    setText('');
    await sendMessage(matchId, trimmed);
    flatListRef.current?.scrollToEnd();
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!matchId) return;
    await sendMessage(matchId, gifUrl);
    flatListRef.current?.scrollToEnd();
  };

  const handleChangeText = (t: string) => {
    setText(t);
    const socket = getSocket();
    if (socket && matchId) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 2000) {
        socket.emit('typing', matchId);
        lastTypingEmitRef.current = now;
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const isGif = isGifMessage(item.content);

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : [styles.theirMessage, { backgroundColor: C.card }], isGif && styles.gifBubble]}>
        {isGif ? (
          <Image
            source={{ uri: item.content }}
            style={styles.gifMessageImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.messageText, { color: C.text }, isMe && styles.myMessageText]}>
            {item.content}
          </Text>
        )}
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMe && (
            <Ionicons
              name={item.isRead ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={item.isRead ? COLORS.secondary : 'rgba(255,255,255,0.5)'}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.backgroundDark }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          iceBreakers.length > 0 ? (
            <View style={styles.iceBreakersContainer}>
              <View style={styles.iceBreakersIcon}>
                <Ionicons name="sparkles" size={28} color={COLORS.secondary} />
              </View>
              <Text style={[styles.iceBreakersTitle, { color: C.text }]}>Break the ice!</Text>
              <Text style={[styles.iceBreakersSubtitle, { color: C.textLight }]}>Tap a suggestion to send it</Text>
              {iceBreakers.map((msg, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.iceBreaker, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={async () => {
                    await sendMessage(matchId!, msg);
                    setIceBreakers([]);
                    flatListRef.current?.scrollToEnd();
                  }}
                >
                  <Text style={[styles.iceBreakerText, { color: C.text }]}>{msg}</Text>
                  <Ionicons name="send" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Animated.View style={[styles.typingDot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot3Opacity }]} />
          </View>
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: C.background, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.backgroundDark }]}
          onPress={() => setShowDatePlan(true)}
        >
          <Ionicons name="calendar" size={22} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.backgroundDark }]}
          onPress={() => setShowGifPicker(true)}
        >
          <Ionicons name="happy-outline" size={22} color={C.secondary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: C.backgroundDark, color: C.text }]}
          placeholder="Type a message..."
          placeholderTextColor={C.textLight}
          value={text}
          onChangeText={handleChangeText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Plan Flow */}
      <DatePlanFlow
        matchId={matchId!}
        visible={showDatePlan}
        onClose={() => setShowDatePlan(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        match={currentMatch}
      />

      {/* GIF Picker */}
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={handleSendGif}
      />

      {/* Actions Modal */}
      <Modal visible={showActions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View style={[styles.actionsSheet, { backgroundColor: C.card }]}>
            <Text style={[styles.actionsTitle, { color: C.text }]}>Actions</Text>

            <TouchableOpacity
              style={[styles.actionsItem, { borderBottomColor: C.border }]}
              onPress={() => { setShowActions(false); setShowProfile(true); }}
            >
              <Ionicons name="person-outline" size={22} color={C.text} />
              <Text style={[styles.actionsItemText, { color: C.text }]}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionsItem, { borderBottomColor: C.border }]}
              onPress={handleUnmatch}
            >
              <Ionicons name="heart-dislike-outline" size={22} color={COLORS.warning} />
              <Text style={[styles.actionsItemText, { color: COLORS.warning }]}>Unmatch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionsItem, { borderBottomColor: C.border }]}
              onPress={handleBlock}
            >
              <Ionicons name="ban-outline" size={22} color={COLORS.danger} />
              <Text style={[styles.actionsItemText, { color: COLORS.danger }]}>Block User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionsItem, { borderBottomWidth: 0 }]}
              onPress={() => { setShowActions(false); setShowReportModal(true); }}
            >
              <Ionicons name="flag-outline" size={22} color={COLORS.danger} />
              <Text style={[styles.actionsItemText, { color: COLORS.danger }]}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionsCancelBtn}
              onPress={() => setShowActions(false)}
            >
              <Text style={styles.actionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.actionsOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View style={[styles.actionsSheet, { backgroundColor: C.card }]}>
            <Text style={[styles.actionsTitle, { color: C.text }]}>Report User</Text>
            <Text style={{ fontSize: 13, color: C.textLight, marginBottom: 8 }}>
              Select a reason for reporting:
            </Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.actionsItem, { borderBottomColor: C.border }]}
                onPress={() => handleReport(reason)}
              >
                <Text style={[styles.actionsItemText, { color: C.text }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.actionsCancelBtn}
              onPress={() => setShowReportModal(false)}
            >
              <Text style={styles.actionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
  },
  gifBubble: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  gifMessageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
  },
  myMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Typing indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
  },
  // Ice breakers
  iceBreakersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  iceBreakersIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FFF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iceBreakersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  iceBreakersSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  iceBreaker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  iceBreakerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 28,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundDark,
    fontSize: 15,
    color: COLORS.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  // Actions modal
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionsItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionsCancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  actionsCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
});
