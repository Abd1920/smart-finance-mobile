import ScreenHeader from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

type Account = {
  _id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  color?: string;
};

const TYPE_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  bank: { label: "Bank account", icon: "business" },
  cash: { label: "Cash", icon: "cash" },
  credit_card: { label: "Credit card", icon: "card" },
  savings: { label: "Savings", icon: "save" },
  wallet: { label: "Wallet", icon: "wallet" },
};

export default function AccountsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data.accounts);
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccounts();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScreenHeader
        title="Accounts"
        subtitle="Manage your bank accounts, cash, and wallets"
        right={
          accounts.length > 1 ? (
            <TouchableOpacity
              style={styles.transferPill}
              onPress={() => router.push("/transfer/new")}
            >
              <Ionicons name="swap-horizontal" size={16} color="#fff" />
              <Text style={styles.transferText}>Transfer</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type] || TYPE_META.bank;
            const accent = item.color || "#3b82f6";
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement },
                ]}
                onPress={() => router.push(`/account/${item._id}`)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${accent}33` },
                  ]}
                >
                  <Ionicons name={meta.icon} size={22} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.name, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      opacity: 0.6,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {meta.label} · {item.currency || "LKR"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.balance,
                    {
                      color: item.currentBalance < 0 ? "#ef4444" : colors.text,
                    },
                  ]}
                >
                  {formatCurrency(item.currentBalance, item.currency || "LKR")}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="wallet-outline"
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
                No accounts yet
              </Text>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Add a bank account, cash, or wallet to start tracking.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/account/new")}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Add Account
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/account/new")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  transferPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8b5cf6",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  transferText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 16, fontWeight: "600" },
  balance: { fontSize: 16, fontWeight: "bold" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 20 },
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
