import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type Debt = {
  _id: string;
  debtType: "to_pay" | "to_receive";
  personName: string;
  amount: number;
  currency: string;
  status: "pending" | "settled";
  dueDate?: string;
};

// Show the alert even if the app is open in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Debt reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

const fmt = (v: number, currency: string) =>
  `${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Cancels every previously-scheduled debt reminder, then schedules fresh
// ones from the current debt list - so edits, settlements, and deletions
// are always reflected rather than leaving stale notifications behind.
export async function syncDebtNotifications(debts: Debt[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith("debt-")) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const now = new Date();

  for (const debt of debts) {
    if (debt.status === "settled" || !debt.dueDate) continue;

    const due = new Date(debt.dueDate);
    const isPay = debt.debtType === "to_pay";
    const amount = fmt(debt.amount, debt.currency || "LKR");

    const threeDaysBefore = new Date(due);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    threeDaysBefore.setHours(9, 0, 0, 0);

    const onDueDate = new Date(due);
    onDueDate.setHours(9, 0, 0, 0);

    if (threeDaysBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `debt-${debt._id}-3day`,
        content: {
          title: "Debt due in 3 days",
          body: isPay
            ? `Payment of ${amount} to ${debt.personName} is due in 3 days`
            : `${debt.personName} owes you ${amount} - due in 3 days`,
          data: { debtId: debt._id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: threeDaysBefore,
        },
      });
    }

    if (onDueDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `debt-${debt._id}-dueday`,
        content: {
          title: "Debt due today",
          body: isPay
            ? `Payment of ${amount} to ${debt.personName} is due today`
            : `${debt.personName} should pay you ${amount} today`,
          data: { debtId: debt._id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: onDueDate,
        },
      });
    }
  }
}
