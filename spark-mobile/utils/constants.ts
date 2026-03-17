export const API_URL = 'https://spark-api-yvl3.onrender.com/api';

export const COLORS = {
  primary: '#FF6B6B',
  primaryDark: '#E55A5A',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#FFFFFF',
  backgroundDark: '#F5F5F5',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  textWhite: '#FFFFFF',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  border: '#E0E0E0',
  card: '#FFFFFF',
  shadow: '#000000',
} as const;

export const DARK_COLORS = {
  primary: '#FF6B6B',
  primaryDark: '#E55A5A',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#1A1A2E',
  backgroundDark: '#16213E',
  text: '#EAEAEA',
  textLight: '#8899AA',
  textWhite: '#FFFFFF',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  border: '#2A2A4A',
  card: '#1F2544',
  shadow: '#000000',
} as const;

export const getColors = (isDark: boolean) => isDark ? DARK_COLORS : COLORS;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const MAX_ENERGY = 25;
export const MAX_PHOTOS = 6;
export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 15;
