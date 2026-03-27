"use client";

import clsx from "clsx";
import { formatCompact } from "@/lib/vidMetricsUtils";

function StatPill({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/50",
        className,
      )}
    >
      <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
        {label}
      </span>
      <span className="text-2xl font-bold text-zinc-900 dark:text-[#f1f1f1]">
        {value}
      </span>
    </div>
  );
}

type Props = {
  count: number;
  totalViews: number;
  avgViewsPerDay: number;
};

export function VidStatPills({ count, totalViews, avgViewsPerDay }: Props) {
  if (count <= 0) return null;
  return (
    <div className="animate-fade-slide-in-delayed grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatPill label="Videos in range" value={count.toString()} />
      <StatPill label="Total views" value={formatCompact(totalViews)} />
      <StatPill
        label="Avg views / day"
        value={formatCompact(Math.round(avgViewsPerDay))}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}
