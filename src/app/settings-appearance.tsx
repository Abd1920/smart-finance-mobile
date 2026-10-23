import { Colors } from "@/constants/theme";
import { useColorScheme, useThemeOverride } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const OPTIONS = [
  {
    value: "system",
    label: "System default",
    desc: "Match your phone's setting",
  },
  { value: "light", label: "Light", desc: "" },
  { value: "dark", label: "Dark", desc: "" },
] as const;

export default function AppearanceSettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { override, setOverride } = useThemeOverride();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={styles.row}
          onPress={() => setOverride(opt.value)}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}
            >
              {opt.label}
            </Text>
            {opt.desc ? (
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {opt.desc}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name={
              override === opt.value ? "radio-button-on" : "radio-button-off"
            }
            size={24}
            color={override === opt.value ? "#3b82f6" : colors.text}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
});
