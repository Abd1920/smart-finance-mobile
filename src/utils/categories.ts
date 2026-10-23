export const INCOME_CATEGORIES = [
  "Salary",
  "Freelancing",
  "Business",
  "Investment",
  "Rental Income",
  "Gift",
  "Other",
];

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Rent",
  "Bills",
  "Food & Dining",
  "Transport",
  "Education",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Travel",
  "Chit Fund",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Salary: "#22c55e",
  Freelancing: "#3b82f6",
  Business: "#8b5cf6",
  Investment: "#f59e0b",
  "Rental Income": "#06b6d4",
  Gift: "#ec4899",
  Groceries: "#f97316",
  Rent: "#ef4444",
  Bills: "#6366f1",
  "Food & Dining": "#f59e0b",
  Transport: "#14b8a6",
  Education: "#8b5cf6",
  Shopping: "#ec4899",
  Healthcare: "#10b981",
  Entertainment: "#f43f5e",
  Travel: "#0ea5e9",
  Other: "#94a3b8",
};

import Ionicons from "@expo/vector-icons/Ionicons";

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Salary: "cash",
  Freelancing: "laptop",
  Business: "briefcase",
  Investment: "trending-up",
  "Rental Income": "key",
  Gift: "gift",
  Groceries: "cart",
  Rent: "home",
  Bills: "receipt",
  "Food & Dining": "restaurant",
  Transport: "car",
  Education: "school",
  Shopping: "bag",
  Healthcare: "medkit",
  Entertainment: "film",
  Travel: "airplane",
  "Chit Fund": "people",
  Other: "ellipsis-horizontal-circle",
};
