import ActionSheet from "@/components/ActionSheet";
import { Field, PrimaryButton, Select } from "@/components/form";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Debt = {
  _id: string;
  debtType: "to_pay" | "to_receive";
  personName: string;
  amount: number;
  currency: string;
  status: "pending" | "settled";
  description?: string;
  dueDate?: string;
  createdAt?: string;
  linkedAccount?: { name: string } | null;
  settlementAccount?: { name: string } | null;
};

type Account = { _id: string; name: string; currency: string };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function dueChip(debt: Debt): { label: string; color: string } | null {
  if (debt.status === "settled") return { label: "Settled", color: "#94a3b8" };
  if (!debt.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) {
    const d = Math.abs(diff);
    return { label: `Overdue · ${d} day${d > 1 ? "s" : ""}`, color: "#ef4444" };
  }
  if (diff === 0) return { label: "Due today", color: "#f59e0b" };
  if (diff <= 3)
    return {
      label: `Due in ${diff} day${diff > 1 ? "s" : ""}`,
      color: "#f59e0b",
    };
  return { label: `Due ${fmtDate(debt.dueDate)}`, color: "#94a3b8" };
}

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settlementAccount, setSettlementAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [sheet, setSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [debtsRes, accountsRes] = await Promise.all([
            api.get("/debts"),
            api.get("/accounts"),
          ]);
          setDebt(debtsRes.data.debts.find((d: Debt) => d._id === id) || null);
          setAccounts(accountsRes.data.accounts);
        } catch (err) {
          console.error("Failed to load debt", err);
        } finally {
          setLoading(false);
        }
      })();
    }, [id]),
  );

  const handleSettleToggle = async () => {
    setWorking(true);
    try {
      await api.put(
        `/debts/${id}/settle`,
        settlementAccount ? { settlementAccount } : {},
      );
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete debt",
      debt?.status === "pending" && debt?.linkedAccount
        ? "This will delete the debt and reverse its effect on the linked account balance."
        : "Are you sure you want to delete this debt?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/debts/${id}`);
              router.back();
            } catch (err: any) {
              Alert.alert(
                "Failed",
                err?.response?.data?.message || "Something went wrong.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Debt not found.</Text>
      </View>
    );
  }

  const isPay = debt.debtType === "to_pay";
  const isSettled = debt.status === "settled";
  const accent = isPay ? "#ef4444" : "#22c55e";
  const chip = dueChip(debt);

  const rows = [
    debt.dueDate && {
      icon: "calendar-outline",
      label: "Due date",
      value: fmtDate(debt.dueDate),
    },
    debt.description && {
      icon: "document-text-outline",
      label: "Description",
      value: debt.description,
    },
    debt.linkedAccount && {
      icon: "wallet-outline",
      label: "Linked account",
      value: debt.linkedAccount.name,
    },
    isSettled &&
      debt.settlementAccount && {
        icon: "checkmark-circle-outline",
        label: "Settled via",
        value: debt.settlementAccount.name,
      },
    debt.createdAt && {
      icon: "time-outline",
      label: "Added",
      value: fmtDate(debt.createdAt),
    },
  ].filter(Boolean) as {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <Stack.Screen
        options={{
          title: "Debt Details",
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setSheet(true)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View
        style={[styles.hero, { backgroundColor: colors.backgroundElement }]}
      >
        <View style={[styles.avatar, { backgroundColor: `${accent}33` }]}>
          <Text style={{ color: accent, fontSize: 26, fontWeight: "700" }}>
            {debt.personName?.[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "600",
            marginTop: 10,
          }}
        >
          {debt.personName}
        </Text>
        <Text
          style={{
            color: colors.text,
            opacity: 0.6,
            fontSize: 13,
            marginTop: 2,
          }}
        >
          {isSettled ? "Settled" : isPay ? "You owe" : "Owes you"}
        </Text>
        <Text
          style={{
            color: isSettled ? colors.text : accent,
            opacity: isSettled ? 0.6 : 1,
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {formatCurrency(debt.amount, debt.currency || "LKR")}
        </Text>
        {chip && (
          <View style={[styles.chip, { backgroundColor: `${chip.color}22` }]}>
            <Text
              style={{ color: chip.color, fontSize: 12, fontWeight: "600" }}
            >
              {chip.label}
            </Text>
          </View>
        )}
      </View>

      {rows.length > 0 && (
        <View
          style={[
            styles.details,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          {rows.map((r) => (
            <View key={r.label} style={styles.detailRow}>
              <Ionicons
                name={r.icon}
                size={20}
                color={colors.text}
                style={{ opacity: 0.6, width: 30 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.text, opacity: 0.55, fontSize: 12 }}
                >
                  {r.label}
                </Text>
                <Text
                  style={{ color: colors.text, fontSize: 15, marginTop: 2 }}
                >
                  {r.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!isSettled && (
        <Field
          label="Settlement account"
          optional
          hint={
            settlementAccount
              ? isPay
                ? "That account's balance will decrease (converted if its currency differs)."
                : "That account's balance will increase (converted if its currency differs)."
              : undefined
          }
        >
          <Select value={settlementAccount} onChange={setSettlementAccount}>
            <Picker.Item label="None" value="" />
            {accounts.map((a) => (
              <Picker.Item
                key={a._id}
                label={`${a.name} (${a.currency || "LKR"})`}
                value={a._id}
              />
            ))}
          </Select>
        </Field>
      )}

      <View style={{ marginTop: 24 }}>
        <PrimaryButton
          label={isSettled ? "Mark as Pending (undo)" : "Mark as Settled"}
          icon={isSettled ? "arrow-undo" : "checkmark-circle"}
          color={isSettled ? "#64748b" : "#22c55e"}
          loading={working}
          onPress={handleSettleToggle}
        />
      </View>

      <ActionSheet
        visible={sheet}
        title={debt.personName}
        onClose={() => setSheet(false)}
        actions={[
          ...(!isSettled
            ? [
                {
                  label: "Edit debt",
                  icon: "create-outline" as const,
                  onPress: () => router.push(`/debt-edit/${id}`),
                },
              ]
            : []),
          {
            label: "Delete debt",
            icon: "trash-outline" as const,
            danger: true,
            onPress: handleDelete,
          },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: { borderRadius: 16, padding: 20, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  details: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
