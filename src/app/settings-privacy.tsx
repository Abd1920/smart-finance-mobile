import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/context/ThemeContext";
import api from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  color: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={[
            styles.input,
            styles.passwordInput,
            { color, borderColor: color },
          ]}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#888"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShow((v) => !v)}
        >
          <Ionicons name={show ? "eye-off" : "eye"} size={20} color={color} />
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function PrivacySettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user, logout } = useAuth();
  const isGoogleUser = (user as any)?.isGoogleUser;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(
        "Invalid password",
        "New password must be at least 6 characters.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "New password and confirm password must match.",
      );
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Saved", "Password changed.");
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!isGoogleUser && !deletePassword) {
      Alert.alert("Password required", "Enter your password to confirm.");
      return;
    }
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your profile, all accounts, transactions, and debts. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await api.delete("/auth/account", {
                data: isGoogleUser ? {} : { password: deletePassword },
              });
              await logout();
            } catch (err: any) {
              Alert.alert(
                "Failed",
                err?.response?.data?.message || "Something went wrong.",
              );
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Change Password
      </Text>

      <PasswordField
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Enter current password"
        color={colors.text}
      />
      <PasswordField
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Enter new password"
        color={colors.text}
      />
      <PasswordField
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm new password"
        color={colors.text}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleChangePassword}
        disabled={savingPassword}
      >
        <Text style={styles.saveText}>
          {savingPassword ? "Saving..." : "Change Password"}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Delete Account
      </Text>
      <Text
        style={{
          color: colors.text,
          opacity: 0.7,
          fontSize: 13,
          lineHeight: 19,
          marginBottom: 16,
        }}
      >
        Permanently delete your account and all associated data. This action
        cannot be undone.
      </Text>

      {!showDeleteSection ? (
        <TouchableOpacity
          style={styles.deleteOutlineButton}
          onPress={() => setShowDeleteSection(true)}
        >
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>
            Delete My Account
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          {!isGoogleUser && (
            <PasswordField
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Enter your password"
              color={colors.text}
            />
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <Text style={styles.saveText}>
              {deletingAccount ? "Deleting..." : "Permanently Delete Account"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  passwordWrap: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: "absolute", right: 12 },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.3)",
    marginVertical: 28,
  },
  deleteOutlineButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
});
