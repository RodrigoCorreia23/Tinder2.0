import { create } from 'zustand';
import * as storage from '@/utils/storage';
import * as authService from '@/services/auth.service';
import * as userService from '@/services/user.service';
import { User } from '@/types';
import { connectSocket, disconnectSocket } from '@/services/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    firstName: string;
    dateOfBirth: string;
    gender: string;
    lookingFor: string[];
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        const user = await userService.getMe();
        await connectSocket();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await storage.deleteItem('accessToken');
      await storage.deleteItem('refreshToken');
      set({ isLoading: false });
    }
  },

  signup: async (data) => {
    const result = await authService.signup(data);
    await storage.setItem('accessToken', result.tokens.accessToken);
    await storage.setItem('refreshToken', result.tokens.refreshToken);
    const user = await userService.getMe();
    await connectSocket();
    set({ user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const result = await authService.login(email, password);
    await storage.setItem('accessToken', result.tokens.accessToken);
    await storage.setItem('refreshToken', result.tokens.refreshToken);
    const user = await userService.getMe();
    await connectSocket();
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    disconnectSocket();
    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const user = await userService.getMe();
    set({ user });
  },
}));
