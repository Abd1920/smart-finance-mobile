import ActionSheet from "@/components/ActionSheet";
import TransactionRow from "@/components/TransactionRow";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Transaction = {
  _id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferRef?: string;
  toAccount?: { name: string };
};

type AccountDetail = {
  name: string;
  currentBalance: number;
  currency: string;
  color?: string;
};

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountSheet, setAccountSheet] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, txRes] = await Promise.all([
        api.get("/accounts"),
        api.get(`/transactions?account=${id}`),
      ]);
      const found = accountsRes.data.accounts.find((a: any) => a._id === id);
      setAccount(found || null);
      setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error("Failed to load account", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      `Delete "${account?.name}"? It will be removed from your accounts list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/accounts/${id}`);
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

  const handleDeleteTx = (tx: Transaction) => {
    const isTransfer = tx.type === "transfer";
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
          onPress: async () => {
            try {
              if (isTransfer && tx.transferRef) {
                await api.delete(`/transactions/transfer/${tx.transferRef}`);
              } else {
                await api.delete(`/transactions/${tx._id}`);
              }
              fetchData();
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

  const accent = account?.color || "#3b82f6";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: account?.name || "Account",
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setAccountSheet(true)}
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

      {account && (
        <View
          style={[
            styles.balanceCard,
            { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
          ]}
        >
          <Text style={{ color: colors.text, opacity: 0.6, fontSize: 13 }}>
            Current Balance
          </Text>
          <Text
            style={[
              styles.balance,
              { color: account.currentBalance < 0 ? "#ef4444" : colors.text },
            ]}
          >
            {formatCurrency(account.currentBalance, account.currency || "LKR")}
          </Text>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item, index }) => (
          <TransactionRow
            item={item}
            first={index === 0}
            last={index === transactions.length - 1}
            showAccount={false}
            showDate
            onPress={() => setSelectedTx(item)}
          />
        )}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.text,
              textAlign: "center",
              marginTop: 40,
              opacity: 0.7,
            }}
          >
            No transactions yet.
          </Text>
        }
      />

      <ActionSheet
        visible={accountSheet}
        title={account?.name}
        onClose={() => setAccountSheet(false)}
        actions={[
          {
            label: "Edit account",
            icon: "create-outline",
            onPress: () => router.push(`/account-edit/${id}`),
          },
          {
            label: "Delete account",
            icon: "trash-outline",
            danger: true,
            onPress: handleDeleteAccount,
          },
        ]}
      />

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
                  onPress: () => handleDeleteTx(selectedTx),
                },
              ]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  balanceCard: {
    margin: 20,
    marginBottom: 12,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  balance: { fontSize: 28, fontWeight: "bold", marginTop: 4 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "500" },
  amount: { fontSize: 16, fontWeight: "bold" },
});
