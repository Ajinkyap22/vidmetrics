"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { AnalyzeSuccessResponse, VideoItem } from "@/lib/types";
import {
  endOfUtcMonth,
  formatInputDate,
  parseInputDateUtc,
  startOfUtcMonth,
} from "@/lib/dates";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ThemeToggle } from "./ThemeToggle";
import { ViewsBarChart } from "./ViewsBarChart";

type SortKey = "viewCount" | "publishedAt" | "likeCount";

function quartileThreshold(values: number[]): number {
  if (values.length < 2) return Infinity;
  const s = [...values].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor(s.length * 0.75));
  return s[i] ?? Infinity;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

const UTC_DATE_DISPLAY: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
};

function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", UTC_DATE_DISPLAY);
}

function channelAtHandle(
  channel: AnalyzeSuccessResponse["channel"],
  titleFallback: string,
): string {
  const raw = channel.customUrl?.trim();
  if (raw) {
    const slug = raw.replace(/^@/, "").replace(/^\//, "");
    return slug ? `@${slug}` : titleFallback;
  }
  return titleFallback;
}

/* ── Card / surface class shorthands ─────────────────────────────────────── */
const CARD =
  "rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#1a1a1a]";
const CARD_SHADOW = "shadow-lg dark:shadow-black/50";

export function VidDashboard() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeSuccessResponse | null>(null);

  const [defaultStart, defaultEnd] = useMemo(() => {
    const now = new Date();
    return [
      formatInputDate(startOfUtcMonth(now)),
      formatInputDate(endOfUtcMonth(now)),
    ] as const;
  }, []);

  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(defaultEnd);
  const [titleQ, setTitleQ] = useState("");
  const [minViews, setMinViews] = useState("");
  const debouncedTitleQ = useDebouncedValue(titleQ, 320);
  const debouncedMinViews = useDebouncedValue(minViews, 320);

  const [sortState, setSortState] = useState<{
    key: SortKey;
    dir: "asc" | "desc";
  } | null>(null);
  const [channelThumbFailed, setChannelThumbFailed] = useState(false);

  const runAnalyze = useCallback(async () => {
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: input }),
      });
      const json = (await res.json()) as
        | AnalyzeSuccessResponse
        | { ok: false; error: string };
      if (!json.ok) {
        setError("error" in json ? json.error : "Request failed");
        return;
      }
      setData(json);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const filtered = useMemo(() => {
    if (!data?.videos.length) return [];
    const t0 = parseInputDateUtc(dateStart).getTime();
    const t1 = parseInputDateUtc(dateEnd).getTime() + 86400000 - 1;
    const q = debouncedTitleQ.trim().toLowerCase();
    const minV = debouncedMinViews.trim()
      ? parseInt(debouncedMinViews.replace(/,/g, ""), 10)
      : 0;
    const minOk = Number.isFinite(minV) ? minV : 0;

    return data.videos.filter((v) => {
      const t = new Date(v.publishedAt).getTime();
      if (t < t0 || t > t1) return false;
      if (q && !v.title.toLowerCase().includes(q)) return false;
      if (v.viewCount < minOk) return false;
      return true;
    });
  }, [data, dateStart, dateEnd, debouncedTitleQ, debouncedMinViews]);

  const sorted = useMemo(() => {
    if (!sortState) return filtered;
    const dir = sortState.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortState.key === "publishedAt") {
        return (
          dir *
          (new Date(a.publishedAt).getTime() -
            new Date(b.publishedAt).getTime())
        );
      }
      return dir * (a[sortState.key] - b[sortState.key]);
    });
  }, [filtered, sortState]);

  const vpdThreshold = useMemo(
    () => quartileThreshold(sorted.map((v) => v.viewsPerDay)),
    [sorted],
  );

  const toggleSort = (k: SortKey) => {
    setSortState((prev) => {
      if (!prev || prev.key !== k) return { key: k, dir: "desc" };
      if (prev.dir === "desc") return { key: k, dir: "asc" };
      return null;
    });
  };

  useEffect(() => {
    setChannelThumbFailed(false);
  }, [data?.channel.id]);

  const exportCsv = () => {
    const headers = [
      "title",
      "videoId",
      "publishedAt",
      "duration",
      "views",
      "likes",
      "comments",
      "viewsPerDay",
    ];
    const lines = [
      headers.join(","),
      ...sorted.map((v) =>
        [
          `"${v.title.replace(/"/g, '""')}"`,
          v.id,
          v.publishedAt,
          v.durationFormatted,
          v.viewCount,
          v.likeCount,
          v.commentCount,
          v.viewsPerDay.toFixed(2),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vidmetrics-export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalViewsInRange = useMemo(
    () => sorted.reduce((s, v) => s + v.viewCount, 0),
    [sorted],
  );
  const avgViewsPerDay = useMemo(
    () =>
      sorted.length
        ? sorted.reduce((s, v) => s + v.viewsPerDay, 0) / sorted.length
        : 0,
    [sorted],
  );

  const sortIndicator = (k: SortKey) => {
    if (!sortState || sortState.key !== k) return "↕";
    return sortState.dir === "desc" ? "↓" : "↑";
  };

  const sortableHeader = (k: SortKey, label: string, alignRight = false) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
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
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF0033]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <polygon points="2,1 11,6 2,11" fill="white" />
              </svg>
            </span>
            <span className="bg-linear-to-r from-[#FF0033] to-[#FF6B00] bg-clip-text text-sm font-bold tracking-[0.2em] text-transparent uppercase">
              VidMetrics
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-[#f1f1f1]">
            Competitor{" "}
            <span className="bg-linear-to-r from-[#FF0033] to-[#FF6B00] bg-clip-text text-transparent">
              Pulse
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-zinc-500 dark:text-[#aaaaaa]">
            Paste a channel URL and instantly see which recent uploads are
            pulling views. Defaults to{" "}
            <strong className="font-semibold text-zinc-800 dark:text-[#f1f1f1]">
              this month (UTC)
            </strong>
            .
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Search card ────────────────────────────────────────────────────── */}
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim() && !loading)
                void runAnalyze();
            }}
            className="min-h-12 flex-1 rounded-xl border border-zinc-300 bg-white px-4 text-zinc-900 transition-all duration-200 outline-none placeholder:text-zinc-400 focus:border-[#FF0033] focus:ring-2 focus:ring-[#FF0033]/25 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={runAnalyze}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF0033] px-7 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                Analyzing…
              </>
            ) : (
              "Analyze channel"
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={runAnalyze}
              className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {loading && (
        <section className="animate-fade-slide-in rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
                Scanning Channel
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-[#aaaaaa]">
                Pulling uploads and ranking momentum...
              </p>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="h-2 w-1.5 animate-pulse rounded bg-[#FF0033]" />
              <span className="h-4 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:120ms]" />
              <span className="h-6 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:240ms]" />
              <span className="h-4 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:360ms]" />
              <span className="h-2 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:480ms]" />
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <div className="h-2 w-2/3 rounded bg-zinc-200 dark:bg-white/10" />
            <div className="h-2 w-full rounded bg-zinc-200 dark:bg-white/10" />
            <div className="h-2 w-4/5 rounded bg-zinc-200 dark:bg-white/10" />
          </div>
        </section>
      )}

      {data && (
        <div className="animate-fade-slide-in flex flex-col gap-8">
          {/* ── Resolution note ──────────────────────────────────────────────── */}
          {data.resolutionNote ? (
            <div
              role="status"
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300"
            >
              Could not find an exact match for &quot;
              {data.resolutionNote.attempted}&quot;. Showing results for &quot;
              {channelAtHandle(data.channel, data.resolutionNote.resolvedTitle)}
              &quot; instead.
            </div>
          ) : null}

          {/* ── Channel card ─────────────────────────────────────────────────── */}
          <section
            className={clsx(
              CARD,
              CARD_SHADOW,
              "flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div className="flex items-center gap-4">
              {data.channel.thumbnailUrl && !channelThumbFailed ? (
                <Image
                  src={data.channel.thumbnailUrl}
                  alt=""
                  width={60}
                  height={60}
                  className="rounded-full border-2 border-[#FF0033] object-cover"
                  style={{ boxShadow: "0 0 18px rgba(255,0,51,0.35)" }}
                  onError={() => setChannelThumbFailed(true)}
                  unoptimized
                />
              ) : (
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-[#272727] dark:text-[#aaaaaa]">
                  <span className="text-lg">▶</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-[#f1f1f1]">
                  {data.channel.title}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-[#aaaaaa]">
                  {data.channel.customUrl
                    ? `youtube.com/${data.channel.customUrl}`
                    : `Channel ID ${data.channel.id}`}
                  {" · "}
                  {data.meta.playlistItemsScanned} uploads scanned
                  {data.meta.uploadsPlaylistTruncated ? " (capped at 200)" : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={sorted.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-all duration-200 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:bg-[#272727] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path
                  d="M7 1v8M4 6l3 3 3-3M1 10v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export CSV
            </button>
          </section>

          {/* ── Stat pills ───────────────────────────────────────────────────── */}
          {sorted.length > 0 && (
            <div className="animate-fade-slide-in-delayed grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatPill
                label="Videos in range"
                value={sorted.length.toString()}
              />
              <StatPill
                label="Total views"
                value={formatCompact(totalViewsInRange)}
              />
              <StatPill
                label="Avg views / day"
                value={formatCompact(Math.round(avgViewsPerDay))}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          )}

          {/* ── Filters ──────────────────────────────────────────────────────── */}
          <section className="px-1">
            <p className="mb-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
              Filters
            </p>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap gap-3">
                <FilterField id="f-start" label="From (UTC)">
                  <input
                    id="f-start"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 scheme-light transition-colors outline-none focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:scheme-dark"
                  />
                </FilterField>
                <FilterField id="f-end" label="To (UTC)">
                  <input
                    id="f-end"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 scheme-light transition-colors outline-none focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:scheme-dark"
                  />
                </FilterField>
                <FilterField
                  id="f-title"
                  label="Title contains"
                  className="min-w-40 flex-1"
                >
                  <input
                    id="f-title"
                    type="search"
                    value={titleQ}
                    onChange={(e) => setTitleQ(e.target.value)}
                    placeholder="Filter…"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition-colors outline-none placeholder:text-zinc-400 focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
                  />
                </FilterField>
                <FilterField id="f-minv" label="Min views" className="w-28">
                  <input
                    id="f-minv"
                    inputMode="numeric"
                    value={minViews}
                    onChange={(e) => setMinViews(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition-colors outline-none placeholder:text-zinc-400 focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
                  />
                </FilterField>
              </div>
            </div>
          </section>

          {/* ── Chart ────────────────────────────────────────────────────────── */}
          <ViewsBarChart rows={sorted} maxTitles={6} />

          {/* ── Results ──────────────────────────────────────────────────────── */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center dark:border-white/10">
              <span className="text-3xl opacity-40">📭</span>
              <p className="text-sm text-zinc-500 dark:text-[#717171]">
                No videos in this range. Widen the date range or clear filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
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

              {/* Mobile cards */}
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
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

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

function FilterField({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-zinc-500 dark:text-[#717171]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function VideoTableRow({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <tr className="group border-b border-zinc-100 bg-zinc-50 last:border-b-0 hover:bg-zinc-100 dark:border-white/5 dark:bg-[#1a1a1a] dark:hover:bg-[#222]">
      <td className="px-4 py-3">
        <a
          href={`https://www.youtube.com/watch?v=${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3"
        >
          <div className="relative shrink-0 overflow-hidden rounded-lg">
            <Image
              src={v.thumbnailUrl || "/vercel.svg"}
              alt=""
              width={88}
              height={48}
              className="h-12 w-22 object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          </div>
          <span className="line-clamp-2 font-medium text-zinc-900 transition-colors duration-150 group-hover:text-[#FF0033] dark:text-[#f1f1f1]">
            {v.title}
            {hot && <HotBadge />}
          </span>
        </a>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-[#aaaaaa]">
        {formatUtcDate(v.publishedAt)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-[#aaaaaa]">
        {v.durationFormatted}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-[#f1f1f1]">
        {formatNumber(v.viewCount)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums dark:text-[#aaaaaa]">
        {formatNumber(v.likeCount)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums dark:text-[#aaaaaa]">
        {formatNumber(v.commentCount)}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-[#f1f1f1]">
        {v.viewsPerDay.toFixed(1)}
      </td>
    </tr>
  );
}

function VideoCard({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-colors duration-200 hover:bg-zinc-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:bg-[#222]">
      <a
        href={`https://www.youtube.com/watch?v=${v.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3"
      >
        <div className="relative shrink-0 overflow-hidden rounded-xl">
          <Image
            src={v.thumbnailUrl || "/vercel.svg"}
            alt=""
            width={128}
            height={72}
            className="h-18 w-32 object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-3 font-semibold text-zinc-900 dark:text-[#f1f1f1]">
            {v.title}
          </h3>
          {hot && (
            <span className="mt-2 inline-block">
              <HotBadge />
            </span>
          )}
        </div>
      </a>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <MetaRow label="Published" value={formatUtcDate(v.publishedAt)} />
        <MetaRow label="Duration" value={v.durationFormatted} mono />
        <MetaRow label="Views" value={formatNumber(v.viewCount)} bold />
        <MetaRow label="Likes" value={formatNumber(v.likeCount)} />
        <MetaRow label="Comments" value={formatNumber(v.commentCount)} />
        <MetaRow label="Views/day" value={v.viewsPerDay.toFixed(1)} bold />
      </dl>
    </article>
  );
}

function MetaRow({
  label,
  value,
  bold = false,
  mono = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="font-medium text-zinc-500 dark:text-[#717171]">{label}</dt>
      <dd
        className={clsx(
          "text-zinc-800 tabular-nums dark:text-[#f1f1f1]",
          bold && "font-semibold",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </>
  );
}

function HotBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase dark:bg-[#ffb600]">
      <span>▲</span> Trending
    </span>
  );
}
