import { CATEGORY_COLORS } from "@/utils/categories";
import { CURRENCY_SYMBOLS, formatCurrency } from "@/utils/currencies";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";

export function compact(n: number) {
  const abs = Math.abs(n);
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1000000) return `${trim(n / 1000000)}M`;
  if (abs >= 1000) return `${trim(n / 1000)}K`;
  return String(Math.round(n));
}

type MonthPoint = { month: string; income: number; expense: number };

export function IncomeExpenseChart({
  data,
  currency,
  textColor,
  width,
}: {
  data: MonthPoint[];
  currency: string;
  textColor: string;
  width: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const yAxisWidth = 44;
  const available = width - yAxisWidth - 8;
  // Up to 6 months fit on screen; more than that scrolls sideways
  const fits = data.length <= 6;
  const groupWidth = available / data.length;
  const spacing = fits ? Math.max(10, Math.round(groupWidth * 0.3)) : 18;
  const barWidth = fits
    ? Math.max(6, Math.min(18, Math.floor((groupWidth - spacing - 2) / 2)))
    : 10;
  const labelWidth = Math.max(28, barWidth * 2 + 2);
  const allZero = data.every((m) => m.income === 0 && m.expense === 0);

  // Each month is a pair of bars: income (green) then expense (red)
  const bars = data.flatMap((m) => [
    {
      value: m.income,
      label: m.month,
      spacing: 2,
      labelWidth,
      labelTextStyle: { color: textColor, opacity: 0.6, fontSize: 11 },
      frontColor: "#22c55e",
    },
    { value: m.expense, frontColor: "#ef4444" },
  ]);

  const sel = selected !== null ? data[selected] : null;

  return (
    <View>
      <BarChart
        data={bars}
        width={available}
        height={170}
        barWidth={barWidth}
        spacing={spacing}
        initialSpacing={8}
        endSpacing={0}
        roundedTop
        noOfSections={4}
        maxValue={allZero ? 100 : undefined}
        rulesColor="rgba(128,128,128,0.2)"
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisLabelWidth={yAxisWidth}
        yAxisTextStyle={{ color: textColor, opacity: 0.6, fontSize: 10 }}
        formatYLabel={(label: string) => compact(Number(label))}
        disableScroll={fits}
        isAnimated
        onPress={(_item: any, index: number) =>
          setSelected(Math.floor(index / 2))
        }
      />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
          <Text style={{ color: textColor, fontSize: 12 }}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
          <Text style={{ color: textColor, fontSize: 12 }}>Expense</Text>
        </View>
      </View>

      <View style={styles.detail}>
        {sel ? (
          <>
            <Text style={{ color: textColor, fontWeight: "600" }}>
              {sel.month}
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#22c55e", fontSize: 13 }}>
                Income {formatCurrency(sel.income, currency)}
              </Text>
              <Text style={{ color: "#ef4444", fontSize: 13 }}>
                Expense {formatCurrency(sel.expense, currency)}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ color: textColor, opacity: 0.5, fontSize: 12 }}>
            Tap a bar for the exact amounts
          </Text>
        )}
      </View>
    </View>
  );
}

export function CategoryDonut({
  items,
  currency,
  textColor,
  cardColor,
  maxRows = 5,
}: {
  items: { _id: string; total: number }[];
  currency: string;
  textColor: string;
  cardColor: string;
  maxRows?: number;
}) {
  const sorted = [...items].sort((a, b) => b.total - a.total);
  const total = sorted.reduce((s, i) => s + i.total, 0);

  if (sorted.length === 0 || total <= 0) {
    return (
      <Text
        style={{
          color: textColor,
          opacity: 0.6,
          paddingVertical: 16,
          textAlign: "center",
        }}
      >
        No data for this period.
      </Text>
    );
  }

  const top = sorted.slice(0, maxRows);
  const rest = sorted.slice(maxRows).reduce((s, i) => s + i.total, 0);
  const rows = [
    ...top.map((i) => ({
      name: i._id,
      value: i.total,
      color: CATEGORY_COLORS[i._id] || "#94a3b8",
    })),
    ...(rest > 0 ? [{ name: "Remaining", value: rest, color: "#64748b" }] : []),
  ];
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  return (
    <View>
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <PieChart
          data={rows.map((r) => ({ value: r.value, color: r.color }))}
          donut
          radius={82}
          innerRadius={54}
          innerCircleColor={cardColor}
          strokeColor={cardColor}
          strokeWidth={2}
          centerLabelComponent={() => (
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ color: textColor, fontSize: 16, fontWeight: "bold" }}
              >
                {symbol} {compact(total)}
              </Text>
              <Text style={{ color: textColor, opacity: 0.6, fontSize: 11 }}>
                Total
              </Text>
            </View>
          )}
        />
      </View>

      {rows.map((r) => {
        const pct = (r.value / total) * 100;
        return (
          <View key={r.name} style={styles.catRow}>
            <View style={styles.catTop}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Text style={{ color: textColor, flex: 1 }} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={{ color: textColor, fontWeight: "600" }}>
                {formatCurrency(r.value, currency)}
              </Text>
              <Text
                style={{
                  color: textColor,
                  opacity: 0.6,
                  width: 44,
                  textAlign: "right",
                  fontSize: 12,
                }}
              >
                {pct.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(pct, 2)}%`, backgroundColor: r.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  detail: { minHeight: 40, marginTop: 8, alignItems: "center", gap: 2 },
  catRow: { marginTop: 12 },
  catTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginTop: 6,
    overflow: "hidden",
  },
  fill: { height: 5, borderRadius: 3 },
});
