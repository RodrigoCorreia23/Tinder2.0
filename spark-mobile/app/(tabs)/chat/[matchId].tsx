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
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';
import { COLORS } from '@/utils/constants';
import { Message } from '@/types';
import DatePlanFlow from '@/components/chat/DatePlanFlow';
import api from '@/services/api';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const navigation = useNavigation();
  const { matches, messages, loadMessages, sendMessage, addMessage, markAsRead } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [showDatePlan, setShowDatePlan] = useState(false);
  const [iceBreakers, setIceBreakers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const chatMessages = messages[matchId!] || [];

  // Set header with other user's name and photo
  useEffect(() => {
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const photoUrl = match.otherUser.photos[0]?.url;
      navigation.setOptions({
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : null}
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: COLORS.text }}>
              {match.otherUser.firstName}
            </Text>
          </View>
        ),
      });
    }
  }, [matchId, matches]);

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
        // Could show typing indicator here
      });

      return () => {
        socket.emit('leave_match', matchId);
        socket.off('new_message');
        socket.off('user_typing');
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
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
              <Text style={styles.iceBreakersTitle}>Break the ice!</Text>
              <Text style={styles.iceBreakersSubtitle}>Tap a suggestion to send it</Text>
              {iceBreakers.map((msg, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.iceBreaker}
                  onPress={async () => {
                    await sendMessage(matchId!, msg);
                    setIceBreakers([]);
                    flatListRef.current?.scrollToEnd();
                  }}
                >
                  <Text style={styles.iceBreakerText}>{msg}</Text>
                  <Ionicons name="send" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.datePlanBtn}
          onPress={() => setShowDatePlan(true)}
        >
          <Ionicons name="calendar" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textLight}
          value={text}
          onChangeText={(t) => {
            setText(t);
            const socket = getSocket();
            if (socket && matchId) {
              socket.emit('typing', matchId);
            }
          }}
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
  messageText: {
    fontSize: 15,
    color: COLORS.text,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
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
  datePlanBtn: {
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
});
