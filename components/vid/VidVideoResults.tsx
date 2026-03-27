"use client";

import clsx from "clsx";
import type { VideoItem } from "@/lib/types";
import type { VidSortKey } from "@/lib/vidMetricsUtils";
import { ViewsBarChart } from "../ViewsBarChart";
import { VideoCard, VideoTableRow } from "./videoRows";
import { CARD, CARD_SHADOW } from "./dashboardStyles";

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
  const sortIndicator = (k: VidSortKey) => {
    if (!sortState || sortState.key !== k) return "↕";
    return sortState.dir === "desc" ? "↓" : "↑";
  };

  const sortableHeader = (k: VidSortKey, label: string, alignRight = false) => (
    <button
      type="button"
      onClick={() => onToggleSort(k)}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
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
            className={clsx("hidden overflow-hidden md:block", CARD, CARD_SHADOW)}
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
            {sorted.map((v) => (
              <VideoCard
                key={v.id}
                v={v}
                hot={v.viewsPerDay >= vpdThreshold}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
