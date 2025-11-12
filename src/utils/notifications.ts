// src/notifications.ts
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHANNEL_ID = 'medicine-reminders';

async function ensureChannel() {
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Medicine Alerts',
      importance: 5,
      visibility: 1,
      lights: true,
      vibration: true,
      sound: 'default',
    });
  }
}

// Android 12+ exact alarm permission
// Android 12+ exact alarm permission
async function requestExactAlarmPermission() {
  if (Capacitor.getPlatform() === 'android') {
    console.log('Exact alarm permission check skipped (not implemented)');
  }
}


export async function scheduleDoseNotifications(
  medicineName: string,
  scheduleTimes: Date[]
) {
  if (!Capacitor.isNativePlatform()) return;

  await ensureChannel();
  await requestExactAlarmPermission();

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    console.warn('Notification permission denied');
    return;
  }

  const notifications = scheduleTimes
    .map((time, index) => {
      const notifyTime = new Date(time.getTime() - 60 * 60 * 1000);
      if (notifyTime <= new Date()) return null;

      return {
        id: Date.now() + index,
        title: 'Medicine Reminder',
        body: `${medicineName} – take in 1 hour!`,
        schedule: { at: notifyTime, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        sound: 'default',
      };
    })
    .filter(Boolean) as any[];

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
    const pending = await LocalNotifications.getPending();
    console.log('SCHEDULED → PENDING:', pending.notifications);
  }
}

// TEST: 15-second notification
export async function testNotification() {
  await ensureChannel();
  await requestExactAlarmPermission();

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    alert('Please allow notifications in Settings');
    return;
  }

  const fireAt = new Date(Date.now() + 15 * 1000);

  const notif = {
    id: 999,
    title: 'TEST SUCCESS',
    body: 'Notifications WORK!',
    schedule: { at: fireAt, allowWhileIdle: true },
    channelId: CHANNEL_ID,
    sound: 'default',
  };

  await LocalNotifications.schedule({ notifications: [notif] });
  const pending = await LocalNotifications.getPending();
  console.log('TEST PENDING:', pending);
  alert('Scheduled! CLOSE APP NOW.');
}