export const CURRENCY_SYMBOLS: Record<string, string> = {
  LKR: "Rs",
  QAR: "QR",
  USD: "$",
  SAR: "SR",
  INR: "₹",
  AED: "AED",
  EUR: "€",
  GBP: "£",
  KRW: "₩",
};

export function formatCurrency(amount: number, currency = "LKR") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const value = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${value}`;
}

export const CURRENCY_NAMES: Record<string, string> = {
  LKR: "Sri Lankan Rupee",
  QAR: "Qatari Riyal",
  USD: "US Dollar",
  SAR: "Saudi Riyal",
  INR: "Indian Rupee",
  AED: "UAE Dirham",
  EUR: "Euro",
  GBP: "British Pound",
  KRW: "South Korean Won",
};
