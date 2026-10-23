import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import { registerForNotifications } from "@/services/notificationScheduler";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import {
  ThemeProvider as AppThemeProvider,
  useColorScheme,
} from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { user, loading } = useAuth();

  const router = useRouter();
  const responseListener = useRef<any>(null);

  useEffect(() => {
    registerForNotifications();

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const debtId = response.notification.request.content.data?.debtId;
        if (debtId) router.push(`/debt/${debtId}`);
      });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transaction/new"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Transaction",
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Edit Transaction",
          }}
        />
        <Stack.Screen
          name="account/new"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Account",
          }}
        />
        <Stack.Screen
          name="account-edit/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Edit Account",
          }}
        />
        <Stack.Screen
          name="debt/new"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Debt",
          }}
        />
        <Stack.Screen
          name="debt-edit/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Edit Debt",
          }}
        />
        <Stack.Screen
          name="transfer/new"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Transfer Money",
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Notifications",
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Help & Feedback",
          }}
        />
        <Stack.Screen
          name="settings-profile"
          options={{ headerShown: true, title: "Profile" }}
        />
        <Stack.Screen
          name="settings-privacy"
          options={{ headerShown: true, title: "Privacy" }}
        />
        <Stack.Screen
          name="settings-appearance"
          options={{ headerShown: true, title: "Appearance" }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
        <Stack.Screen
          name="register"
          options={{ headerShown: true, title: "Create Account" }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{ headerShown: true, title: "Forgot Password" }}
        />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedApp() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <ThemedApp />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
