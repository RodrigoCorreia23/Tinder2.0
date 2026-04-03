import prisma from '../../config/database';

/**
 * Validates an Expo Push Token format.
 */
function isValidExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * Sends a push notification via the Expo Push API.
 * Fails silently so it never breaks the calling flow.
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    if (!isValidExpoPushToken(expoPushToken)) {
      console.log('[PUSH] Invalid token format:', expoPushToken);
      return;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data: data || {},
        sound: 'default',
      }),
    });

    if (!response.ok) {
      console.log('[PUSH] Expo API responded with status:', response.status);
    }
  } catch (err) {
    console.log('[PUSH] Failed to send push notification:', err);
  }
}

/**
 * Sends a push notification to a user by their ID.
 * Looks up their expoPushToken from the database.
 * Fails silently if the user has no token or the push fails.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });

    if (!user?.expoPushToken) return;

    await sendPushNotification(user.expoPushToken, title, body, data);
  } catch (err) {
    console.log('[PUSH] Failed to send push to user:', userId, err);
  }
}
