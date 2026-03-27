"use client";

import clsx from "clsx";

import type { VideoItem } from "@/lib/types";
import type { VidSortKey } from "@/lib/vidMetricsUtils";

import { ViewsBarChart } from "@/components/ViewsBarChart";
import { VideoCard, VideoTableRow } from "@/components/vid/VideoRows";
import { CARD, CARD_SHADOW } from "@/components/vid/dashboardStyles";

type SortState = { key: VidSortKey; dir: "asc" | "desc" } | null;

type Props = {
  sorted: VideoItem[];
  vpdThreshold: number;
  sortState: SortState;
  onToggleSort: (k: VidSortKey) => void;
};

export function VidVideoResults({
  sorted,
  vpdThreshold,
  sortState,
  onToggleSort,
}: Props) {
  const mobileSortOptions: Array<{ key: VidSortKey; label: string }> = [
    { key: "viewCount", label: "Views" },
    { key: "publishedAt", label: "Published" },
    { key: "likeCount", label: "Likes" },
  ];

  const sortIndicator = (k: VidSortKey) => {
    if (!sortState || sortState.key !== k) return "↕";
    return sortState.dir === "desc" ? "↓" : "↑";
  };

  const sortableHeader = (k: VidSortKey, label: string, alignRight = false) => (
    <button
      type="button"
      onClick={() => onToggleSort(k)}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors",
        alignRight && "ml-auto",
        sortState?.key === k
          ? "text-zinc-700 dark:text-[#f1f1f1]"
          : "text-zinc-400 hover:text-zinc-600 dark:text-[#717171] dark:hover:text-[#aaaaaa]",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span className="inline-block w-3 text-center">{sortIndicator(k)}</span>
    </button>
  );

  return (
    <>
      <ViewsBarChart rows={sorted} maxTitles={6} />
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center dark:border-white/10">
          <span className="text-3xl opacity-40">📭</span>
          <p className="text-sm text-zinc-500 dark:text-[#717171]">
            No videos in this range. Widen the date range or clear filters.
          </p>
        </div>
      ) : (
        <>
          <div
            className={clsx(
              "hidden overflow-hidden md:block",
              CARD,
              CARD_SHADOW,
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-white dark:border-white/10 dark:bg-[#111]">
                  <tr>
                    <th className="px-4 py-3.5 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      Video
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      {sortableHeader("publishedAt", "Published")}
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      Duration
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      {sortableHeader("viewCount", "Views", true)}
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      {sortableHeader("likeCount", "Likes", true)}
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      Comments
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                      Views/day
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((v) => (
                    <VideoTableRow
                      key={v.id}
                      v={v}
                      hot={v.viewsPerDay >= vpdThreshold}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-[#1a1a1a]">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                Sort
              </span>

              {mobileSortOptions.map((opt) => {
                const isActive = sortState?.key === opt.key;
                const dir =
                  isActive && sortState?.dir === "desc" ? "Desc" : "Asc";

                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onToggleSort(opt.key)}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-[#FF0033]/35 bg-[#FF0033]/10 text-[#b00025] dark:text-[#ff8ca3]"
                        : "border-zinc-300 bg-white text-zinc-700 dark:border-white/15 dark:bg-[#0f0f0f] dark:text-[#aaaaaa]",
                    )}
                    aria-label={`Sort mobile results by ${opt.label}`}
                  >
                    {opt.label}
                    <span className="text-[10px]">
                      {sortIndicator(opt.key)}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] opacity-80">({dir})</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {sorted.map((v) => (
              <VideoCard key={v.id} v={v} hot={v.viewsPerDay >= vpdThreshold} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
