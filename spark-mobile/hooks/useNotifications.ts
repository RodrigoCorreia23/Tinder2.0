import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
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

      // Helper: only show notification if app is in background
      const notifyIfBackground = (title: string, body: string, data?: any) => {
        if (AppState.currentState !== 'active') {
          showNotification(title, body, data);
        }
      };

      // --- New message notification ---
      socket.on('new_message_notification', (data: { matchId: string; messagePreview: string }) => {
        notifyIfBackground(
          'New message',
          data.messagePreview,
          { tag: `message-${data.matchId}`, matchId: data.matchId }
        );
      });

      // --- Someone liked you (anonymous) ---
      socket.on('new_like', (_data: { message: string; isSuperLike?: boolean }) => {
        if (_data.isSuperLike) {
          notifyIfBackground(
            'Super Like!',
            'Someone super liked you!',
            { tag: 'new-like' }
          );
        } else {
          notifyIfBackground(
            'Someone likes you!',
            'Open Spark to see who it could be',
            { tag: 'new-like' }
          );
        }
        loadReceivedLikes();
      });

      // --- New match (no notification - the MatchAnimation handles this in-app) ---
      socket.on('new_match', (data: { matchId: string; userId: string }) => {
        // Only show notification if app is in background
        notifyIfBackground(
          "It's a Spark!",
          'You have a new match! Start chatting now.',
          { tag: `match-${data.matchId}`, matchId: data.matchId }
        );
        loadMatches();
        loadReceivedLikes();
      });

      // --- Match expiring soon ---
      socket.on('match_expiring', (data: { matchId: string }) => {
        notifyIfBackground(
          'Match expiring soon!',
          "Don't let this spark die — reply before time runs out!",
          { tag: `expiring-${data.matchId}` }
        );
      });

      // --- Match expired ---
      socket.on('match_expired', (data: { matchId: string }) => {
        notifyIfBackground(
          'Match expired',
          'A match expired because no one replied in time.',
          { tag: `expired-${data.matchId}` }
        );
        loadMatches();
      });

      // --- Energy refilled ---
      socket.on('energy_refilled', (_data: { energy: number }) => {
        notifyIfBackground(
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
