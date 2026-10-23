import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";

type Override = "system" | "light" | "dark";

type ThemeContextType = {
  scheme: "light" | "dark";
  override: Override;
  setOverride: (o: Override) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [override, setOverrideState] = useState<Override>("system");

  useEffect(() => {
    SecureStore.getItemAsync("themeOverride").then((val) => {
      if (val === "light" || val === "dark" || val === "system")
        setOverrideState(val);
    });
  }, []);

  const setOverride = (o: Override) => {
    setOverrideState(o);
    SecureStore.setItemAsync("themeOverride", o);
  };

  const scheme: "light" | "dark" =
    override === "system"
      ? deviceScheme === "dark"
        ? "dark"
        : "light"
      : override;

  return (
    <ThemeContext.Provider value={{ scheme, override, setOverride }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("Theme hooks must be used within ThemeProvider");
  return ctx;
}

// Named `useColorScheme` on purpose - it's a drop-in replacement for React
// Native's own hook, so every screen only needs to change its import source,
// not any of the code that calls useColorScheme().
export function useColorScheme() {
  return useThemeContext().scheme;
}

export function useThemeOverride() {
  const { override, setOverride } = useThemeContext();
  return { override, setOverride };
}
