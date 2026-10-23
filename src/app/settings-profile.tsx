import {
  Field,
  FormScreen,
  Input,
  PrimaryButton,
  SelectField,
} from "@/components/form";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from "@/utils/currencies";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [currency, setCurrency] = useState(user?.currency || "LKR");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing info", "Full name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/auth/profile", { fullName: fullName.trim(), currency });
      await refreshUser();
      Alert.alert("Saved", "Profile updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen>
      <Field label="Full name">
        <Input value={fullName} onChangeText={setFullName} />
      </Field>

      <Field
        label="Primary currency"
        hint="Totals on your Dashboard and Reports are shown in this currency."
      >
        <SelectField
          title="Primary currency"
          value={currency}
          onChange={setCurrency}
          options={Object.keys(CURRENCY_SYMBOLS).map((c) => ({
            value: c,
            label: c,
            sublabel: CURRENCY_NAMES[c],
          }))}
        />
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label="Save Profile"
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </FormScreen>
  );
}
