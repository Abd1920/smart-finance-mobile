import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HelpScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Close automatically a few seconds after a successful send, like the web app
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => router.back(), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSend = async () => {
    if (message.trim().length < 5) {
      setError("Please enter a message (at least 5 characters)");
      return;
    }
    setSending(true);
    setError("");
    try {
      await api.post("/feedback", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to send. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <View
        style={[styles.successWrap, { backgroundColor: colors.background }]}
      >
        <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
        <Text style={[styles.successTitle, { color: colors.text }]}>
          Message Sent!
        </Text>
        <Text style={{ color: colors.text, opacity: 0.7, textAlign: "center" }}>
          Thank you for your feedback. We'll get back to you soon.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          color: colors.text,
          opacity: 0.7,
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        Have a question, found a bug, or want to suggest an improvement? We'd
        love to hear from you!
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: colors.text }]}>
        Your Name{" "}
        <Text style={{ opacity: 0.5, fontWeight: "400" }}>(optional)</Text>
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="John Doe"
        placeholderTextColor="#888"
        maxLength={50}
      />

      <Text style={[styles.label, { color: colors.text }]}>
        Email Address{" "}
        <Text style={{ opacity: 0.5, fontWeight: "400" }}>(optional)</Text>
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.text }]}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.label, { color: colors.text }]}>
        How can we help you?
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.textarea,
          { color: colors.text, borderColor: colors.text },
        ]}
        value={message}
        onChangeText={(t) => {
          setMessage(t);
          setError("");
        }}
        placeholder="Describe your issue or suggestion..."
        placeholderTextColor="#888"
        multiline
        maxLength={500}
        textAlignVertical="top"
      />
      <Text
        style={{
          color: colors.text,
          opacity: 0.5,
          fontSize: 12,
          textAlign: "right",
          marginTop: 4,
        }}
      >
        {message.length}/500
      </Text>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleSend}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.sendText}>Send Message</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  textarea: { minHeight: 110 },
  errorBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
  },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  successTitle: { fontSize: 18, fontWeight: "600", marginTop: 8 },
});
