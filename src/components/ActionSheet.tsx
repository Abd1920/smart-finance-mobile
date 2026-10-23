import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type SheetAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

export default function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundElement,
              paddingBottom: insets.bottom + 12,
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.handle} />
          {title ? (
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}

          {actions.map((a) => {
            const tint = a.danger ? "#ef4444" : colors.text;
            return (
              <TouchableOpacity
                key={a.label}
                style={styles.row}
                onPress={() => {
                  onClose();
                  // small delay so the sheet finishes closing before the action runs
                  setTimeout(a.onPress, 150);
                }}
              >
                <Ionicons name={a.icon} size={22} color={tint} />
                <Text style={{ color: tint, fontSize: 16, fontWeight: "500" }}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={{ color: colors.text, opacity: 0.7, fontSize: 15 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.5)",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: { fontSize: 13, opacity: 0.6, textAlign: "center", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  cancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.3)",
  },
});
