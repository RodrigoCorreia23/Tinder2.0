import api from './api';
import { Message } from '@/types';

export async function getMessages(matchId: string, cursor?: string) {
  const params = cursor ? { cursor, limit: 50 } : { limit: 50 };
  const res = await api.get(`/matches/${matchId}/messages`, { params });
  return res.data as { messages: Message[]; nextCursor: string | null };
}

export async function sendMessage(matchId: string, content: string) {
  const res = await api.post(`/matches/${matchId}/messages`, { content });
  return res.data as Message;
}

export async function markAsRead(matchId: string) {
  await api.put(`/matches/${matchId}/messages/read`);
}
