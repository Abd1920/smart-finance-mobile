import ActionSheet from "@/components/ActionSheet";
import { DateInput, Input, SelectField } from "@/components/form";
import ScreenHeader from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/utils/categories";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Transaction = {
  _id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferRef?: string;
  account?: { name: string };
  toAccount?: { name: string };
};

type Account = { _id: string; name: string };

const ALL_CATEGORIES = Array.from(
  new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
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

// Local-date helpers (so a picked date can never shift by a day)
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromYMD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const dayLabel = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const defaultFilters = {
  type: "",
  category: "",
  account: "",
  month: "",
  year: "",
};

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

export default function TransactionsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    startDate?: string;
    endDate?: string;
  }>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [primaryCurrency, setPrimaryCurrency] = useState("LKR");

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get("/accounts").then((res) => setAccounts(res.data.accounts));
  }, []);

  // Open this tab already filtered (used by the Dashboard cards)
  useEffect(() => {
    if (params.type || params.startDate || params.endDate) {
      setFilters({ ...defaultFilters, type: params.type || "" });
      setStartDate(params.startDate ? fromYMD(params.startDate) : null);
      setEndDate(params.endDate ? fromYMD(params.endDate) : null);
      setSearch("");
      router.setParams({
        type: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    }
  }, [params.type, params.startDate, params.endDate]);

  const fetchTransactions = async (pageToLoad: number, replace: boolean) => {
    try {
      const query: Record<string, any> = { page: pageToLoad, limit: 20 };
      if (search.trim()) query.search = search.trim();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) query[k] = v;
      });
      if (startDate) query.startDate = toYMD(startDate);
      if (endDate) query.endDate = toYMD(endDate);

      const res = await api.get("/transactions", { params: query });
      setTotalPages(res.data.pages);
      setTotalCount(res.data.total);
      setSummary({
        income: res.data.income,
        expense: res.data.expense,
        balance: res.data.balance,
      });
      setPrimaryCurrency(res.data.primaryCurrency || "LKR");
      setTransactions((prev) =>
        replace ? res.data.transactions : [...prev, ...res.data.transactions],
      );
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setLoading(true);
      fetchTransactions(1, true);
    }, [filters, startDate, endDate]),
  );

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      setLoading(true);
      fetchTransactions(1, true);
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchTransactions(1, true);
  };

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, false);
  };

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== "").length +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || !!search;

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearch("");
    setStartDate(null);
    setEndDate(null);
  };

  const handleDelete = async (item: Transaction) => {
    try {
      if (item.type === "transfer" && item.transferRef) {
        await api.delete(`/transactions/transfer/${item.transferRef}`);
      } else {
        await api.delete(`/transactions/${item._id}`);
      }
      setPage(1);
      fetchTransactions(1, true);
    } catch (err: any) {
      Alert.alert(
        "Failed to delete",
        err?.response?.data?.message || "Something went wrong.",
      );
    }
  };

  const confirmDelete = (item: Transaction) => {
    const isTransfer = item.type === "transfer";
    Alert.alert(
      isTransfer ? "Delete transfer" : "Delete transaction",
      isTransfer
        ? "Both account balances will be reversed."
        : "The account balance will be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(item),
        },
      ],
    );
  };

  // Group the flat list under date headers (Today, Yesterday, 18 Oct 2026...)
  const sections = useMemo(() => {
    const result: { key: string; title: string; data: Transaction[] }[] = [];
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = toYMD(d);
      const last = result[result.length - 1];
      if (last && last.key === key) last.data.push(t);
      else result.push({ key, title: dayLabel(d), data: [t] });
    }
    return result;
  }, [transactions]);

  const subtitle =
    totalCount === null
      ? undefined
      : `${totalCount} transaction${totalCount !== 1 ? "s" : ""} found`;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScreenHeader title="Transactions" subtitle={subtitle} />

      <View style={styles.searchRow}>
        <Input
          style={{ flex: 1, paddingVertical: 10, fontSize: 15 }}
          placeholder="Search transactions..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[
            styles.filterButton,
            showFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={{ color: showFilters ? "#fff" : colors.text }}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {hasAnyFilter && (
          <TouchableOpacity style={styles.clearButton} onPress={resetFilters}>
            <Text style={{ color: "#ef4444", fontWeight: "600" }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFilters && (
        <View
          style={[
            styles.filterPanel,
            {
              borderColor: "rgba(128,128,128,0.35)",
              backgroundColor: colors.backgroundElement,
            },
          ]}
        >
          <Text style={[styles.filterLabel, { color: colors.text }]}>Type</Text>
          <SelectField
            title="Type"
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            options={[
              { value: "", label: "All types" },
              { value: "income", label: "Income", color: "#22c55e" },
              { value: "expense", label: "Expense", color: "#ef4444" },
              { value: "transfer", label: "Transfer", color: "#8b5cf6" },
            ]}
          />

          <Text style={[styles.filterLabel, { color: colors.text }]}>
            Category
          </Text>
          <SelectField
            title="Category"
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            options={[
              { value: "", label: "All categories" },
              ...ALL_CATEGORIES.map((c) => ({
                value: c,
                label: c,
                color: CATEGORY_COLORS[c] || "#94a3b8",
              })),
            ]}
          />

          <Text style={[styles.filterLabel, { color: colors.text }]}>
            Account
          </Text>
          <SelectField
            title="Account"
            value={filters.account}
            onChange={(v) => setFilters((f) => ({ ...f, account: v }))}
            options={[
              { value: "", label: "All accounts" },
              ...accounts.map((a) => ({ value: a._id, label: a.name })),
            ]}
          />

          <View style={styles.monthYearRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Month
              </Text>
              <SelectField
                title="Month"
                value={filters.month}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, month: v }));
                  setStartDate(null);
                  setEndDate(null);
                }}
                options={[
                  { value: "", label: "All months" },
                  ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Year
              </Text>
              <SelectField
                title="Year"
                value={filters.year}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, year: v }));
                  setStartDate(null);
                  setEndDate(null);
                }}
                options={[
                  { value: "", label: "All years" },
                  ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
            </View>
          </View>

          <Text
            style={[styles.filterLabel, { color: colors.text, marginTop: 12 }]}
          >
            Or a date range
          </Text>
          <View style={styles.monthYearRow}>
            <View style={{ flex: 1 }}>
              <DateInput
                value={startDate}
                placeholder="From"
                onChange={(d) => {
                  setStartDate(d);
                  setFilters((f) => ({ ...f, month: "", year: "" }));
                }}
                onClear={() => setStartDate(null)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateInput
                value={endDate}
                placeholder="To"
                onChange={(d) => {
                  setEndDate(d);
                  setFilters((f) => ({ ...f, month: "", year: "" }));
                }}
                onClear={() => setEndDate(null)}
              />
            </View>
          </View>

          {hasAnyFilter && (
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View
              style={[
                styles.summary,
                { backgroundColor: colors.backgroundElement },
              ]}
            >
              <SummaryItem
                big
                label="Balance"
                hint="Income − Expenses"
                value={summary.balance}
                color={summary.balance >= 0 ? "#22c55e" : "#ef4444"}
                currency={primaryCurrency}
                textColor={colors.text}
              />
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Income"
                  hint="Filtered results"
                  value={summary.income}
                  color="#22c55e"
                  currency={primaryCurrency}
                  textColor={colors.text}
                />
                <View style={styles.summaryVDivider} />
                <SummaryItem
                  label="Expenses"
                  hint="Filtered results"
                  value={summary.expense}
                  color="#ef4444"
                  currency={primaryCurrency}
                  textColor={colors.text}
                />
              </View>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderSectionHeader={({ section }) => {
            const real = section.data.filter((t) => t.type !== "transfer");
            const currencies = Array.from(
              new Set(real.map((t) => t.currency || "LKR")),
            );
            const net = real.reduce(
              (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
              0,
            );
            // Only show a day total when every transaction that day is in one currency
            const showNet = real.length > 0 && currencies.length === 1;
            return (
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>
                  {section.title}
                </Text>
                {showNet ? (
                  <Text
                    style={{
                      color: net >= 0 ? "#22c55e" : "#ef4444",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {net >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(net), currencies[0])}
                  </Text>
                ) : null}
              </View>
            );
          }}
          renderSectionFooter={() => <View style={{ height: 4 }} />}
          renderItem={({ item, index, section }) => {
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            const isTransfer = item.type === "transfer";
            const catColor = isTransfer
              ? "#8b5cf6"
              : CATEGORY_COLORS[item.category] || "#94a3b8";
            const icon = isTransfer
              ? "swap-horizontal"
              : CATEGORY_ICONS[item.category] || "ellipsis-horizontal-circle";
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.row,
                  { backgroundColor: colors.backgroundElement },
                  isFirst && styles.rowFirst,
                  isLast && styles.rowLast,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: "rgba(128,128,128,0.25)",
                  },
                ]}
                onPress={() => setSelectedTx(item)}
              >
                <View
                  style={[styles.rowIcon, { backgroundColor: `${catColor}26` }]}
                >
                  <Ionicons name={icon} size={20} color={catColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.title, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {isTransfer
                      ? `Transfer → ${item.toAccount?.name ?? ""}`
                      : item.description || item.category}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      opacity: 0.55,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {!isTransfer && item.description
                      ? `${item.category} · `
                      : ""}
                    {item.account?.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        item.type === "income"
                          ? "#22c55e"
                          : item.type === "expense"
                            ? "#ef4444"
                            : colors.text,
                    },
                  ]}
                >
                  {item.type === "income"
                    ? "+"
                    : item.type === "expense"
                      ? "-"
                      : "⇄ "}
                  {formatCurrency(item.amount, item.currency || "LKR")}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="receipt-outline"
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
                No transactions found
              </Text>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Try adjusting your filters or add a new transaction
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/transaction/new")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ActionSheet
        visible={!!selectedTx}
        title={
          selectedTx ? selectedTx.description || selectedTx.category : undefined
        }
        onClose={() => setSelectedTx(null)}
        actions={
          selectedTx
            ? [
                ...(selectedTx.type !== "transfer"
                  ? [
                      {
                        label: "Edit",
                        icon: "create-outline" as const,
                        onPress: () =>
                          router.push(`/transaction/${selectedTx._id}`),
                      },
                    ]
                  : []),
                {
                  label: "Delete",
                  icon: "trash-outline" as const,
                  danger: true,
                  onPress: () => confirmDelete(selectedTx),
                },
              ]
            : []
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  filterButtonActive: { backgroundColor: "#3b82f6" },
  clearButton: { paddingHorizontal: 8 },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  filterPanel: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.8,
  },
  monthYearRow: { flexDirection: "row", gap: 8 },
  resetButton: {
    marginTop: 16,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  summary: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 4,
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

  // day headers + record cards
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 16, fontWeight: "500" },
  amount: { fontSize: 16, fontWeight: "bold" },
  empty: { alignItems: "center", marginTop: 50, paddingHorizontal: 20 },
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
