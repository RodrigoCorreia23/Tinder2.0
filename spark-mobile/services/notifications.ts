import { Platform } from 'react-native';

let expoPushNotifications: any = null;
let expoConstants: any = null;
if (Platform.OS !== 'web') {
  try {
    expoPushNotifications = require('expo-notifications');
  } catch {
    console.warn('[NOTIFICATIONS] expo-notifications not available');
  }
  try {
    expoConstants = require('expo-constants').default;
  } catch {
    console.warn('[NOTIFICATIONS] expo-constants not available');
  }
}

/**
 * Request notification permissions
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      const result = await Notification.requestPermission();
      return result === 'granted';
    }

    // Mobile
    if (!expoPushNotifications) return false;

    const { status: existingStatus } = await expoPushNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await expoPushNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NOTIFICATIONS] Permission denied');
      return false;
    }

    // Set notification handler for foreground notifications
    expoPushNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return true;
  } catch (err) {
    console.error('[NOTIFICATIONS] Permission error:', err);
    return false;
  }
}

/**
 * Show a local notification
 */
export async function showNotification(title: string, body: string, data?: any) {
  try {
    if (Platform.OS === 'web') {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data?.tag || 'spark-notification',
        renotify: true,
      });

      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return;
    }

    // Mobile
    if (!expoPushNotifications) return;

    await expoPushNotifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Show error:', err);
  }
}

/**
 * Get the Expo Push Token for this device.
 * Returns null on web or if unable to obtain.
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (!expoPushNotifications) return null;

    const projectId = expoConstants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await expoPushNotifications.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {}),
    });

    return tokenData?.data || null;
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed to get push token:', err);
    return null;
  }
}
