import SavingsTrendChart from "@/components/SavingsChart";
import ScreenHeader from "@/components/ScreenHeader";
import { CategoryDonut, IncomeExpenseChart } from "@/components/charts";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const CHART_WIDTH = Dimensions.get("window").width - 40 - 24;

const pad = (n: number) => String(n).padStart(2, "0");

type Change = { text: string; color: string } | null;

type AccountBalance = {
  _id: string;
  name: string;
  color: string;
  currency: string;
  balance: number;
  converted: number;
};

// goodWhenUp: income rising is good (green), expenses rising is bad (red)
function changeOf(
  cur: number,
  prev: number,
  goodWhenUp: boolean,
  prevLabel: string,
): Change {
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return { text: `No data in ${prevLabel}`, color: "#94a3b8" };
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5)
    return { text: `Same as ${prevLabel}`, color: "#94a3b8" };
  const up = pct > 0;
  return {
    text: `${up ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% vs ${prevLabel}`,
    color: up === goodWhenUp ? "#22c55e" : "#ef4444",
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
  change,
}: {
  label: string;
  hint?: string;
  value: number;
  color: string;
  currency: string;
  textColor: string;
  big?: boolean;
  change?: Change;
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
      {hint ? (
        <Text
          style={{ color: textColor, opacity: 0.4, fontSize: 10, marginTop: 2 }}
        >
          {hint}
        </Text>
      ) : null}
      {change ? (
        <Text
          style={{
            color: change.color,
            fontSize: 11,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          {change.text}
        </Text>
      ) : null}
    </View>
  );
}

export default function ReportsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">(
    "expense",
  );

  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [prevTotals, setPrevTotals] = useState({ income: 0, expense: 0 });
  const [monthly, setMonthly] = useState<
    { month: string; income: number; expense: number }[]
  >([]);
  const [breakdown, setBreakdown] = useState<{ _id: string; total: number }[]>(
    [],
  );
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [currency, setCurrency] = useState("LKR");
  const [loading, setLoading] = useState(true);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYearForMonth = month === 1 ? year - 1 : year;
  const prevLabel =
    period === "monthly" ? MONTH_SHORT[prevMonth - 1] : String(year - 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const range =
        period === "monthly"
          ? {
              startDate: `${year}-${pad(month)}-01`,
              endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
            }
          : { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
      const totalsParams = period === "monthly" ? { month, year } : { year };
      const prevParams =
        period === "monthly"
          ? { month: prevMonth, year: prevYearForMonth }
          : { year: year - 1 };

      const [
        totalsRes,
        prevRes,
        summaryRes,
        breakdownRes,
        accountsRes,
        ratesRes,
      ] = await Promise.all([
        api.get("/transactions", { params: { ...totalsParams, limit: 1 } }),
        api.get("/transactions", { params: { ...prevParams, limit: 1 } }),
        api.get(`/transactions/summary?year=${year}`),
        api.get("/transactions/categories", {
          params: { type: breakdownType, ...range },
        }),
        api.get("/accounts"),
        api.get("/exchange-rates").catch(() => null),
      ]);

      const primary: string = totalsRes.data.primaryCurrency || "LKR";
      setTotals({
        income: totalsRes.data.income,
        expense: totalsRes.data.expense,
      });
      setPrevTotals({
        income: prevRes.data.income,
        expense: prevRes.data.expense,
      });
      setCurrency(primary);

      // For the current year, only show months up to now
      const all: { month: string; income: number; expense: number }[] =
        summaryRes.data.summary;
      setMonthly(year === CURRENT_YEAR ? all.slice(0, CURRENT_MONTH) : all);

      setBreakdown(breakdownRes.data.breakdown);

      // Account balances, each converted to the primary currency
      const rates: Record<string, number> | undefined = ratesRes?.data?.rates;
      const toPrimary = (amount: number, cur: string) => {
        if (cur === primary || !rates || !rates[cur] || !rates[primary])
          return amount;
        return (amount * rates[cur]) / rates[primary];
      };
      setAccountBalances(
        accountsRes.data.accounts
          .map((a: any) => {
            const cur = a.currency || "LKR";
            return {
              _id: a._id,
              name: a.name,
              color: a.color || "#3b82f6",
              currency: cur,
              balance: a.currentBalance,
              converted: toPrimary(a.currentBalance, cur),
            } as AccountBalance;
          })
          .sort(
            (a: AccountBalance, b: AccountBalance) => b.converted - a.converted,
          ),
      );
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }, [period, year, month, breakdownType]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const atCurrent =
    period === "monthly"
      ? year === CURRENT_YEAR && month === CURRENT_MONTH
      : year === CURRENT_YEAR;

  const goPrev = () => {
    if (period === "monthly") {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else setMonth(month - 1);
    } else setYear(year - 1);
  };

  const goNext = () => {
    if (atCurrent) return;
    if (period === "monthly") {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else setMonth(month + 1);
    } else setYear(year + 1);
  };

  const periodLabel =
    period === "monthly" ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);
  const net = totals.income - totals.expense;
  const positiveTotal = accountBalances.reduce(
    (s, a) => s + Math.max(a.converted, 0),
    0,
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScreenHeader
        title="Reports"
        subtitle="Financial analysis and insights"
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Monthly / Yearly */}
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.backgroundElement },
          ]}
        >
          {(["monthly", "yearly"] as const).map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={{
                    color: active ? "#fff" : colors.text,
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  {p === "monthly" ? "Monthly" : "Yearly"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period stepper */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
            {periodLabel}
          </Text>
          <TouchableOpacity
            onPress={goNext}
            disabled={atCurrent}
            style={[styles.navBtn, atCurrent && { opacity: 0.25 }]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Summary */}
            <View
              style={[
                styles.summary,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <SummaryItem
                big
                label="Net"
                hint="Income − Expenses"
                value={net}
                color={net >= 0 ? "#22c55e" : "#ef4444"}
                currency={currency}
                textColor={colors.text}
              />
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Income"
                  value={totals.income}
                  color="#22c55e"
                  currency={currency}
                  textColor={colors.text}
                  change={changeOf(
                    totals.income,
                    prevTotals.income,
                    true,
                    prevLabel,
                  )}
                />
                <View style={styles.summaryVDivider} />
                <SummaryItem
                  label="Expenses"
                  value={totals.expense}
                  color="#ef4444"
                  currency={currency}
                  textColor={colors.text}
                  change={changeOf(
                    totals.expense,
                    prevTotals.expense,
                    false,
                    prevLabel,
                  )}
                />
              </View>
            </View>

            {/* Monthly trends */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Monthly Trends · {year}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <IncomeExpenseChart
                data={monthly}
                currency={currency}
                textColor={colors.text}
                width={CHART_WIDTH}
              />
            </View>

            {/* Savings trend */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Savings Trend · {year}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <SavingsTrendChart
                data={monthly}
                currency={currency}
                textColor={colors.text}
                width={CHART_WIDTH}
              />
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, marginTop: 0, marginBottom: 0 },
                ]}
              >
                {breakdownType === "expense" ? "Expense" : "Income"} Breakdown
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    breakdownType === "expense" && {
                      backgroundColor: "#ef4444",
                    },
                  ]}
                  onPress={() => setBreakdownType("expense")}
                >
                  <Text
                    style={{
                      color: breakdownType === "expense" ? "#fff" : colors.text,
                      fontSize: 13,
                    }}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    breakdownType === "income" && {
                      backgroundColor: "#22c55e",
                    },
                  ]}
                  onPress={() => setBreakdownType("income")}
                >
                  <Text
                    style={{
                      color: breakdownType === "income" ? "#fff" : colors.text,
                      fontSize: 13,
                    }}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <CategoryDonut
                items={breakdown}
                currency={currency}
                textColor={colors.text}
                cardColor={colors.backgroundElement}
                maxRows={50}
              />
            </View>

            {/* Account balances */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account Balances
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              {accountBalances.length === 0 ? (
                <Text
                  style={{
                    color: colors.text,
                    opacity: 0.6,
                    textAlign: "center",
                    paddingVertical: 12,
                  }}
                >
                  No accounts yet.
                </Text>
              ) : (
                accountBalances.map((acc, i) => {
                  const pct =
                    positiveTotal > 0
                      ? (Math.max(acc.converted, 0) / positiveTotal) * 100
                      : 0;
                  return (
                    <View
                      key={acc._id}
                      style={{
                        marginBottom: i === accountBalances.length - 1 ? 0 : 16,
                      }}
                    >
                      <View style={styles.accRow}>
                        <View
                          style={[styles.dot, { backgroundColor: acc.color }]}
                        />
                        <Text
                          style={{
                            color: colors.text,
                            flex: 1,
                            fontWeight: "500",
                          }}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              color: acc.balance < 0 ? "#ef4444" : colors.text,
                              fontWeight: "bold",
                            }}
                          >
                            {formatCurrency(acc.balance, acc.currency)}
                          </Text>
                          {acc.currency !== currency ? (
                            <Text
                              style={{
                                color: colors.text,
                                opacity: 0.5,
                                fontSize: 11,
                              }}
                            >
                              ≈ {formatCurrency(acc.converted, currency)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                              backgroundColor: acc.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segment: { flexDirection: "row", borderRadius: 10, padding: 4 },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentItemActive: { backgroundColor: "#3b82f6" },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  summary: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12 },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 22,
    marginBottom: 10,
  },
  card: { borderRadius: 14, padding: 12 },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  accRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginTop: 8,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3 },
});
