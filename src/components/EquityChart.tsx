// src/components/EquityChart.tsx
"use client";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type EquityPoint = {
  date: string;   // ISO
  equity: number; // bankroll
};

function formatMoney(currency: string, n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // "26 Feb" style (matches your UI)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function EquityChart({
  points,
  currency,
}: {
  points: EquityPoint[];
  currency: string;
}) {
  const data = (points ?? []).map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tickMargin={8} />
          <YAxis
            tickMargin={8}
            width={70}
            tickFormatter={(v) => {
              const n = Number(v);
              if (!Number.isFinite(n)) return String(v);
              return n.toFixed(0);
            }}
          />
          <Tooltip
            formatter={(value: any) => formatMoney(currency, Number(value))}
            labelFormatter={(label: any) => String(label)}
          />
          <Line
            type="monotone"
            dataKey="equity"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}