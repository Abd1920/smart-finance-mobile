import {
  Field,
  FormScreen,
  Input,
  PrimaryButton,
  useFormColors,
} from "@/components/form";
import api from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

export default function ForgotPasswordScreen() {
  const { colors } = useFormColors();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert(
        "Invalid email",
        "Enter the email address you signed up with.",
      );
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      Alert.alert(
        "Couldn't send the link",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <FormScreen>
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: "rgba(34,197,94,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="mail-open" size={30} color="#22c55e" />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 14,
            }}
          >
            Check your email
          </Text>
          <Text
            style={{
              color: colors.text,
              opacity: 0.65,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 21,
            }}
          >
            We sent a password reset link to{"\n"}
            <Text style={{ fontWeight: "700", opacity: 1 }}>
              {email.trim()}
            </Text>
            {"\n\n"}Open the link to choose a new password. It opens in your
            browser and works for 1 hour. Then come back here and sign in.
          </Text>
        </View>

        <View style={{ marginTop: 28 }}>
          <PrimaryButton
            label="Back to Sign In"
            onPress={() => router.back()}
          />
        </View>

        <View style={{ alignItems: "center", marginTop: 20 }}>
          <TouchableOpacity onPress={handleSend} disabled={loading}>
            <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
              {loading ? "Sending..." : "Didn't get it? Send again"}
            </Text>
          </TouchableOpacity>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
        Forgot your password?
      </Text>
      <Text
        style={{
          color: colors.text,
          opacity: 0.6,
          marginTop: 4,
          lineHeight: 20,
        }}
      >
        Enter your email and we'll send you a link to reset it.
      </Text>

      <Field label="Email">
        <Input
          placeholder="Enter your email address"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </Field>

      <View style={{ marginTop: 24 }}>
        <PrimaryButton
          label="Send Reset Link"
          loading={loading}
          onPress={handleSend}
        />
      </View>
    </FormScreen>
  );
}
