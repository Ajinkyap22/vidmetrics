"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";

type Row = { id: string; title: string; viewCount: number };

export function ViewsBarChart({
  rows,
  maxTitles,
}: {
  rows: Row[];
  maxTitles: number;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setChartSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const data = [...rows]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, maxTitles)
    .map((r) => ({
      id: r.id,
      fullTitle: r.title,
      name: r.title.length > 28 ? `${r.title.slice(0, 26)}…` : r.title,
      views: r.viewCount,
    }));

  if (data.length === 0) return null;

  const axisColor = isDark ? "#a3a3a3" : "#71717a";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const tooltipBg = isDark ? "#1a1a1a" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "#e4e4e7";
  const tooltipText = isDark ? "#f1f1f1" : "#18181b";

  return (
    <div className="h-80 min-h-80 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/50">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
          Top videos by views
        </h3>
        <p className="hidden text-[10px] font-medium text-zinc-400 sm:block dark:text-[#717171]">
          Hover for full title
        </p>
      </div>
      <div
        ref={containerRef}
        className="h-60 w-full rounded-xl"
      >
        {chartSize.width > 0 && chartSize.height > 0 ? (
          <BarChart
            width={chartSize.width}
            height={chartSize.height}
            data={data}
            layout="vertical"
            margin={{ left: 6, right: 18, top: 8, bottom: 8 }}
            barCategoryGap="34%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              horizontal
              vertical={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `${(v / 1_000).toFixed(0)}K`
                    : String(v)
              }
              tick={{ fontSize: 10, fill: axisColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={146}
              tick={{ fontSize: 11, fill: axisColor, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{
                fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              }}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 10,
                fontSize: 12,
                color: tooltipText,
                maxWidth: 320,
                whiteSpace: "normal",
                lineHeight: 1.35,
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
              labelFormatter={(_, payload) =>
                String(payload?.[0]?.payload?.fullTitle ?? "")
              }
              formatter={(value) =>
                typeof value === "number"
                  ? [value.toLocaleString(), "Views"]
                  : [String(value ?? ""), "Views"]
              }
            />
            <Bar
              dataKey="views"
              fill="#FF0033"
              radius={[0, 6, 6, 0]}
              maxBarSize={18}
            />
          </BarChart>
        ) : (
          <div className="h-full w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-white/5" />
        )}
      </div>
    </div>
  );
}
