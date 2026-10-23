export type DebtNotification = {
  id: string;
  type: "overdue" | "due_today" | "due_soon" | "due_week";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  debtId: string;
};

type Debt = {
  _id: string;
  debtType: "to_pay" | "to_receive";
  personName: string;
  amount: number;
  currency: string;
  status: "pending" | "settled";
  dueDate?: string;
};

const fmt = (v: number, currency: string) => {
  const value = Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  });
  return `${currency} ${value}`;
};

// Mirrors the web app's NotificationContext logic exactly: overdue, due
// today, due within 3 days, or due within 7 days - all ignoring settled debts.
export function buildDebtNotifications(debts: Debt[]): DebtNotification[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: DebtNotification[] = [];

  for (const debt of debts) {
    if (debt.status === "settled" || !debt.dueDate) continue;

    const due = new Date(debt.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isPay = debt.debtType === "to_pay";
    const amount = fmt(debt.amount, debt.currency || "LKR");

    if (diffDays < 0) {
      const d = Math.abs(diffDays);
      items.push({
        id: `overdue-${debt._id}`,
        type: "overdue",
        priority: "high",
        title: isPay ? "Overdue Payment" : "Overdue Receivable",
        message: isPay
          ? `You owe ${debt.personName} ${amount} - ${d} day${d > 1 ? "s" : ""} overdue`
          : `${debt.personName} owes you ${amount} - ${d} day${d > 1 ? "s" : ""} overdue`,
        debtId: debt._id,
      });
    } else if (diffDays === 0) {
      items.push({
        id: `today-${debt._id}`,
        type: "due_today",
        priority: "high",
        title: "Due Today",
        message: isPay
          ? `Payment of ${amount} to ${debt.personName} is due today`
          : `${debt.personName} should pay you ${amount} today`,
        debtId: debt._id,
      });
    } else if (diffDays <= 3) {
      items.push({
        id: `soon-${debt._id}`,
        type: "due_soon",
        priority: "medium",
        title: "Due Soon",
        message: isPay
          ? `Payment of ${amount} to ${debt.personName} in ${diffDays} day${diffDays > 1 ? "s" : ""}`
          : `${debt.personName} owes you ${amount} - due in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
        debtId: debt._id,
      });
    } else if (diffDays <= 7) {
      items.push({
        id: `week-${debt._id}`,
        type: "due_week",
        priority: "low",
        title: "Upcoming Due Date",
        message: isPay
          ? `Payment of ${amount} to ${debt.personName} due in ${diffDays} days`
          : `${debt.personName} owes you ${amount} - due in ${diffDays} days`,
        debtId: debt._id,
      });
    }
  }

  return items;
}
