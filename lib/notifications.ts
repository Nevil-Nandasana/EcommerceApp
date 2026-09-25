/**
 * Speqtus Medical Ordering Platform — Push Notifications Helper
 * Governed by PRD Section 6.3, FR-15, F-18, and T4.3.1.
 * Handles token registration, Android channels, and Supabase profile synchronization.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure foreground notification presentation behavior
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Non-fatal fallback if native notification runtime is uninitialized
  }
}

/**
 * Registers device for push notifications and returns Expo Push Token string.
 * Returns null if permissions are denied or if running on unsupported environments (e.g. web/simulator).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications are primarily supported on physical mobile devices
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // 1. Configure Android high-priority notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A2540',
      });
    }

    // 2. Check and request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // 3. Resolve project ID from Expo Constants if configured
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return tokenResponse.data;
  } catch (error) {
    // Non-fatal fallback for development/simulator environments
    // eslint-disable-next-line no-console
    console.warn('Failed to get push token for push notification:', error);
    return null;
  }
}

/**
 * Persists the registered Expo push token to the user's profile in Supabase.
 */
export async function savePushTokenToSupabase(
  userId: string,
  token: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        push_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Error saving push token to Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Unexpected error saving push token:', err);
    return false;
  }
}

/**
 * Helper to register notification listeners for foreground delivery and user click response.
 * Returns a cleanup function that removes all registered listeners.
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
): () => void {
  const receivedSubscription = onNotificationReceived
    ? Notifications.addNotificationReceivedListener(onNotificationReceived)
    : null;

  const responseSubscription = onNotificationResponse
    ? Notifications.addNotificationResponseReceivedListener(onNotificationResponse)
    : null;

  return () => {
    if (receivedSubscription) {
      Notifications.removeNotificationSubscription(receivedSubscription);
    }
    if (responseSubscription) {
      Notifications.removeNotificationSubscription(responseSubscription);
    }
  };
}
