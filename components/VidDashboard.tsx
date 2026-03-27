"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeSuccessResponse } from "@/lib/types";
import {
  getAnalyzeCache,
  setAnalyzeCache,
  analyzeCacheTtlMinutes,
} from "@/lib/analyzeClientCache";
import {
  endOfUtcMonth,
  formatInputDate,
  parseInputDateUtc,
  startOfUtcMonth,
} from "@/lib/dates";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  clearRecentChannels,
  getRecentChannels,
  recordRecentFromAnalyze,
  type RecentChannelItem,
} from "@/lib/recentChannels";
import {
  normalizeChannelInput,
  quartileThreshold,
  type VidSortKey,
} from "@/lib/vidMetricsUtils";
import { AnalyzeLoadingSkeleton } from "./vid/AnalyzeLoadingSkeleton";
import { ChannelHeroCard } from "./vid/ChannelHeroCard";
import { ChannelSearchPanel } from "./vid/ChannelSearchPanel";
import { VidDashboardHeader } from "./vid/VidDashboardHeader";
import { VidFilterBar } from "./vid/VidFilterBar";
import { VidStatPills } from "./vid/VidStatPills";
import { VidVideoResults } from "./vid/VidVideoResults";

export function VidDashboard() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeSuccessResponse | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [recent, setRecent] = useState<RecentChannelItem[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

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
    key: VidSortKey;
    dir: "asc" | "desc";
  } | null>(null);
  const [channelThumbFailed, setChannelThumbFailed] = useState(false);

  useEffect(() => {
    try {
      const k = "__vidmetrics_ls__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      setRecent(getRecentChannels());
    } catch {
      setStorageAvailable(false);
    }
  }, []);

  useEffect(() => {
    setChannelThumbFailed(false);
  }, [data?.channel.id]);

  const analyzeChannelUrl = useCallback(
    async (channelUrlRaw: string, opts?: { skipCache?: boolean }) => {
      const channelUrl = normalizeChannelInput(channelUrlRaw);
      if (!channelUrl) return;

      abortRef.current?.abort();

      setError(null);
      setFromCache(false);

      if (!opts?.skipCache) {
        const cached = getAnalyzeCache(channelUrl);
        if (cached) {
          setData(cached);
          setFromCache(true);
          setLoading(false);
          setRecent(recordRecentFromAnalyze(channelUrl, cached));
          return;
        }
      }

      const ac = new AbortController();
      abortRef.current = ac;

      setData(null);
      setLoading(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelUrl }),
          signal: ac.signal,
        });
        const json = (await res.json()) as
          | AnalyzeSuccessResponse
          | { ok: false; error: string };
        if (!json.ok) {
          setError("error" in json ? json.error : "Request failed");
          return;
        }
        setData(json);
        setAnalyzeCache(channelUrl, json);
        setRecent(recordRecentFromAnalyze(channelUrl, json));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Network error. Try again.");
      } finally {
        if (abortRef.current === ac) setLoading(false);
      }
    },
    [],
  );

  const runAnalyze = useCallback(() => {
    void analyzeChannelUrl(input, { skipCache: false });
  }, [input, analyzeChannelUrl]);

  const onRefreshSkipCache = useCallback(() => {
    void analyzeChannelUrl(input, { skipCache: true });
  }, [input, analyzeChannelUrl]);

  const onPickRecent = useCallback(
    (item: RecentChannelItem) => {
      setInput(item.input);
      void analyzeChannelUrl(item.input, { skipCache: false });
    },
    [analyzeChannelUrl],
  );

  const onClearRecent = useCallback(() => {
    clearRecentChannels();
    setRecent([]);
  }, []);

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

  const toggleSort = (k: VidSortKey) => {
    setSortState((prev) => {
      if (!prev || prev.key !== k) return { key: k, dir: "desc" };
      if (prev.dir === "desc") return { key: k, dir: "asc" };
      return null;
    });
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

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <VidDashboardHeader />

      <ChannelSearchPanel
        input={input}
        onInputChange={setInput}
        loading={loading}
        onAnalyze={runAnalyze}
        error={error}
        onRetry={runAnalyze}
        recent={recent}
        onPickRecent={onPickRecent}
        onClearRecent={onClearRecent}
        storageAvailable={storageAvailable}
        resolutionNote={data?.resolutionNote}
        channel={data?.channel ?? null}
        fromCache={fromCache}
        cacheTtlMinutes={analyzeCacheTtlMinutes}
        onRefreshSkipCache={onRefreshSkipCache}
      />

      {loading ? <AnalyzeLoadingSkeleton /> : null}

      {data && !loading ? (
        <div className="animate-fade-slide-in flex flex-col gap-8">
          <ChannelHeroCard
            data={data}
            channelThumbFailed={channelThumbFailed}
            onChannelThumbError={() => setChannelThumbFailed(true)}
            exportDisabled={sorted.length === 0}
            onExportCsv={exportCsv}
          />

          <VidStatPills
            count={sorted.length}
            totalViews={totalViewsInRange}
            avgViewsPerDay={avgViewsPerDay}
          />

          <VidFilterBar
            dateStart={dateStart}
            dateEnd={dateEnd}
            onDateStart={setDateStart}
            onDateEnd={setDateEnd}
            titleQ={titleQ}
            onTitleQ={setTitleQ}
            minViews={minViews}
            onMinViews={setMinViews}
          />

          <VidVideoResults
            sorted={sorted}
            vpdThreshold={vpdThreshold}
            sortState={sortState}
            onToggleSort={toggleSort}
          />
        </div>
      ) : null}
    </div>
  );
}
