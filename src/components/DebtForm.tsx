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
import { formatCurrency } from "@/utils/currencies";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
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

export default function DebtForm({ id }: { id?: string }) {
  const { colors } = useFormColors();
  const router = useRouter();
  const isEdit = !!id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debtType, setDebtType] = useState<"to_pay" | "to_receive">("to_pay");
  const [personName, setPersonName] = useState("");
  const [linkedAccount, setLinkedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (isEdit) {
          const res = await api.get("/debts");
          const d = res.data.debts.find((x: any) => x._id === id);
          if (d) {
            setDebtType(d.debtType);
            setPersonName(d.personName);
            setAmount(String(d.amount));
            setCurrency(d.currency || "LKR");
            setDescription(d.description || "");
            setDueDate(d.dueDate ? new Date(d.dueDate) : null);
          }
        } else {
          const res = await api.get("/accounts");
          setAccounts(res.data.accounts);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const selectedAccount = accounts.find((a) => a._id === linkedAccount);
  const amountCurrency = isEdit ? currency : selectedAccount?.currency;

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (!personName.trim() || !(value > 0)) {
      Alert.alert(
        "Missing info",
        "Please enter the person's name and an amount above 0.",
      );
      return;
    }
    setSaving(true);
    try {
      const base = {
        debtType,
        personName: personName.trim(),
        amount: value,
        description: description.trim(),
        dueDate,
      };
      if (isEdit) await api.put(`/debts/${id}`, base);
      else
        await api.post("/debts", {
          ...base,
          linkedAccount: linkedAccount || null,
        });
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
        value={debtType}
        onChange={setDebtType}
        options={[
          { value: "to_pay", label: "I Owe", color: "#ef4444" },
          { value: "to_receive", label: "Owed to Me", color: "#22c55e" },
        ]}
      />

      <Field label="Person">
        <Input
          placeholder="Name"
          value={personName}
          onChangeText={setPersonName}
        />
      </Field>

      {!isEdit && (
        <Field
          label="Linked account"
          optional
          hint={
            linkedAccount
              ? debtType === "to_pay"
                ? "Your account balance will increase by this amount."
                : "Your account balance will decrease by this amount."
              : undefined
          }
        >
          <SelectField
            title="Linked account"
            placeholder="None"
            value={linkedAccount}
            onChange={setLinkedAccount}
            options={[
              {
                value: "",
                label: "None",
                sublabel: "Don't change any account balance",
                color: "#94a3b8",
                icon: "remove-circle-outline",
              },
              ...accounts.map((a) => ({
                value: a._id,
                label: a.name,
                sublabel: `${a.currency || "LKR"} · ${formatCurrency(a.currentBalance, a.currency || "LKR")}`,
                color: a.color || "#3b82f6",
                icon: TYPE_ICONS[a.type] || ("business" as const),
              })),
            ]}
          />
        </Field>
      )}

      <Field label={`Amount${amountCurrency ? ` (${amountCurrency})` : ""}`}>
        <Input
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ fontSize: 22, fontWeight: "700" }}
        />
      </Field>

      <Field label="Description" optional>
        <Input
          placeholder="e.g. Loan for rent"
          value={description}
          onChangeText={setDescription}
        />
      </Field>

      <Field label="Due date" optional>
        <DateInput
          value={dueDate}
          onChange={setDueDate}
          onClear={() => setDueDate(null)}
          placeholder="No due date"
        />
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label={isEdit ? "Save Changes" : "Save Debt"}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </FormScreen>
  );
}
