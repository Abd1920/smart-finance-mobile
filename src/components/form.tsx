import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Children,
  ReactNode,
  isValidElement,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BORDER = "rgba(128,128,128,0.35)";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function useFormColors() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  return { colors, border: BORDER };
}

// Scrollable page for forms, with keyboard handling
export function FormScreen({ children }: { children: ReactNode }) {
  const { colors } = useFormColors();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const { colors } = useFormColors();
  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 6,
          opacity: 0.85,
        }}
      >
        {label}
        {optional ? (
          <Text style={{ fontWeight: "400", opacity: 0.5 }}> (optional)</Text>
        ) : null}
      </Text>
      {children}
      {hint ? (
        <Text
          style={{
            color: colors.text,
            opacity: 0.55,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const { colors, border } = useFormColors();
  const [focused, setFocused] = useState(false);
  const { style, onFocus, onBlur, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor="#888"
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        {
          backgroundColor: colors.backgroundElement,
          color: colors.text,
          borderColor: focused ? "#3b82f6" : border,
        },
        style,
      ]}
    />
  );
}

export function PasswordInput(props: TextInputProps) {
  const { colors } = useFormColors();
  const [show, setShow] = useState(false);
  return (
    <View style={{ justifyContent: "center" }}>
      <Input
        {...props}
        secureTextEntry={!show}
        style={[props.style, { paddingRight: 46 }]}
      />
      <TouchableOpacity
        style={{ position: "absolute", right: 14 }}
        onPress={() => setShow((v) => !v)}
      >
        <Ionicons
          name={show ? "eye-off" : "eye"}
          size={20}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

// ───────────────────────── Dropdowns (bottom sheet) ─────────────────────────

export type Option = {
  value: string | number;
  label: string;
  sublabel?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

function SheetShell({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useFormColors();
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
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select",
  title,
}: {
  value: string | number;
  onChange: (v: any) => void;
  options: Option[];
  placeholder?: string;
  title?: string;
}) {
  const { colors, border } = useFormColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const maxHeight = Dimensions.get("window").height * 0.55;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.input,
          styles.selectRow,
          { backgroundColor: colors.backgroundElement, borderColor: border },
        ]}
        onPress={() => setOpen(true)}
      >
        {selected?.color ? (
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
        ) : null}
        <Text
          style={{
            color: colors.text,
            opacity: selected ? 1 : 0.5,
            flex: 1,
            fontSize: 16,
          }}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.text}
          style={{ opacity: 0.6 }}
        />
      </TouchableOpacity>

      <SheetShell
        visible={open}
        title={title || placeholder}
        onClose={() => setOpen(false)}
      >
        <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false}>
          {options.map((o) => {
            const active = o.value === value;
            const tint = o.color || "#3b82f6";
            return (
              <TouchableOpacity
                key={String(o.value)}
                style={styles.optionRow}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.icon ? (
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: `${tint}33` },
                    ]}
                  >
                    <Ionicons name={o.icon} size={18} color={tint} />
                  </View>
                ) : o.color ? (
                  <View style={[styles.dot, { backgroundColor: o.color }]} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: active ? "600" : "400",
                    }}
                  >
                    {o.label}
                  </Text>
                  {o.sublabel ? (
                    <Text
                      style={{
                        color: colors.text,
                        opacity: 0.6,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {o.sublabel}
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SheetShell>
    </>
  );
}

// Older-style dropdown: takes <Picker.Item label value /> children and shows
// them in the same bottom sheet, so existing screens upgrade automatically.
export function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: any) => void;
  children: ReactNode;
}) {
  const options: Option[] = Children.toArray(children)
    .filter(isValidElement)
    .map((child: any) => ({
      value: child.props.value,
      label: String(child.props.label),
    }));
  return <SelectField value={value} onChange={onChange} options={options} />;
}

// ───────────────────────── Segmented control ─────────────────────────

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (v: T) => void;
}) {
  const { colors } = useFormColors();
  return (
    <View
      style={[styles.segment, { backgroundColor: colors.backgroundElement }]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[
              styles.segmentItem,
              active && { backgroundColor: o.color || "#3b82f6" },
            ]}
            onPress={() => onChange(o.value)}
          >
            <Text
              style={{
                color: active ? "#fff" : colors.text,
                fontWeight: active ? "600" : "400",
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ───────────────────────── Date (calendar sheet) ─────────────────────────

function CalendarSheet({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const { colors } = useFormColors();
  const [view, setView] = useState(() => {
    const b = value || new Date();
    return { y: b.getFullYear(), m: b.getMonth() };
  });

  useEffect(() => {
    if (visible) {
      const b = value || new Date();
      setView({ y: b.getFullYear(), m: b.getMonth() });
    }
  }, [visible]);

  const shift = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const startOffset = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  const same = (d: Date | null, day: number) =>
    !!d &&
    d.getFullYear() === view.y &&
    d.getMonth() === view.m &&
    d.getDate() === day;

  const pick = (day: number) => {
    const t = value || new Date();
    onSelect(
      new Date(
        view.y,
        view.m,
        day,
        t.getHours(),
        t.getMinutes(),
        t.getSeconds(),
      ),
    );
  };

  const pickDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    onSelect(d);
  };

  return (
    <SheetShell visible={visible} title="Select date" onClose={onClose}>
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => pickDaysAgo(0)}
        >
          <Text style={{ color: colors.text }}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => pickDaysAgo(1)}
        >
          <Text style={{ color: colors.text }}>Yesterday</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => shift(-1)} style={styles.calNav}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {MONTHS[view.m]} {view.y}
        </Text>
        <TouchableOpacity onPress={() => shift(1)} style={styles.calNav}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} style={[styles.weekDay, { color: colors.text }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) =>
          day === null ? (
            <View key={i} style={styles.cell} />
          ) : (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              onPress={() => pick(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  same(value, day) && { backgroundColor: "#3b82f6" },
                  !same(value, day) &&
                    same(today, day) && {
                      borderWidth: 1,
                      borderColor: "#3b82f6",
                    },
                ]}
              >
                <Text
                  style={{
                    color: same(value, day) ? "#fff" : colors.text,
                    fontWeight: same(value, day) ? "700" : "400",
                  }}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          ),
        )}
      </View>
    </SheetShell>
  );
}

export function DateInput({
  value,
  onChange,
  onClear,
  placeholder,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  const { colors, border } = useFormColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.input,
          styles.selectRow,
          { backgroundColor: colors.backgroundElement, borderColor: border },
        ]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.text} />
        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            opacity: value ? 1 : 0.5,
            flex: 1,
            fontSize: 16,
          }}
        >
          {value
            ? value.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : placeholder || "Select date"}
        </Text>
        {value && onClear ? (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.text}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <CalendarSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(d) => {
          onChange(d);
          setOpen(false);
        }}
      />
    </>
  );
}

// ───────────────────────── Button ─────────────────────────

export function PrimaryButton({
  label,
  onPress,
  loading,
  color = "#3b82f6",
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: color, opacity: loading ? 0.7 : 1 },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
          <Text style={styles.buttonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  segment: { flexDirection: "row", borderRadius: 12, padding: 4 },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 9,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 15,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dot: { width: 12, height: 12, borderRadius: 6 },
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
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  calNav: { padding: 8 },
  weekRow: { flexDirection: "row" },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    opacity: 0.5,
    paddingVertical: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
