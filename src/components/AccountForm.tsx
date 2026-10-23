import {
  Field,
  FormScreen,
  Input,
  PrimaryButton,
  SelectField,
  useFormColors,
} from "@/components/form";
import api from "@/services/api";
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TYPES: {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "bank", label: "Bank account", icon: "business" },
  { value: "cash", label: "Cash", icon: "cash" },
  { value: "credit_card", label: "Credit card", icon: "card" },
  { value: "savings", label: "Savings", icon: "save" },
  { value: "wallet", label: "Wallet", icon: "wallet" },
];

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export default function AccountForm({ id }: { id?: string }) {
  const { colors, border } = useFormColors();
  const router = useRouter();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [currency, setCurrency] = useState("LKR");
  const [initialBalance, setInitialBalance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [resetBalance, setResetBalance] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get("/accounts")
      .then((res) => {
        const acc = res.data.accounts.find((a: any) => a._id === id);
        if (acc) {
          setName(acc.name);
          setType(acc.type);
          setColor(acc.color || COLORS[0]);
          setCurrency(acc.currency || "LKR");
          setResetBalance(String(acc.currentBalance));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing info", "Please enter an account name.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/accounts/${id}`, { name: name.trim(), type, color });
      } else {
        await api.post("/accounts", {
          name: name.trim(),
          type,
          currency,
          initialBalance: parseFloat(initialBalance) || 0,
          color,
        });
      }
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Failed to save",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const value = parseFloat(resetBalance);
    if (isNaN(value)) {
      Alert.alert("Invalid amount", "Enter a valid balance.");
      return;
    }
    Alert.alert(
      "Reset balance",
      `Set the balance directly to ${value} ${currency}? This does not create a transaction.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            setResetting(true);
            try {
              await api.put(`/accounts/${id}/reset-balance`, {
                currentBalance: value,
              });
              router.back();
            } catch (err: any) {
              Alert.alert(
                "Failed",
                err?.response?.data?.message || "Something went wrong.",
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FormScreen>
      <Field label="Account name">
        <Input
          placeholder="e.g. Commercial Bank"
          value={name}
          onChangeText={setName}
        />
      </Field>

      <Field label="Type">
        <SelectField
          title="Account type"
          value={type}
          onChange={setType}
          options={TYPES}
        />
      </Field>

      <Field
        label="Currency"
        hint={isEdit ? undefined : "You can't change the currency later."}
      >
        {isEdit ? (
          <View
            style={[
              styles.locked,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: border,
              },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={16}
              color={colors.text}
              style={{ opacity: 0.6 }}
            />
            <Text style={{ color: colors.text, opacity: 0.7, fontSize: 16 }}>
              {currency} · {CURRENCY_NAMES[currency] || ""}
            </Text>
          </View>
        ) : (
          <SelectField
            title="Choose currency"
            value={currency}
            onChange={setCurrency}
            options={Object.keys(CURRENCY_SYMBOLS).map((c) => ({
              value: c,
              label: c,
              sublabel: CURRENCY_NAMES[c],
            }))}
          />
        )}
      </Field>

      {!isEdit && (
        <Field label={`Opening balance (${currency})`}>
          <Input
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={initialBalance}
            onChangeText={setInitialBalance}
          />
        </Field>
      )}

      <Field label="Color">
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && { borderWidth: 3, borderColor: colors.text },
              ]}
            >
              {color === c ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label={isEdit ? "Save Changes" : "Save Account"}
          loading={saving}
          onPress={handleSave}
        />
      </View>

      {isEdit && (
        <>
          <View style={[styles.divider, { backgroundColor: border }]} />
          <Text
            style={{ color: colors.text, fontSize: 16, fontWeight: "bold" }}
          >
            Reset balance
          </Text>
          <Field
            label={`New balance (${currency})`}
            hint="Sets the balance directly to fix a mistake. It does not create a transaction."
          >
            <Input
              keyboardType="decimal-pad"
              value={resetBalance}
              onChangeText={setResetBalance}
            />
          </Field>
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label="Reset Balance"
              icon="refresh"
              color="#f59e0b"
              loading={resetting}
              onPress={handleReset}
            />
          </View>
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  locked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 28 },
});
