import api from './api';

export async function blockUser(userId: string) {
  const res = await api.post(`/blocks/${userId}`);
  return res.data;
}

export async function unblockUser(userId: string) {
  const res = await api.delete(`/blocks/${userId}`);
  return res.data;
}

export async function reportUser(data: {
  reportedId: string;
  reason: string;
  details?: string;
}) {
  const res = await api.post('/blocks/report', data);
  return res.data;
}
