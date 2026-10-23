import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/utils/categories";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type TxItem = {
  _id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  account?: { name: string };
  toAccount?: { name: string };
};

export default function TransactionRow({
  item,
  first,
  last,
  onPress,
  showAccount = true,
  showDate = false,
}: {
  item: TxItem;
  first?: boolean;
  last?: boolean;
  onPress?: () => void;
  showAccount?: boolean;
  showDate?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const isTransfer = item.type === "transfer";
  const catColor = isTransfer
    ? "#8b5cf6"
    : CATEGORY_COLORS[item.category] || "#94a3b8";
  const icon = isTransfer
    ? "swap-horizontal"
    : CATEGORY_ICONS[item.category] || "ellipsis-horizontal-circle";

  const parts: string[] = [];
  if (!isTransfer && item.description) parts.push(item.category);
  if (showAccount && item.account?.name) parts.push(item.account.name);
  if (showDate) {
    parts.push(
      new Date(item.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: colors.backgroundElement },
        first && styles.first,
        last && styles.last,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "rgba(128,128,128,0.25)",
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: `${catColor}26` }]}>
        <Ionicons name={icon} size={20} color={catColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}
          numberOfLines={1}
        >
          {isTransfer
            ? `Transfer → ${item.toAccount?.name ?? ""}`
            : item.description || item.category}
        </Text>
        {parts.length > 0 ? (
          <Text
            style={{
              color: colors.text,
              opacity: 0.55,
              fontSize: 12,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {parts.join(" · ")}
          </Text>
        ) : null}
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: "bold",
          color:
            item.type === "income"
              ? "#22c55e"
              : item.type === "expense"
                ? "#ef4444"
                : colors.text,
        }}
      >
        {item.type === "income" ? "+" : item.type === "expense" ? "-" : "⇄ "}
        {formatCurrency(item.amount, item.currency || "LKR")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  first: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  last: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
