import api from './api';
import { NearbyUser } from '@/types';

interface NearbyResponse {
  users: NearbyUser[];
  radius: number;
  isPremium: boolean;
}

export async function getNearby(
  lat: number,
  lng: number,
  filters?: { minReputation?: number; commonInterestsOnly?: boolean }
) {
  const params: any = { lat, lng };
  if (filters?.minReputation) params.minReputation = filters.minReputation;
  if (filters?.commonInterestsOnly) params.commonInterestsOnly = 'true';

  const res = await api.get('/map/nearby', { params });
  return res.data as NearbyResponse;
}
