"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { id: string; title: string; viewCount: number };

export function ViewsBarChart({ rows, maxTitles }: { rows: Row[]; maxTitles: number }) {
  const data = [...rows]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, maxTitles)
    .map((r) => ({
      id: r.id,
      name:
        r.title.length > 28 ? `${r.title.slice(0, 26)}…` : r.title,
      views: r.viewCount,
    }));

  if (data.length === 0) return null;

  return (
    <div className="h-72 w-full rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Top videos by views (in results)
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-zinc-200 dark:stroke-zinc-700"
            horizontal
            vertical={false}
          />
          <XAxis
            type="number"
            tickFormatter={(v) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)
            }
            className="text-[10px] text-zinc-500"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 10 }}
            className="text-zinc-600 dark:text-zinc-400"
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
            formatter={(value) =>
              typeof value === "number" ? value.toLocaleString() : String(value ?? "")
            }
          />
          <Bar dataKey="views" fill="#dc2626" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
