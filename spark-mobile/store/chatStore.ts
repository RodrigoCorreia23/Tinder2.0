import { create } from 'zustand';
import * as chatService from '@/services/chat.service';
import { Message, Match } from '@/types';
import * as matchServiceApi from '@/services/match.service';

interface ChatState {
  matches: Match[];
  messages: Record<string, Message[]>;
  isLoading: boolean;

  loadMatches: () => Promise<void>;
  loadMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  addMessage: (matchId: string, message: Message) => void;
  markAsRead: (matchId: string) => Promise<void>;
  markMessagesAsReadLocally: (matchId: string, readBy: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  matches: [],
  messages: {},
  isLoading: false,

  loadMatches: async () => {
    set({ isLoading: true });
    try {
      const matches = await matchServiceApi.getMatches();
      set({ matches, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadMessages: async (matchId) => {
    const result = await chatService.getMessages(matchId);
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: result.messages.reverse(),
      },
    }));
  },

  sendMessage: async (matchId, content) => {
    const message = await chatService.sendMessage(matchId, content);
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] || []), message],
      },
    }));
  },

  addMessage: (matchId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: [...(state.messages[matchId] || []), message],
      },
    }));
  },

  markAsRead: async (matchId) => {
    await chatService.markAsRead(matchId);
  },

  markMessagesAsReadLocally: (matchId, readBy) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [matchId]: (state.messages[matchId] || []).map((msg) =>
          msg.senderId !== readBy ? { ...msg, isRead: true } : msg
        ),
      },
    }));
  },
}));
