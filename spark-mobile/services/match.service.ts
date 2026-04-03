import api from './api';
import { Match, Profile, Energy, ReceivedLike } from '@/types';

export async function getDiscover() {
  const res = await api.get('/swipes/discover');
  return res.data as Profile[];
}

export async function swipe(targetUserId: string, direction: 'like' | 'pass', isSuperLike?: boolean) {
  const res = await api.post('/swipes', { targetUserId, direction, isSuperLike });
  return res.data as {
    matched: boolean;
    matchId?: string;
    energyRemaining: number;
    energyResetAt: string | null;
  };
}

export async function getEnergy() {
  const res = await api.get('/swipes/energy');
  return res.data as Energy;
}

export async function getSuperLikeStatus() {
  const res = await api.get('/swipes/super-like-status');
  return res.data as { remaining: number; resetAt: string | null };
}

export async function getMatches() {
  const res = await api.get('/matches');
  return res.data as Match[];
}

export async function getMatch(matchId: string) {
  const res = await api.get(`/matches/${matchId}`);
  return res.data;
}

export async function unmatch(matchId: string) {
  await api.delete(`/matches/${matchId}`);
}

export async function getCompatibility(matchId: string) {
  const res = await api.get(`/matches/${matchId}/compatibility`);
  return res.data;
}

export async function getReceivedLikes() {
  const res = await api.get('/swipes/likes');
  return res.data as ReceivedLike[];
}

export async function rewindLastSwipe() {
  const res = await api.post('/swipes/rewind');
  return res.data as {
    profile: Profile;
    energyRemaining: number;
  };
}
