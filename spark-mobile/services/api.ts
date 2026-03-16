import axios from 'axios';
import * as storage from '@/utils/storage';
import { API_URL } from '@/utils/constants';
import { Platform } from 'react-native';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        await storage.setItem('accessToken', data.accessToken);
        await storage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — clear tokens and redirect to login
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');

        if (Platform.OS === 'web') {
          window.location.href = '/auth/login';
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
