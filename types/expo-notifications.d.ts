/**
 * Speqtus Medical Ordering Platform — Type declarations for expo-notifications
 * Supports TypeScript compilation across mobile and web targets (T4.3.1).
 */

declare module 'expo-notifications' {
  export interface NotificationPermissionsStatus {
    status: 'granted' | 'undetermined' | 'denied';
    granted: boolean;
    canAskAgain: boolean;
    expires: 'never' | number;
  }

  export interface ExpoPushToken {
    data: string;
    type: string;
  }

  export interface NotificationBehavior {
    shouldShowAlert: boolean;
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
  }

  export interface NotificationHandler {
    handleNotification: (notification: Notification) => Promise<NotificationBehavior>;
    handleSuccess?: (notificationId: string) => void;
    handleError?: (notificationId: string, error: Error) => void;
  }

  export interface NotificationChannelInput {
    name: string;
    importance: AndroidImportance;
    vibrationPattern?: number[];
    lightColor?: string;
    sound?: string | null;
  }

  export enum AndroidImportance {
    UNKNOWN = 0,
    UNSPECIFIED = 1,
    NONE = 2,
    MIN = 3,
    LOW = 4,
    DEFAULT = 5,
    HIGH = 6,
    MAX = 7,
  }

  export interface NotificationRequest {
    identifier: string;
    content: {
      title: string | null;
      subtitle: string | null;
      body: string | null;
      data: Record<string, unknown>;
      sound: string | null;
      badge: number | null;
    };
    trigger: unknown;
  }

  export interface Notification {
    date: number;
    request: NotificationRequest;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
  }

  export interface Subscription {
    remove: () => void;
  }

  export function getPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function requestPermissionsAsync(): Promise<NotificationPermissionsStatus>;
  export function getExpoPushTokenAsync(options?: { projectId?: string }): Promise<ExpoPushToken>;
  export function setNotificationHandler(handler: NotificationHandler): void;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: NotificationChannelInput
  ): Promise<unknown>;
  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): Subscription;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): Subscription;
  export function removeNotificationSubscription(subscription: Subscription): void;
}
