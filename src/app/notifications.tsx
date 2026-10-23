import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import {
  buildDebtNotifications,
  DebtNotification,
} from "@/utils/notifications";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const READ_IDS_KEY = "readDebtNotifications";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6",
};

export default function NotificationsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();

  const [notifications, setNotifications] = useState<DebtNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [debtsRes, storedRead] = await Promise.all([
            api.get("/debts"),
            SecureStore.getItemAsync(READ_IDS_KEY),
          ]);
          setNotifications(buildDebtNotifications(debtsRes.data.debts));
          setReadIds(storedRead ? JSON.parse(storedRead) : []);
        } catch (err) {
          console.error("Failed to load notifications", err);
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  const markAllRead = async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    await SecureStore.setItemAsync(READ_IDS_KEY, JSON.stringify(allIds));
  };

  const handlePress = async (n: DebtNotification) => {
    if (!readIds.includes(n.id)) {
      const updated = [...readIds, n.id];
      setReadIds(updated);
      await SecureStore.setItemAsync(READ_IDS_KEY, JSON.stringify(updated));
    }
    router.push(`/debt/${n.debtId}`);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Notifications
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isRead = readIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.row,
                { borderColor: colors.text, opacity: isRead ? 0.5 : 1 },
              ]}
              onPress={() => handlePress(item)}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: PRIORITY_COLORS[item.priority] },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    opacity: 0.7,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {item.message}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{ color: colors.text, textAlign: "center", marginTop: 60 }}
          >
            No due dates coming up.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: { fontSize: 20, fontWeight: "bold" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
});
