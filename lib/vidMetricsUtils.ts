import type { AnalyzeSuccessResponse } from "./types";

export type VidSortKey = "viewCount" | "publishedAt" | "likeCount";

export function quartileThreshold(values: number[]): number {
  if (values.length < 2) return Infinity;
  const s = [...values].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor(s.length * 0.75));
  return s[i] ?? Infinity;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatCompact(n: number): string {
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

export function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", UTC_DATE_DISPLAY);
}

export function channelAtHandle(
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

export function normalizeChannelInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
