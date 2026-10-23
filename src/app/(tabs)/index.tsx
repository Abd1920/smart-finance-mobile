import { CategoryDonut, IncomeExpenseChart } from "@/components/charts";
import { DateInput } from "@/components/form";
import ScreenHeader from "@/components/ScreenHeader";
import TransactionRow from "@/components/TransactionRow";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { syncDebtNotifications } from "@/services/notificationScheduler";
import { formatCurrency } from "@/utils/currencies";
import { buildDebtNotifications } from "@/utils/notifications";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Account = {
  _id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  color?: string;
};

type Transaction = {
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

type Debt = {
  _id: string;
  debtType: "to_pay" | "to_receive";
  personName: string;
  amount: number;
  currency: string;
  status: "pending" | "settled";
  dueDate?: string;
};

type MonthPoint = { month: string; income: number; expense: number };
type PresetKey =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  bank: "business",
  cash: "cash",
  credit_card: "card",
  savings: "save",
  wallet: "wallet",
};

const CHART_WIDTH = Dimensions.get("window").width - 40 - 24;

// ── date helpers (same presets as the web app) ──
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const dateToYMD = (d: Date) => ymd(d.getFullYear(), d.getMonth(), d.getDate());
const fmtShort = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function getPresetRange(preset: PresetKey) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "last_month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return { start: ymd(ly, lm, 1), end: ymd(ly, lm, lastDay(ly, lm)) };
    }
    case "last_3_months": {
      const sm = m - 2;
      const sy = sm < 0 ? y - 1 : y;
      const smAdj = sm < 0 ? sm + 12 : sm;
      return { start: ymd(sy, smAdj, 1), end: ymd(y, m, lastDay(y, m)) };
    }
    case "this_year":
      return { start: ymd(y, 0, 1), end: ymd(y, 11, 31) };
    default:
      return { start: ymd(y, m, 1), end: ymd(y, m, lastDay(y, m)) };
  }
}

