import api from './api';
import { Tokens } from '@/types';

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
  lookingFor: string[];
}

export async function signup(data: SignupData) {
  const res = await api.post('/auth/signup', data);
  return res.data as { user: any; tokens: Tokens };
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data as { user: any; tokens: Tokens };
}

export async function refreshTokens(refreshToken: string) {
  const res = await api.post('/auth/refresh', { refreshToken });
  return res.data as Tokens;
}
