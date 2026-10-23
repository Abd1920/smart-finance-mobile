import {
  DateInput,
  Field,
  FormScreen,
  Input,
  PrimaryButton,
  Segmented,
  SelectField,
  useFormColors,
} from "@/components/form";
import api from "@/services/api";
import {
  CATEGORY_COLORS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/utils/categories";
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

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

export default function TransactionForm({ id }: { id?: string }) {
  const { colors } = useFormColors();
  const router = useRouter();
  const { type: initialType } = useLocalSearchParams<{ type?: string }>();
  const isEdit = !!id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [type, setType] = useState<"income" | "expense">(
    initialType === "income" ? "income" : "expense",
  );
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const accountsRes = await api.get("/accounts");
        setAccounts(accountsRes.data.accounts);

        if (isEdit) {
          const txRes = await api.get(`/transactions/${id}`);
          const tx = txRes.data.transaction;
          setType(tx.type);
          setAccount(tx.account?._id || tx.account);
          setAmount(String(tx.amount));
          setCategory(tx.category);
          setDescription(tx.description || "");
          setDate(new Date(tx.date));
        } else if (accountsRes.data.accounts.length > 0) {
          setAccount(accountsRes.data.accounts[0]._id);
        }
      } catch {
        Alert.alert("Failed to load", "Could not load the form.");
        if (isEdit) router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const changeType = (t: "income" | "expense") => {
    setType(t);
    setCategory("");
  };

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selectedAccount = accounts.find((a) => a._id === account);

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!account || !category || !(value > 0)) {
      Alert.alert(
        "Missing info",
        "Please choose an account, enter an amount above 0, and pick a category.",
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type,
        account,
        amount: value,
        category,
        description: description.trim(),
        date,
      };
      if (isEdit) await api.put(`/transactions/${id}`, payload);
      else await api.post("/transactions", payload);
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
      <Segmented
        value={type}
        onChange={changeType}
        options={[
          { value: "expense", label: "Expense", color: "#ef4444" },
          { value: "income", label: "Income", color: "#22c55e" },
        ]}
      />

      <Field
        label="Account"
        hint={
          accounts.length === 0
            ? "You have no accounts yet. Add one from the Accounts tab first."
            : undefined
        }
      >
        <SelectField
          title="Choose account"
          placeholder="Select account"
          value={account}
          onChange={setAccount}
          options={accounts.map((a) => ({
            value: a._id,
            label: a.name,
            sublabel: `${a.currency || "LKR"} · ${formatCurrency(a.currentBalance, a.currency || "LKR")}`,
            color: a.color || "#3b82f6",
            icon: TYPE_ICONS[a.type] || "business",
          }))}
        />
      </Field>

      <Field
        label={`Amount${selectedAccount ? ` (${selectedAccount.currency || "LKR"})` : ""}`}
      >
        <Input
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ fontSize: 22, fontWeight: "700" }}
        />
      </Field>

      <Field label="Category">
        <SelectField
          title="Choose category"
          placeholder="Select category"
          value={category}
          onChange={setCategory}
          options={categories.map((c) => ({
            value: c,
            label: c,
            color: CATEGORY_COLORS[c] || "#94a3b8",
          }))}
        />
      </Field>

      <Field label="Description" optional>
        <Input
          placeholder="e.g. Lunch with friends"
          value={description}
          onChangeText={setDescription}
        />
      </Field>

      <Field label="Date">
        <DateInput value={date} onChange={setDate} />
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label={isEdit ? "Save Changes" : "Save Transaction"}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </FormScreen>
  );
}