function dueLabel(dueDate: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
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
  return {
    label: `Due ${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    color: "#94a3b8",
  };
}

function StatCard({
  label,
  caption,
  value,
  color,
  currency,
  onPress,
  wide,
  bg,
  textColor,
}: {
  label: string;
  caption?: string;
  value: number;
  color: string;
  currency: string;
  onPress: () => void;
  wide?: boolean;
  bg: string;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        wide ? styles.cardWide : styles.cardHalf,
        { backgroundColor: bg },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={{ color: textColor, opacity: 0.6, fontSize: 12 }}>
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={textColor}
          style={{ opacity: 0.4 }}
        />
      </View>
      <Text
        style={{
          color,
          fontSize: wide ? 26 : 17,
          fontWeight: "bold",
          marginTop: 4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatCurrency(value, currency)}
      </Text>
      {caption ? (
        <Text
          style={{
            color: textColor,
            opacity: 0.45,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  onSeeAll,
  textColor,
}: {
  title: string;
  onSeeAll?: () => void;
  textColor: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={{ color: textColor, fontSize: 16, fontWeight: "bold", flex: 1 }}
      >
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={{ color: "#3b82f6", fontSize: 13, fontWeight: "600" }}>
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { user } = useAuth();

  const [preset, setPreset] = useState<PresetKey>("this_month");
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [appliedCustom, setAppliedCustom] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [primaryCurrency, setPrimaryCurrency] = useState("LKR");
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [debtToPay, setDebtToPay] = useState(0);
  const [debtToReceive, setDebtToReceive] = useState(0);
  const [upcoming, setUpcoming] = useState<Debt[]>([]);
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<
    { _id: string; total: number }[]
  >([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(
    () =>
      preset === "custom" && appliedCustom
        ? appliedCustom
        : getPresetRange(preset),
    [preset, appliedCustom],
  );
  const presetLabel =
    preset === "custom"
      ? "Custom range"
      : PRESETS.find((p) => p.key === preset)?.label || "";

  const fetchAll = async () => {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const needPrevYear = m < 5; // the 6-month chart may reach back into last year

      const [
        accountsRes,
        totalsRes,
        debtsRes,
        summaryRes,
        prevSummaryRes,
        categoriesRes,
        recentRes,
      ] = await Promise.all([
        api.get("/accounts"),
        api.get("/transactions", {
          params: { startDate: range.start, endDate: range.end, limit: 1 },
        }),
        api.get("/debts"),
        api.get(`/transactions/summary?year=${y}`),
        needPrevYear
          ? api.get(`/transactions/summary?year=${y - 1}`)
          : Promise.resolve(null),
        api.get("/transactions/categories", {
          params: {
            type: "expense",
            startDate: range.start,
            endDate: range.end,
          },
        }),
        api.get("/transactions", {
          params: { limit: 5, sort: "date", order: "desc" },
        }),
      ]);

      setAccounts(accountsRes.data.accounts);
      setTotalBalance(accountsRes.data.totalBalance);
      setPrimaryCurrency(accountsRes.data.primaryCurrency || "LKR");
      setIncome(totalsRes.data.income);
      setExpense(totalsRes.data.expense);

      const debts: Debt[] = debtsRes.data.debts;
      setDebtToPay(debtsRes.data.totalToPay);
      setDebtToReceive(debtsRes.data.totalToReceive);
      setUpcoming(
        debts
          .filter((d) => d.status === "pending" && d.dueDate)
          .sort(
            (a, b) =>
              new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
          )
          .slice(0, 3),
      );

      const series: MonthPoint[] = [
        ...(prevSummaryRes ? prevSummaryRes.data.summary : []),
        ...summaryRes.data.summary.slice(0, m + 1),
      ];
      setMonthly(series.slice(-6));

      setExpenseCategories(categoriesRes.data.breakdown);
      setRecent(recentRes.data.transactions);

      const notifs = buildDebtNotifications(debtsRes.data.debts);
      const storedRead = await SecureStore.getItemAsync(
        "readDebtNotifications",
      );
      const readIds: string[] = storedRead ? JSON.parse(storedRead) : [];
      setUnreadCount(notifs.filter((n) => !readIds.includes(n.id)).length);
      syncDebtNotifications(debtsRes.data.debts);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [range.start, range.end]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const [s, e] =
      customStart <= customEnd
        ? [customStart, customEnd]
        : [customEnd, customStart];
    setAppliedCustom({ start: dateToYMD(s), end: dateToYMD(e) });
    setPreset("custom");
    setShowCustom(false);
  };

  const openTransactions = (type?: string) =>
    router.navigate({
      pathname: "/transactions",
      params: {
        ...(type ? { type } : {}),
        startDate: range.start,
        endDate: range.end,
      },
    });

  const openDebts = (tab: string) =>
    router.navigate({ pathname: "/debts", params: { tab } });

  const bell = (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={styles.bell}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unreadCount > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScreenHeader title="Dashboard" right={bell} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          {/* Greeting */}
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>
              Good {getGreeting()}, {user?.fullName?.split(" ")[0]}! 👋
            </Text>
            <Text style={styles.bannerSubtitle}>
              Here's your financial overview.
            </Text>
          </View>

          {/* Date filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {PRESETS.map((p) => {
              const active =
                p.key === "custom"
                  ? preset === "custom" || showCustom
                  : preset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? "#3b82f6"
                        : "rgba(128,128,128,0.25)",
                    },
                  ]}
                  onPress={() => {
                    if (p.key === "custom") {
                      setShowCustom((v) => !v);
                    } else {
                      setPreset(p.key);
                      setShowCustom(false);
                    }
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#fff" : colors.text,
                      fontWeight: active ? "600" : "400",
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text
            style={{
              color: colors.text,
              opacity: 0.5,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {fmtShort(range.start)} – {fmtShort(range.end)}
          </Text>

          {showCustom && (
            <View
              style={[
                styles.customPanel,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <DateInput
                    value={customStart}
                    onChange={setCustomStart}
                    placeholder="From date"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateInput
                    value={customEnd}
                    onChange={setCustomEnd}
                    placeholder="To date"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  (!customStart || !customEnd) && { opacity: 0.5 },
                ]}
                disabled={!customStart || !customEnd}
                onPress={applyCustom}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[
                styles.quick,
                { backgroundColor: colors.backgroundElement },
              ]}
              onPress={() => router.push("/transaction/new")}
            >
              <View
                style={[styles.quickIcon, { backgroundColor: "#ef444433" }]}
              >
                <Ionicons name="arrow-down" size={20} color="#ef4444" />
              </View>
              <Text
                style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}
              >
                Add Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quick,
                { backgroundColor: colors.backgroundElement },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/transaction/new",
                  params: { type: "income" },
                })
              }
            >
              <View
                style={[styles.quickIcon, { backgroundColor: "#22c55e33" }]}
              >
                <Ionicons name="arrow-up" size={20} color="#22c55e" />
              </View>
              <Text
                style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}
              >
                Add Income
              </Text>
            </TouchableOpacity>
            {accounts.length > 1 && (
              <TouchableOpacity
                style={[
                  styles.quick,
                  { backgroundColor: colors.backgroundElement },
                ]}
                onPress={() => router.push("/transfer/new")}
              >
                <View
                  style={[styles.quickIcon, { backgroundColor: "#8b5cf633" }]}
                >
                  <Ionicons name="swap-horizontal" size={20} color="#8b5cf6" />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Transfer
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Summary cards (tap to open the matching tab) */}
          <View style={styles.cardsGrid}>
            <StatCard
              wide
              label="Total Balance"
              caption={`${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
              value={totalBalance}
              color={colors.text}
              currency={primaryCurrency}
              bg={colors.backgroundElement}
              textColor={colors.text}
              onPress={() => router.navigate("/accounts")}
            />
            <StatCard
              label="Income"
              caption={presetLabel}
              value={income}
              color="#22c55e"
              currency={primaryCurrency}
              bg={colors.backgroundElement}
              textColor={colors.text}
              onPress={() => openTransactions("income")}
            />
            <StatCard
              label="Expenses"
              caption={presetLabel}
              value={expense}
              color="#ef4444"
              currency={primaryCurrency}
              bg={colors.backgroundElement}
              textColor={colors.text}
              onPress={() => openTransactions("expense")}
            />
            <StatCard
              label="Debt to Pay"
              caption="Pending payments"
              value={debtToPay}
              color="#f97316"
              currency={primaryCurrency}
              bg={colors.backgroundElement}
              textColor={colors.text}
              onPress={() => openDebts("to_pay")}
            />
            <StatCard
              label="Money to Receive"
              caption="Pending receivables"
              value={debtToReceive}
              color="#8b5cf6"
              currency={primaryCurrency}
              bg={colors.backgroundElement}
              textColor={colors.text}
              onPress={() => openDebts("to_receive")}
            />
          </View>

          {/* Accounts carousel */}
          {accounts.length > 0 && (
            <>
              <SectionHeader
                title="Your Accounts"
                textColor={colors.text}
                onSeeAll={() => router.navigate("/accounts")}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                style={{ marginHorizontal: -20 }}
              >
                <View style={{ width: 10 }} />
                {accounts.map((a) => {
                  const accent = a.color || "#3b82f6";
                  return (
                    <TouchableOpacity
                      key={a._id}
                      style={[
                        styles.accountCard,
                        {
                          backgroundColor: `${accent}22`,
                          borderColor: `${accent}55`,
                        },
                      ]}
                      onPress={() => router.push(`/account/${a._id}`)}
                    >
                      <View
                        style={[
                          styles.quickIcon,
                          { backgroundColor: `${accent}33` },
                        ]}
                      >
                        <Ionicons
                          name={TYPE_ICONS[a.type] || "business"}
                          size={20}
                          color={accent}
                        />
                      </View>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "600",
                          marginTop: 10,
                        }}
                        numberOfLines={1}
                      >
                        {a.name}
                      </Text>
                      <Text
                        style={{
                          color: a.currentBalance < 0 ? "#ef4444" : colors.text,
                          fontWeight: "bold",
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {formatCurrency(a.currentBalance, a.currency || "LKR")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ width: 10 }} />
              </ScrollView>
            </>
          )}

          {/* Upcoming dues */}
          {upcoming.length > 0 && (
            <>
              <SectionHeader
                title="Upcoming Dues"
                textColor={colors.text}
                onSeeAll={() => router.navigate("/debts")}
              />
              {upcoming.map((d) => {
                const chip = dueLabel(d.dueDate!);
                const isPay = d.debtType === "to_pay";
                return (
                  <TouchableOpacity
                    key={d._id}
                    style={[
                      styles.dueRow,
                      { backgroundColor: colors.backgroundElement },
                    ]}
                    onPress={() => router.push(`/debt/${d._id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: colors.text, fontWeight: "600" }}
                        numberOfLines={1}
                      >
                        {d.personName}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          opacity: 0.6,
                          fontSize: 12,
                        }}
                      >
                        {isPay ? "You owe" : "Owes you"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text
                        style={{
                          color: isPay ? "#ef4444" : "#22c55e",
                          fontWeight: "bold",
                        }}
                      >
                        {formatCurrency(d.amount, d.currency || "LKR")}
                      </Text>
                      <View
                        style={[
                          styles.dueChip,
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
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Income vs Expenses */}
          <SectionHeader
            title="Income vs Expenses · last 6 months"
            textColor={colors.text}
          />
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <IncomeExpenseChart
              data={monthly}
              currency={primaryCurrency}
              textColor={colors.text}
              width={CHART_WIDTH}
            />
          </View>

          {/* Expenses by category */}
          <SectionHeader
            title={`Expenses by Category · ${presetLabel}`}
            textColor={colors.text}
          />
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <CategoryDonut
              items={expenseCategories}
              currency={primaryCurrency}
              textColor={colors.text}
              cardColor={colors.backgroundElement}
            />
          </View>

          {/* Recent transactions */}
          <SectionHeader
            title="Recent Transactions"
            textColor={colors.text}
            onSeeAll={() => router.navigate("/transactions")}
          />
          {recent.length > 0 ? (
            <View>
              {recent.map((item, i) => (
                <TransactionRow
                  key={item._id}
                  item={item}
                  first={i === 0}
                  last={i === recent.length - 1}
                  showDate
                  onPress={
                    item.type !== "transfer"
                      ? () => router.push(`/transaction/${item._id}`)
                      : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <Text
              style={{ color: colors.text, opacity: 0.6, paddingVertical: 12 }}
            >
              No transactions yet.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bell: { position: "relative", padding: 4 },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  banner: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  bannerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18 },
  customPanel: { borderRadius: 12, padding: 12, marginTop: 10, gap: 10 },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    justifyContent: "center",
  },
  applyBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  quick: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  card: { borderRadius: 14, padding: 14 },
  cardWide: { width: "100%" },
  cardHalf: { flexBasis: "48%", flexGrow: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  accountCard: { width: 150, borderRadius: 14, borderWidth: 1, padding: 12 },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  dueChip: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  chartCard: { borderRadius: 14, padding: 12 },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
