"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
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

const UTC_DATE_DISPLAY: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
};

function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", UTC_DATE_DISPLAY);
}

/** Vanity URL slug as @handle for resolution messaging (API returns customUrl without @). */
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

  const [sortKey, setSortKey] = useState<SortKey>("viewCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "publishedAt") {
        return (
          dir *
          (new Date(a.publishedAt).getTime() -
            new Date(b.publishedAt).getTime())
        );
      }
      return dir * (a[sortKey] - b[sortKey]);
    });
  }, [filtered, sortKey, sortDir]);

  const vpdThreshold = useMemo(
    () => quartileThreshold(sorted.map((v) => v.viewsPerDay)),
    [sorted],
  );

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

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

  const sortBtn = (k: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
        sortKey === k
          ? "bg-red-600 text-white shadow-sm dark:bg-red-500"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      }`}
    >
      {label}
      {sortKey === k ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </button>
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
            VidMetrics
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Competitor pulse
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Paste a channel URL and see which recent uploads are pulling views.
            Defaults to{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              this month (UTC)
            </strong>
            . Adjust the range anytime.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-6">
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
            className="min-h-11 flex-1 rounded-xl border border-zinc-300 bg-zinc-50/80 px-4 text-zinc-900 shadow-inner outline-none ring-zinc-400 transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={runAnalyze}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white shadow-sm transition-[transform,background] hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {loading ? "Analyzing..." : "Analyze channel"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={runAnalyze}
              className="rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {data && (
        <>
          {data?.resolutionNote ? (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              Could not find an exact channel match for &quot;
              {data.resolutionNote.attempted}&quot;. Showing results for &quot;
              {channelAtHandle(data.channel, data.resolutionNote.resolvedTitle)}
              &quot; instead.
            </div>
          ) : null}

          <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              {data.channel.thumbnailUrl ? (
                <Image
                  src={data.channel.thumbnailUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="rounded-xl border border-zinc-200 object-cover dark:border-zinc-600"
                  unoptimized
                />
              ) : null}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {data.channel.title}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {data.channel.customUrl
                    ? `youtube.com/${data.channel.customUrl}`
                    : `Channel ID ${data.channel.id}`}
                  {" · "}
                  Scanned {data.meta.playlistItemsScanned} recent uploads
                  {data.meta.uploadsPlaylistTruncated
                    ? " (list capped at 200)"
                    : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={sorted.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Export CSV
            </button>
          </section>

          <section className="grid gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-6 lg:grid-cols-2 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-[8rem] flex-col gap-1">
                <label
                  htmlFor="f-start"
                  className="text-xs font-medium text-zinc-500"
                >
                  From (UTC)
                </label>
                <input
                  id="f-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
              <div className="flex min-w-[8rem] flex-col gap-1">
                <label
                  htmlFor="f-end"
                  className="text-xs font-medium text-zinc-500"
                >
                  To (UTC)
                </label>
                <input
                  id="f-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
              <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <label
                  htmlFor="f-title"
                  className="text-xs font-medium text-zinc-500"
                >
                  Title contains
                </label>
                <input
                  id="f-title"
                  type="search"
                  value={titleQ}
                  onChange={(e) => setTitleQ(e.target.value)}
                  placeholder="Filter..."
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
              <div className="flex w-28 flex-col gap-1">
                <label
                  htmlFor="f-minv"
                  className="text-xs font-medium text-zinc-500"
                >
                  Min views
                </label>
                <input
                  id="f-minv"
                  inputMode="numeric"
                  value={minViews}
                  onChange={(e) => setMinViews(e.target.value)}
                  placeholder="0"
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {sortBtn("viewCount", "Views")}
              {sortBtn("publishedAt", "Date")}
              {sortBtn("likeCount", "Likes")}
            </div>
          </section>

          <ViewsBarChart rows={sorted} maxTitles={8} />

          {sorted.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
              No videos in this range. Widen the UTC date range or clear
              filters.
            </p>
          ) : (
            <>
              <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-3">Video</th>
                        <th className="px-3 py-3">Published</th>
                        <th className="px-3 py-3">Duration</th>
                        <th className="px-3 py-3 text-right">Views</th>
                        <th className="px-3 py-3 text-right">Likes</th>
                        <th className="px-3 py-3 text-right">Comments</th>
                        <th className="px-3 py-3 text-right">Views/day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
      )}
    </div>
  );
}

function VideoTableRow({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <tr className="bg-white/80 hover:bg-zinc-50/90 dark:bg-transparent dark:hover:bg-zinc-800/50">
      <td className="px-3 py-2">
        <a
          href={`https://www.youtube.com/watch?v=${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 group"
        >
          <Image
            src={v.thumbnailUrl || "/vercel.svg"}
            alt=""
            width={80}
            height={45}
            className="rounded-md border border-zinc-200 object-cover dark:border-zinc-600"
            unoptimized
          />
          <span className="line-clamp-2 font-medium text-zinc-900 group-hover:text-red-600 dark:text-zinc-100 dark:group-hover:text-red-400">
            {v.title}
            {hot && (
              <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Top tier
              </span>
            )}
          </span>
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
        {formatUtcDate(v.publishedAt)}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {v.durationFormatted}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
        {formatNumber(v.viewCount)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatNumber(v.likeCount)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatNumber(v.commentCount)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
        {v.viewsPerDay.toFixed(1)}
      </td>
    </tr>
  );
}

function VideoCard({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <article className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
      <a
        href={`https://www.youtube.com/watch?v=${v.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3"
      >
        <Image
          src={v.thumbnailUrl || "/vercel.svg"}
          alt=""
          width={120}
          height={68}
          className="shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-600"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-3 font-semibold text-zinc-900 dark:text-zinc-100">
            {v.title}
          </h3>
          {hot && (
            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Top tier views/day
            </span>
          )}
        </div>
      </a>
      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <dt className="font-medium text-zinc-500">Published (UTC)</dt>
        <dd>{formatUtcDate(v.publishedAt)}</dd>
        <dt className="font-medium text-zinc-500">Duration</dt>
        <dd className="font-mono">{v.durationFormatted}</dd>
        <dt className="font-medium text-zinc-500">Views</dt>
        <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatNumber(v.viewCount)}
        </dd>
        <dt className="font-medium text-zinc-500">Likes</dt>
        <dd className="tabular-nums">{formatNumber(v.likeCount)}</dd>
        <dt className="font-medium text-zinc-500">Comments</dt>
        <dd className="tabular-nums">{formatNumber(v.commentCount)}</dd>
        <dt className="font-medium text-zinc-500">Views/day</dt>
        <dd className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
          {v.viewsPerDay.toFixed(1)}
        </dd>
      </dl>
    </article>
  );
}
