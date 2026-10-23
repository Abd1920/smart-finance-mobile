import { compact } from "@/components/charts";
import { formatCurrency } from "@/utils/currencies";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

type MonthPoint = { month: string; income: number; expense: number };

export default function SavingsTrendChart({
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
  const height = 180;
  const padTop = 14;
  const padBottom = 26;
  const chartW = width - yAxisWidth;
  const innerH = height - padTop - padBottom;

  const values = data.map((m) => m.income - m.expense);
  const maxV = Math.max(0, ...values);
  const minV = Math.min(0, ...values);
  const span = maxV - minV || 1;
  const top = maxV + span * 0.12;
  const bottom = minV < 0 ? minV - span * 0.12 : 0;
  const range = top - bottom || 1;

  const yOf = (v: number) => padTop + ((top - v) / range) * innerH;
  const xOf = (i: number) =>
    data.length === 1
      ? chartW / 2
      : 14 + (i * (chartW - 28)) / (data.length - 1);

  const ticks = [0, 1, 2, 3].map((i) => bottom + (range * i) / 3);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(v)}`)
    .join(" ");
  const labelEvery = data.length > 8 ? 2 : 1;
  const selValue = selected !== null ? values[selected] : null;

  return (
    <View>
      <View style={{ width, height }}>
        {ticks.map((t, i) => (
          <Text
            key={`y${i}`}
            style={[
              styles.yLabel,
              { color: textColor, top: yOf(t) - 7, width: yAxisWidth - 6 },
            ]}
          >
            {compact(t)}
          </Text>
        ))}

        <Svg
          width={chartW}
          height={height}
          style={{ position: "absolute", left: yAxisWidth, top: 0 }}
        >
          {ticks.map((t, i) => (
            <Line
              key={`g${i}`}
              x1={0}
              x2={chartW}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke="rgba(128,128,128,0.2)"
              strokeWidth={1}
            />
          ))}
          {bottom < 0 && (
            <Line
              x1={0}
              x2={chartW}
              y1={yOf(0)}
              y2={yOf(0)}
              stroke="rgba(128,128,128,0.8)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          {selected !== null && (
            <Line
              x1={xOf(selected)}
              x2={xOf(selected)}
              y1={padTop}
              y2={height - padBottom}
              stroke="rgba(59,130,246,0.45)"
              strokeWidth={1}
            />
          )}
          <Path
            d={path}
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {values.map((v, i) => (
            <Circle
              key={`p${i}`}
              cx={xOf(i)}
              cy={yOf(v)}
              r={selected === i ? 6 : 4}
              fill={v < 0 ? "#ef4444" : "#3b82f6"}
            />
          ))}
        </Svg>

        {data.map((m, i) =>
          i % labelEvery === 0 ? (
            <Text
              key={`x${i}`}
              style={[
                styles.xLabel,
                {
                  color: textColor,
                  left: yAxisWidth + xOf(i) - 15,
                  top: height - padBottom + 8,
                },
              ]}
            >
              {m.month}
            </Text>
          ) : null,
        )}

        {/* tap columns */}
        <View
          style={{
            position: "absolute",
            left: yAxisWidth,
            top: 0,
            width: chartW,
            height,
            flexDirection: "row",
          }}
        >
          {data.map((_, i) => (
            <Pressable
              key={`t${i}`}
              style={{ flex: 1 }}
              onPress={() => setSelected(i)}
            />
          ))}
        </View>
      </View>

      <View style={styles.detail}>
        {selected !== null && selValue !== null ? (
          <>
            <Text style={{ color: textColor, fontWeight: "600" }}>
              {data[selected].month}
            </Text>
            <Text
              style={{
                color: selValue >= 0 ? "#22c55e" : "#ef4444",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {selValue >= 0 ? "Saved " : "Overspent "}
              {formatCurrency(Math.abs(selValue), currency)}
            </Text>
          </>
        ) : (
          <Text style={{ color: textColor, opacity: 0.5, fontSize: 12 }}>
            Tap a point to see that month's savings
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: {
    position: "absolute",
    left: 0,
    textAlign: "right",
    fontSize: 10,
    opacity: 0.6,
  },
  xLabel: {
    position: "absolute",
    width: 30,
    textAlign: "center",
    fontSize: 11,
    opacity: 0.6,
  },
  detail: { minHeight: 40, marginTop: 8, alignItems: "center", gap: 2 },
});
