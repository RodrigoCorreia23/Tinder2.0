import api from './api';
import { NearbyUser } from '@/types';

export async function getNearby(lat: number, lng: number) {
  const res = await api.get('/map/nearby', { params: { lat, lng } });
  return res.data as NearbyUser[];
}
