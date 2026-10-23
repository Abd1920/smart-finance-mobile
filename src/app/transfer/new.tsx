import {
  DateInput,
  Field,
  FormScreen,
  Input,
  PrimaryButton,
  SelectField,
  useFormColors,
} from "@/components/form";
import api from "@/services/api";
import { formatCurrency } from "@/utils/currencies";
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

type Account = {
  _id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  color?: string;
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  bank: "business",
  cash: "cash",
  credit_card: "card",
  savings: "save",
  wallet: "wallet",
};

export default function NewTransferScreen() {
  const { colors, border } = useFormColors();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/accounts");
        const list: Account[] = res.data.accounts;
        setAccounts(list);
        if (list.length > 1) {
          setFromAccount(list[0]._id);
          setToAccount(list[1]._id);
        }
      } finally {
        setLoading(false);
      }
      api
        .get("/exchange-rates")
        .then((r) => setRates(r.data.rates))
        .catch(() => setRates(null));
    })();
  }, []);

  const from = accounts.find((a) => a._id === fromAccount);
  const to = accounts.find((a) => a._id === toAccount);
  // Older accounts without a stored currency count as LKR
  const fromCur = from?.currency || "LKR";
  const toCur = to?.currency || "LKR";
  const cross = !!from && !!to && fromCur !== toCur;
  const rate =
    cross && rates && rates[fromCur] && rates[toCur]
      ? rates[fromCur] / rates[toCur]
      : null;
  const value = parseFloat(amount);
  const received = cross && rate && value > 0 ? value * rate : null;

  const options = accounts.map((a) => ({
    value: a._id,
    label: a.name,
    sublabel: `${a.currency || "LKR"} · ${formatCurrency(a.currentBalance, a.currency || "LKR")}`,
    color: a.color || "#3b82f6",
    icon: TYPE_ICONS[a.type] || ("business" as const),
  }));

  const handleSave = async () => {
    if (!fromAccount || !toAccount || !(value > 0)) {
      Alert.alert(
        "Missing info",
        "Choose both accounts and enter an amount above 0.",
      );
      return;
    }
    if (fromAccount === toAccount) {
      Alert.alert(
        "Invalid transfer",
        "From and To accounts must be different.",
      );
      return;
    }
    setSaving(true);
    try {
      await api.post("/transactions/transfer", {
        fromAccount,
        toAccount,
        amount: value,
        description: description.trim(),
        date,
      });
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Transfer failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
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

  if (accounts.length < 2) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Ionicons
          name="swap-horizontal"
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
          You need at least 2 accounts
        </Text>
        <Text
          style={{
            color: colors.text,
            opacity: 0.6,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Add another account to move money between them.
        </Text>
      </View>
    );
  }

  return (
    <FormScreen>
      <Field label="From account">
        <SelectField
          title="Transfer from"
          placeholder="Select account"
          value={fromAccount}
          onChange={setFromAccount}
          options={options}
        />
      </Field>

      <View style={styles.swapWrap}>
        <TouchableOpacity
          style={styles.swapBtn}
          onPress={() => {
            setFromAccount(toAccount);
            setToAccount(fromAccount);
          }}
        >
          <Ionicons name="swap-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Field label="To account">
        <SelectField
          title="Transfer to"
          placeholder="Select account"
          value={toAccount}
          onChange={setToAccount}
          options={options}
        />
      </Field>

      <Field label={`Amount${from ? ` (${fromCur})` : ""}`}>
        <Input
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ fontSize: 22, fontWeight: "700" }}
        />
      </Field>

      {cross && value > 0 ? (
        <View
          style={[
            styles.preview,
            { backgroundColor: colors.backgroundElement, borderColor: border },
          ]}
        >
          <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12 }}>
            They'll receive
          </Text>
          <Text
            style={{
              color: "#22c55e",
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 2,
            }}
          >
            {received !== null
              ? `≈ ${formatCurrency(received, toCur)}`
              : `? ${toCur}`}
          </Text>
          {rate ? (
            <Text
              style={{
                color: colors.text,
                opacity: 0.5,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              1 {fromCur} ≈ {rate >= 1 ? rate.toFixed(2) : rate.toFixed(4)}{" "}
              {toCur}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Field label="Description" optional>
        <Input
          placeholder="e.g. Move savings"
          value={description}
          onChangeText={setDescription}
        />
      </Field>

      <Field label="Date">
        <DateInput value={date} onChange={setDate} />
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label="Transfer"
          icon="swap-horizontal"
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  swapWrap: { alignItems: "center", marginTop: 14, marginBottom: -4 },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});
