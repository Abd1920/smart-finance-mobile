import { Field, Input, PasswordInput, PrimaryButton } from "@/components/form";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert(
        "Login failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code !== "SIGN_IN_CANCELLED" && err?.code !== "-5") {
        Alert.alert(
          "Google sign-in failed",
          err?.message || "Something went wrong.",
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="wallet" size={34} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Smart Finance
            </Text>
            <Text style={{ color: colors.text, opacity: 0.6, marginTop: 4 }}>
              Sign in to manage your money
            </Text>
          </View>

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

          <Field label="Password">
            <PasswordInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
            />
          </Field>

          <TouchableOpacity
            style={styles.forgot}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={{ color: "#3b82f6", fontSize: 13, fontWeight: "600" }}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 20 }}>
            <PrimaryButton
              label="Sign In"
              loading={loading}
              onPress={handleLogin}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={{ color: colors.text, opacity: 0.5, fontSize: 12 }}>
              or
            </Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
            >
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={{ color: colors.text, opacity: 0.6 }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 16 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  forgot: { alignSelf: "flex-end", marginTop: 10 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.4)",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.4)",
    borderRadius: 12,
    paddingVertical: 14,
  },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
});
