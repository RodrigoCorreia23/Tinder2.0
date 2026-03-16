import api from './api';
import { User, Interest } from '@/types';

export async function getMe() {
  const res = await api.get('/users/me');
  return res.data as User;
}

export async function updateProfile(data: Partial<User>) {
  const res = await api.put('/users/me', data);
  return res.data;
}

export async function updateLocation(latitude: number, longitude: number) {
  const res = await api.put('/users/me/location', { latitude, longitude });
  return res.data;
}

export async function addPhoto(url: string) {
  const res = await api.post('/users/me/photos', { url });
  return res.data;
}

export async function deletePhoto(photoId: string) {
  await api.delete(`/users/me/photos/${photoId}`);
}

export async function updateInterests(interestIds: number[]) {
  const res = await api.put('/users/me/interests', { interestIds });
  return res.data;
}

export async function getAllInterests() {
  const res = await api.get('/users/interests');
  return res.data as Interest[];
}

export async function getReputation() {
  const res = await api.get('/users/me/reputation');
  return res.data;
}
