"use client";

import clsx from "clsx";
import type { AnalyzeSuccessResponse } from "@/lib/types";
import type { RecentChannelItem } from "@/lib/recentChannels";
import { channelAtHandle } from "@/lib/vidMetricsUtils";
import { CARD, CARD_SHADOW } from "./dashboardStyles";

type Props = {
  input: string;
  onInputChange: (v: string) => void;
  loading: boolean;
  onAnalyze: () => void;
  error: string | null;
  onRetry: () => void;
  recent: RecentChannelItem[];
  onPickRecent: (item: RecentChannelItem) => void;
  onClearRecent: () => void;
  storageAvailable: boolean;
  resolutionNote: AnalyzeSuccessResponse["resolutionNote"];
  channel: AnalyzeSuccessResponse["channel"] | null;
  fromCache: boolean;
  cacheTtlMinutes: number;
  onRefreshSkipCache: () => void;
};

export function ChannelSearchPanel({
  input,
  onInputChange,
  loading,
  onAnalyze,
  error,
  onRetry,
  recent,
  onPickRecent,
  onClearRecent,
  storageAvailable,
  resolutionNote,
  channel,
  fromCache,
  cacheTtlMinutes,
  onRefreshSkipCache,
}: Props) {
  return (
    <section className={clsx(CARD, CARD_SHADOW, "p-6")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="channel-url">
          YouTube channel URL
        </label>
        <input
          id="channel-url"
          type="url"
          autoComplete="off"
          placeholder="https://www.youtube.com/@handle or channel URL"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim() && !loading) onAnalyze();
          }}
          className="min-h-12 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-zinc-900 transition-all duration-200 outline-none placeholder:text-zinc-400 focus:border-[#FF0033] focus:ring-2 focus:ring-[#FF0033]/25 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={onAnalyze}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF0033] px-7 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                Analyzing...
              </>
            ) : (
              "Analyze channel"
            )}
          </button>
        </div>
      </div>

      {storageAvailable && recent.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
              Recent
            </p>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[10px] font-semibold text-zinc-500 underline-offset-2 hover:underline dark:text-[#717171]"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((item) => (
              <button
                key={item.channelId}
                type="button"
                onClick={() => onPickRecent(item)}
                className="max-w-full truncate rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 transition-colors hover:border-[#FF0033]/50 hover:bg-zinc-50 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:hover:bg-[#222]"
                title={item.title}
              >
                <span className="block truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {fromCache && channel ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-[#aaaaaa]">
          <span>
            Using cached results (about {cacheTtlMinutes} min). Data may be
            slightly stale.
          </span>
          <button
            type="button"
            onClick={onRefreshSkipCache}
            className="font-semibold text-[#FF0033] underline-offset-2 hover:underline"
          >
            Refresh from YouTube
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      ) : null}

      {resolutionNote && channel ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300"
        >
          Could not find an exact match for &quot;{resolutionNote.attempted}&quot;.
          Showing results for &quot;
          {channelAtHandle(channel, resolutionNote.resolvedTitle)}&quot; instead.
        </div>
      ) : null}
    </section>
  );
}
