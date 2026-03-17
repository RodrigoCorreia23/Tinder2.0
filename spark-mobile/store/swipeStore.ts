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
  superLikeRemaining: number;
  superLikeResetAt: string | null;

  loadProfiles: () => Promise<void>;
  loadEnergy: () => Promise<void>;
  swipe: (targetUserId: string, direction: 'like' | 'pass', isSuperLike?: boolean) => Promise<boolean>;
  rewind: () => Promise<boolean>;
  clearMatch: () => void;
  loadReceivedLikes: () => Promise<void>;
  loadSuperLikeStatus: () => Promise<void>;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  profiles: [],
  energy: { remaining: 25, max: 25, resetAt: null },
  isLoading: false,
  lastMatch: null,
  receivedLikes: [],
  likesLoading: false,
  superLikeRemaining: 1,
  superLikeResetAt: null,

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

  loadSuperLikeStatus: async () => {
    try {
      const status = await matchService.getSuperLikeStatus();
      set({ superLikeRemaining: status.remaining, superLikeResetAt: status.resetAt });
    } catch {
      // If endpoint not available yet, keep defaults
    }
  },

  swipe: async (targetUserId, direction, isSuperLike) => {
    const result = await matchService.swipe(targetUserId, direction, isSuperLike);

    // Remove swiped profile from stack AND from received likes
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== targetUserId),
      receivedLikes: state.receivedLikes.filter((l) => l.id !== targetUserId),
      energy: {
        ...state.energy,
        remaining: result.energyRemaining,
        resetAt: result.energyResetAt,
      },
      // Decrement super like count locally on super like
      superLikeRemaining: isSuperLike
        ? Math.max(0, state.superLikeRemaining - 1)
        : state.superLikeRemaining,
    }));

    if (result.matched && result.matchId) {
      set({ lastMatch: { matchId: result.matchId, userId: targetUserId } });
      return true;
    }
    return false;
  },

  rewind: async () => {
    try {
      const result = await matchService.rewindLastSwipe();
      set((state) => ({
        profiles: [result.profile, ...state.profiles],
        energy: {
          ...state.energy,
          remaining: result.energyRemaining,
        },
      }));
      return true;
    } catch {
      return false;
    }
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
