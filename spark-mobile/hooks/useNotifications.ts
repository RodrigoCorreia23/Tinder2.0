import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { requestPermissions, showNotification, getExpoPushToken } from '@/services/notifications';
import { useSwipeStore } from '@/store/swipeStore';
import { useChatStore } from '@/store/chatStore';
import * as userService from '@/services/user.service';

/**
 * Hook that listens to socket events and shows push notifications.
 * Should be called once in the root layout or main tab layout.
 */
export function useNotifications() {
  const loadReceivedLikes = useSwipeStore((s) => s.loadReceivedLikes);
  const loadMatches = useChatStore((s) => s.loadMatches);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      // Request permission
      const granted = await requestPermissions();
      if (!granted) {
        console.log('[NOTIFICATIONS] Permission not granted');
        return;
      }
      console.log('[NOTIFICATIONS] Permission granted, setting up listeners');

      // Register push token with backend
      try {
        const pushToken = await getExpoPushToken();
        if (pushToken) {
          await userService.registerPushToken(pushToken);
          console.log('[NOTIFICATIONS] Push token registered:', pushToken);
        }
      } catch (err) {
        console.log('[NOTIFICATIONS] Failed to register push token:', err);
      }

      // Wait a bit for socket to connect
      const waitForSocket = () => {
        return new Promise<void>((resolve) => {
          const check = () => {
            const socket = getSocket();
            if (socket) {
              resolve();
            } else {
              setTimeout(check, 500);
            }
          };
          check();
        });
      };

      await waitForSocket();
      const socket = getSocket();
      if (!socket) return;

      // --- New message notification ---
      socket.on('new_message_notification', (data: { matchId: string; messagePreview: string }) => {
        console.log('[NOTIFICATIONS] New message received:', data);
        showNotification(
          'New message',
          data.messagePreview,
          { tag: `message-${data.matchId}`, matchId: data.matchId }
        );
      });

      // --- Someone liked you (anonymous) ---
      socket.on('new_like', (_data: { message: string }) => {
        console.log('[NOTIFICATIONS] New like received!');
        showNotification(
          'Someone likes you!',
          'Open Spark to see who it could be',
          { tag: 'new-like' }
        );
        // Refresh the likes list
        loadReceivedLikes();
      });

      // --- New match ---
      socket.on('new_match', (data: { matchId: string; userId: string }) => {
        showNotification(
          "It's a Spark!",
          'You have a new match! Start chatting now.',
          { tag: `match-${data.matchId}`, matchId: data.matchId }
        );
        // Refresh matches
        loadMatches();
        loadReceivedLikes();
      });

      // --- Match expiring soon ---
      socket.on('match_expiring', (data: { matchId: string }) => {
        showNotification(
          'Match expiring soon!',
          "Don't let this spark die — reply before time runs out!",
          { tag: `expiring-${data.matchId}` }
        );
      });

      // --- Match expired ---
      socket.on('match_expired', (data: { matchId: string }) => {
        showNotification(
          'Match expired',
          'A match expired because no one replied in time.',
          { tag: `expired-${data.matchId}` }
        );
        loadMatches();
      });

      // --- Energy refilled ---
      socket.on('energy_refilled', (_data: { energy: number }) => {
        showNotification(
          'Energy refilled!',
          'You have 25 new swipes. Go find your spark!',
          { tag: 'energy' }
        );
      });

      console.log('[NOTIFICATIONS] All listeners registered');
    };

    setup();
  }, []);
}
