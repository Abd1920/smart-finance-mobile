import ScreenHeader from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
};

type TabKey = "all" | "to_pay" | "to_receive" | "settled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "to_pay", label: "I Owe" },
  { key: "to_receive", label: "Owe Me" },
  { key: "settled", label: "Settled" },
];

const DAY = 86400000;

function dueInfo(debt: Debt): { label: string; color: string } | null {
  if (debt.status === "settled") return { label: "Settled", color: "#94a3b8" };
  if (!debt.dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / DAY);

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
  return {
    label: `Due ${new Date(debt.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    color: "#94a3b8",
  };
}

function SummaryItem({
  label,
  hint,
  value,
  color,
  currency,
  textColor,
  big,
}: {
  label: string;
  hint: string;
  value: number;
  color: string;
  currency: string;
  textColor: string;
  big?: boolean;
}) {
  return (
    <View style={big ? styles.summaryBig : styles.summaryItem}>
      <Text style={{ color: textColor, opacity: 0.6, fontSize: 12 }}>
        {label}
      </Text>
      <Text
        style={{
          color,
          fontSize: big ? 26 : 16,
          fontWeight: "bold",
          marginTop: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatCurrency(value, currency)}
      </Text>
      <Text
        style={{ color: textColor, opacity: 0.4, fontSize: 10, marginTop: 2 }}
      >
        {hint}
      </Text>
    </View>
  );
}

export default function DebtsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalToPay, setTotalToPay] = useState(0);
  const [totalToReceive, setTotalToReceive] = useState(0);
  const [primaryCurrency, setPrimaryCurrency] = useState("LKR");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Open this tab on a specific sub-tab (used by the Dashboard cards)
  useEffect(() => {
    if (params.tab && TABS.some((t) => t.key === params.tab)) {
      setActiveTab(params.tab as TabKey);
      router.setParams({ tab: undefined });
    }
  }, [params.tab]);

  const fetchDebts = async () => {
    try {
      const res = await api.get("/debts");
      setDebts(res.data.debts);
      setTotalToPay(res.data.totalToPay);
      setTotalToReceive(res.data.totalToReceive);
      setPrimaryCurrency(res.data.primaryCurrency || "LKR");
    } catch (err) {
      console.error("Failed to load debts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDebts();
  };

  // Same rules as the web app: "All" = pending only, settled debts live under "Settled"
  const visible = useMemo(() => {
    const list = debts.filter((d) => {
      if (activeTab === "all") return d.status === "pending";
      if (activeTab === "to_pay")
        return d.debtType === "to_pay" && d.status === "pending";
      if (activeTab === "to_receive")
        return d.debtType === "to_receive" && d.status === "pending";
      return d.status === "settled";
    });

    const created = (d: Debt) =>
      d.createdAt ? new Date(d.createdAt).getTime() : 0;

    return list.sort((a, b) => {
      if (activeTab === "settled") return created(b) - created(a);
      // Pending: most urgent first (overdue, then nearest due date), no due date last
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return created(b) - created(a);
    });
  }, [debts, activeTab]);

  const net = totalToReceive - totalToPay;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScreenHeader
        title="Debts & Loans"
        subtitle="Track money you owe and money owed to you"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              <View
                style={[
                  styles.summary,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                <SummaryItem
                  big
                  label="Net Position"
                  hint="Owed to me − I owe"
                  value={net}
                  color={net >= 0 ? "#3b82f6" : "#f97316"}
                  currency={primaryCurrency}
                  textColor={colors.text}
                />
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <SummaryItem
                    label="Debt to Pay"
                    hint="Pending payments"
                    value={totalToPay}
                    color="#f97316"
                    currency={primaryCurrency}
                    textColor={colors.text}
                  />
                  <View style={styles.summaryVDivider} />
                  <SummaryItem
                    label="Money to Receive"
                    hint="Pending receivables"
                    value={totalToReceive}
                    color="#8b5cf6"
                    currency={primaryCurrency}
                    textColor={colors.text}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.segment,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                {TABS.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.segmentItem,
                        active && styles.segmentItemActive,
                      ]}
                      onPress={() => setActiveTab(t.key)}
                    >
                      <Text
                        style={{
                          color: active ? "#fff" : colors.text,
                          fontWeight: active ? "600" : "400",
                          fontSize: 13,
                        }}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                {visible.length} result{visible.length !== 1 ? "s" : ""} found
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPay = item.debtType === "to_pay";
            const settled = item.status === "settled";
            const accent = isPay ? "#ef4444" : "#22c55e";
            const chip = dueInfo(item);
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement },
                ]}
                onPress={() => router.push(`/debt/${item._id}`)}
              >
                <View
                  style={[styles.avatar, { backgroundColor: `${accent}33` }]}
                >
                  <Text
                    style={{ color: accent, fontWeight: "700", fontSize: 18 }}
                  >
                    {item.personName?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.person, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.personName}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      opacity: 0.6,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {isPay ? "You owe" : "Owes you"}
                    {item.description ? ` · ${item.description}` : ""}
                  </Text>
                  {chip && (
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: `${chip.color}22` },
                      ]}
                    >
                      <Text
                        style={{
                          color: chip.color,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {chip.label}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.amount,
                    {
                      color: settled ? colors.text : accent,
                      opacity: settled ? 0.5 : 1,
                    },
                  ]}
                >
                  {formatCurrency(item.amount, item.currency || "LKR")}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="card-outline"
                size={56}
                color={colors.text}
                style={{ opacity: 0.4 }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 12,
                }}
              >
                {activeTab === "settled"
                  ? "No settled debts yet"
                  : "No debts found"}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {activeTab === "settled"
                  ? "Settled debts will appear here"
                  : "Add a debt to start tracking"}
              </Text>
              {activeTab !== "settled" && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push("/debt/new")}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Add Debt
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/debt/new")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  summary: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  summaryBig: { alignItems: "center" },
  summaryRow: { flexDirection: "row" },
  summaryItem: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginVertical: 12,
  },
  summaryVDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.3)",
  },
  segment: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentItemActive: { backgroundColor: "#3b82f6" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  person: { fontSize: 16, fontWeight: "600" },
  chip: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  amount: { fontSize: 16, fontWeight: "bold" },
  empty: { alignItems: "center", marginTop: 40, paddingHorizontal: 20 },
  emptyButton: {
    marginTop: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
