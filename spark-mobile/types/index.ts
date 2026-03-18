export interface User {
  id: string;
  email: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
  bio: string | null;
  lookingFor: string[];
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  reputationScore: number;
  energyRemaining: number;
  energyResetAt: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  isPremium?: boolean;
  premiumUntil?: string | null;
  boostedUntil?: string | null;
  isTravelMode?: boolean;
  travelLatitude?: number | null;
  travelLongitude?: number | null;
  travelCity?: string | null;
  shareToken?: string;
  photos: Photo[];
  interests: Interest[];
}

export interface Photo {
  id: string;
  url: string;
  position: number;
}

export interface Interest {
  id: number;
  name: string;
  category: string | null;
}

export interface Profile {
  id: string;
  firstName: string;
  age: number;
  gender: string;
  bio: string | null;
  reputationScore: number;
  isVerified: boolean;
  distance: number | null;
  photos: Photo[];
  interests: Interest[];
  isSuperLiker?: boolean;
}

export interface Match {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    photos: Photo[];
    isVerified?: boolean;
  };
  compatibilityScore: number;
  expiresAt: string | null;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface NearbyUser {
  id: string;
  firstName: string;
  age: number;
  bio: string | null;
  reputationScore: number;
  photo: Photo | null;
  photos: Photo[];
  interests: Interest[];
  commonInterestsCount: number;
  isOnline: boolean;
  lastActiveAt: string;
  location: { lat: number; lng: number };
}

export interface ReceivedLike {
  id: string;
  firstName: string;
  age: number;
  gender: string;
  bio: string | null;
  reputationScore: number;
  photos: Photo[];
  interests: Interest[];
  likedAt: string;
  isSuperLike?: boolean;
}

export interface DatePlan {
  id: string;
  matchId: string;
  activity: string;
  venueName: string | null;
  venueAddress: string | null;
  suggestedTime: string | null;
  status: string;
  user1Accepted: boolean | null;
  user2Accepted: boolean | null;
  aiReasoning: string | null;
  createdAt: string;
}

export interface Energy {
  remaining: number;
  max: number;
  resetAt: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
