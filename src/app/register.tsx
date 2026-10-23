import {
  Field,
  FormScreen,
  Input,
  PasswordInput,
  PrimaryButton,
  useFormColors,
} from "@/components/form";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const STRENGTH = [
  { label: "", color: "transparent" },
  { label: "Weak", color: "#ef4444" },
  { label: "Fair", color: "#f97316" },
  { label: "Good", color: "#eab308" },
  { label: "Strong", color: "#22c55e" },
];

function Err({ text }: { text?: string }) {
  return text ? <Text style={styles.err}>{text}</Text> : null;
}

export default function RegisterScreen() {
  const { colors } = useFormColors();
  const { verifyEmail } = useAuth();

  const [step, setStep] = useState<"details" | "verify">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const level = password
    ? Math.max(1, RULES.filter((r) => r.test(password)).length)
    : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    else if (fullName.trim().length < 2) e.fullName = "At least 2 characters";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (!RULES.every((r) => r.test(password)))
      e.password = "Password does not meet all requirements";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/auth/send-verification", {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      setCode("");
      setTimer(60);
      setStep("verify");
    } catch (err: any) {
      Alert.alert(
        "Couldn't create account",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert("Enter the code", "Type the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      // On success the app signs you in and moves to the Dashboard by itself
      await verifyEmail(email.trim(), code);
    } catch (err: any) {
      Alert.alert(
        "Verification failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/send-verification", {
        fullName: fullName.trim(),
        email: email.trim(),
        password: "resend",
      });
      setCode("");
      setTimer(60);
      Alert.alert("Code sent", "A new verification code is on its way.");
    } catch (err: any) {
      Alert.alert(
        "Failed to resend",
        err?.response?.data?.message || "Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  if (step === "verify") {
    return (
      <FormScreen>
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={30} color="#3b82f6" />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 14,
            }}
          >
            Verify your email
          </Text>
          <Text
            style={{
              color: colors.text,
              opacity: 0.65,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontWeight: "700", opacity: 1 }}>
              {email.trim()}
            </Text>
            {"\n"}It expires in 10 minutes.
          </Text>
        </View>

        <Field label="Verification code">
          <Input
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            style={{
              fontSize: 28,
              letterSpacing: 10,
              textAlign: "center",
              fontWeight: "700",
            }}
          />
        </Field>

        <View style={{ marginTop: 24 }}>
          <PrimaryButton
            label="Verify & Continue"
            loading={loading}
            onPress={handleVerify}
          />
        </View>

        <View style={styles.centerRow}>
          {timer > 0 ? (
            <Text style={{ color: colors.text, opacity: 0.5 }}>
              Resend code in {timer}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
                {resending ? "Sending..." : "Resend code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.centerRow, { marginTop: 8 }]}>
          <TouchableOpacity onPress={() => setStep("details")}>
            <Text style={{ color: colors.text, opacity: 0.7 }}>
              Use a different email
            </Text>
          </TouchableOpacity>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "bold" }}>
        Create your account
      </Text>
      <Text style={{ color: colors.text, opacity: 0.6, marginTop: 4 }}>
        Start tracking your money in a minute.
      </Text>

      <Field label="Full name">
        <Input
          placeholder="John Doe"
          value={fullName}
          onChangeText={setFullName}
        />
        <Err text={errors.fullName} />
      </Field>

      <Field label="Email">
        <Input
          placeholder="Enter your email address"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Err text={errors.email} />
      </Field>

      <Field label="Password">
        <PasswordInput
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
        />
        <Err text={errors.password} />
        {password ? (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      backgroundColor:
                        i <= level
                          ? STRENGTH[level].color
                          : "rgba(128,128,128,0.25)",
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={{
                color: STRENGTH[level].color,
                fontSize: 12,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              {STRENGTH[level].label}
            </Text>
            {RULES.map((r) => {
              const ok = r.test(password);
              return (
                <View key={r.id} style={styles.ruleRow}>
                  <Ionicons
                    name={ok ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={ok ? "#22c55e" : colors.text}
                    style={{ opacity: ok ? 1 : 0.4 }}
                  />
                  <Text
                    style={{
                      color: colors.text,
                      opacity: ok ? 0.9 : 0.55,
                      fontSize: 12,
                    }}
                  >
                    {r.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Field>

      <Field label="Confirm password">
        <PasswordInput
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Err text={errors.confirmPassword} />
      </Field>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton
          label="Create Account"
          loading={loading}
          onPress={handleCreate}
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  err: { color: "#ef4444", fontSize: 12, marginTop: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerRow: { alignItems: "center", marginTop: 20 },
});
