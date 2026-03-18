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

export async function deleteAccount() {
  await api.delete('/users/me');
}

export async function uploadPhoto(uri: string) {
  const formData = new FormData();
  formData.append('photo', {
    uri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  const res = await api.post('/users/me/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function activatePremium() {
  const res = await api.post('/users/me/premium');
  return res.data;
}

export async function reorderPhotos(photoIds: string[]) {
  const res = await api.put('/users/me/photos/reorder', { photoIds });
  return res.data;
}

export async function requestVerification(selfieUrl: string) {
  const res = await api.post('/users/me/verify', { selfieUrl });
  return res.data as { verified: boolean; confidence: string; reason: string };
}

export async function generateShareLink() {
  const res = await api.post('/users/me/share-link');
  return res.data as { link: string; token: string };
}

export async function registerPushToken(token: string) {
  const res = await api.put('/users/me/push-token', { token });
  return res.data;
}

export async function activateBoost() {
  const res = await api.post('/users/me/boost');
  return res.data as { id: string; boostedUntil: string };
}

export async function enableTravelMode(latitude: number, longitude: number, city: string) {
  const res = await api.post('/users/me/travel', { latitude, longitude, city });
  return res.data;
}

export async function disableTravelMode() {
  const res = await api.delete('/users/me/travel');
  return res.data;
}

export async function createCheckout(tier: 'premium' | 'gold') {
  const res = await api.post('/payments/checkout', { tier });
  return res.data as { url: string; sessionId: string };
}

export async function activatePremiumDebug(tier: 'premium' | 'gold') {
  const res = await api.post('/users/me/premium-debug', { tier });
  return res.data;
}
