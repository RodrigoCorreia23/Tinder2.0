import { create } from 'zustand';
import * as matchService from '@/services/match.service';
import { Profile, Energy, ReceivedLike } from '@/types';

interface SwipeState {
  profiles: Profile[];
  energy: Energy;
  isLoading: boolean;
  lastMatch: { matchId: string; userId: string } | null;
  receivedLikes: ReceivedLike[];
  likesLoading: boolean;

  loadProfiles: () => Promise<void>;
  loadEnergy: () => Promise<void>;
  swipe: (targetUserId: string, direction: 'like' | 'pass') => Promise<boolean>;
  clearMatch: () => void;
  loadReceivedLikes: () => Promise<void>;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  profiles: [],
  energy: { remaining: 25, max: 25, resetAt: null },
  isLoading: false,
  lastMatch: null,
  receivedLikes: [],
  likesLoading: false,

  loadProfiles: async () => {
    set({ isLoading: true });
    try {
      const allProfiles = await matchService.getDiscover();
      const profiles = allProfiles.filter(
        (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
      );
      set({ profiles, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadEnergy: async () => {
    const energy = await matchService.getEnergy();
    set({ energy });
  },

  swipe: async (targetUserId, direction) => {
    const result = await matchService.swipe(targetUserId, direction);

    // Remove swiped profile from stack AND from received likes
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== targetUserId),
      receivedLikes: state.receivedLikes.filter((l) => l.id !== targetUserId),
      energy: {
        ...state.energy,
        remaining: result.energyRemaining,
        resetAt: result.energyResetAt,
      },
    }));

    if (result.matched && result.matchId) {
      set({ lastMatch: { matchId: result.matchId, userId: targetUserId } });
      return true;
    }
    return false;
  },

  clearMatch: () => set({ lastMatch: null }),

  loadReceivedLikes: async () => {
    set({ likesLoading: true });
    try {
      const likes = await matchService.getReceivedLikes();
      set({ receivedLikes: likes, likesLoading: false });
    } catch {
      set({ likesLoading: false });
    }
  },
}));
