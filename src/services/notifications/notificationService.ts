import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PassPrediction } from '../../types/satellite';
import { formatAzimuthWithCardinal } from '../orbital/orbitUtils';

const SCHEDULED_PASSES_KEY = '@satellite_tracker_scheduled_passes';

// Configure foreground display behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // web or unsupported environment
}

export interface ScheduledPassNotification {
  notificationId: string;
  passId: string;
  satName: string;
  aosTime: string;
  maxElevation: number;
  leadMinutes: number;
  triggerTime: string;
}

export class NotificationService {
  private scheduledPasses: Map<string, ScheduledPassNotification> = new Map();

  constructor() {
    this.loadPersistedAlarms();
  }

  private async loadPersistedAlarms(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_PASSES_KEY);
      if (stored) {
        const list: ScheduledPassNotification[] = JSON.parse(stored);
        for (const item of list) {
          this.scheduledPasses.set(item.passId, item);
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Load alarms error:', err);
    }
  }

  private async persistAlarms(): Promise<void> {
    try {
      const list = Array.from(this.scheduledPasses.values());
      await AsyncStorage.setItem(SCHEDULED_PASSES_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[NotificationService] Persist alarms error:', err);
    }
  }

  /**
   * Request push/local notification permissions from OS.
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
      }

      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      return request.granted;
    } catch {
      return false;
    }
  }

  /**
   * Schedules a notification N minutes before satellite pass AOS.
   */
  public async schedulePassNotification(
    pass: PassPrediction,
    leadMinutes: number = 5
  ): Promise<boolean> {
    const aosTime = pass.aos.time.getTime();
    const triggerTime = aosTime - leadMinutes * 60 * 1000;

    if (triggerTime <= Date.now()) {
      console.warn('[NotificationService] Pass trigger time is in the past');
      return false;
    }

    try {
      await this.requestPermissions();

      const timeFormatted = pass.aos.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const azCard = formatAzimuthWithCardinal(pass.aos.azimuth);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🛰️ ¡Pase visible de ${pass.satName}!`,
          body: `El pase inicia en ${leadMinutes} min (${timeFormatted}) por ${azCard}. Elevación máx: ${pass.pca.elevation.toFixed(0)}°.`,
          data: { passId: pass.id, satId: pass.satId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
        },
      });

      const entry: ScheduledPassNotification = {
        notificationId,
        passId: pass.id,
        satName: pass.satName,
        aosTime: pass.aos.time.toISOString(),
        maxElevation: pass.pca.elevation,
        leadMinutes,
        triggerTime: new Date(triggerTime).toISOString(),
      };

      this.scheduledPasses.set(pass.id, entry);
      await this.persistAlarms();
      return true;
    } catch (err) {
      console.warn('[NotificationService] Schedule error:', err);
      return false;
    }
  }

  /**
   * Cancels a scheduled pass notification.
   */
  public async cancelPassNotification(passId: string): Promise<void> {
    const entry = this.scheduledPasses.get(passId);
    if (!entry) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(entry.notificationId);
    } catch (err) {
      console.warn('[NotificationService] Cancel error:', err);
    }

    this.scheduledPasses.delete(passId);
    await this.persistAlarms();
  }

  public isPassScheduled(passId: string): boolean {
    return this.scheduledPasses.has(passId);
  }

  public getScheduledPasses(): ScheduledPassNotification[] {
    return Array.from(this.scheduledPasses.values());
  }
}

export const notificationService = new NotificationService();

