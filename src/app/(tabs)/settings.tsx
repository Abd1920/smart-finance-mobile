import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme, useThemeOverride } from "@/context/ThemeContext";
import api from "@/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color: string;
  danger?: boolean;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  color,
  danger,
}: RowProps) {
  const tint = danger ? "#ef4444" : color;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={24} color={tint} style={{ width: 36 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tint, fontSize: 16, fontWeight: "500" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color, opacity: 0.6, fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!danger && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={color}
          style={{ opacity: 0.5 }}
        />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { override } = useThemeOverride();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "We need access to your photos to set an avatar.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", {
        uri: asset.uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      await api.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        err?.response?.data?.message || "Something went wrong.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const appearanceLabel =
    override === "system"
      ? "System default"
      : override === "light"
        ? "Light"
        : "Dark";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            style={styles.avatarWrap}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[styles.avatarPlaceholder, { borderColor: colors.text }]}
              >
                <Text style={{ color: colors.text, fontSize: 40 }}>
                  {user?.fullName?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View
              style={[styles.cameraBadge, { borderColor: colors.background }]}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: colors.text }]}>
            {user?.fullName}
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.list}>
          <SettingsRow
            icon="person-outline"
            title="Profile"
            subtitle="Name and primary currency"
            color={colors.text}
            onPress={() => router.push("/settings-profile")}
          />
          <SettingsRow
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="Change password, delete account"
            color={colors.text}
            onPress={() => router.push("/settings-privacy")}
          />
          <SettingsRow
            icon="contrast-outline"
            title="Appearance"
            subtitle={appearanceLabel}
            color={colors.text}
            onPress={() => router.push("/settings-appearance")}
          />
          <SettingsRow
            icon="help-circle-outline"
            title="Help & Feedback"
            subtitle="Report a bug or send a suggestion"
            color={colors.text}
            onPress={() => router.push("/help")}
          />
        </View>

        <View style={styles.logoutWrap}>
          <SettingsRow
            icon="log-out-outline"
            title="Log Out"
            color={colors.text}
            danger
            onPress={handleLogout}
          />
        </View>

        <View style={styles.aboutCard}>
          <Text
            style={{
              color: colors.text,
              opacity: 0.7,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Smart Finance Tracker
          </Text>
          <Text
            style={{
              color: colors.text,
              opacity: 0.5,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Your data is encrypted and stored securely
          </Text>
          {user?.createdAt && (
            <Text
              style={{
                color: colors.text,
                opacity: 0.4,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-LK", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: "bold" },
  header: { alignItems: "center", marginTop: 16, marginBottom: 12 },
  avatarWrap: { width: 110, height: 110 },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  name: { fontSize: 20, fontWeight: "600", marginTop: 12 },
  email: { fontSize: 14, opacity: 0.7, marginTop: 2 },
  list: { marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  logoutWrap: { marginTop: 12 },
  aboutCard: {
    marginTop: 28,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(128,128,128,0.3)",
    alignItems: "center",
  },
});
