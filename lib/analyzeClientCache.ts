import type { AnalyzeSuccessResponse } from "./types";
import { normalizeChannelInput } from "./vidMetricsUtils";

const PREFIX = "vidmetrics-cache:v1:";
const DEFAULT_TTL_MS = 15 * 60 * 1000;

type Entry = {
  data: AnalyzeSuccessResponse;
  expiresAt: number;
};

function keyFor(input: string): string {
  return `${PREFIX}${normalizeChannelInput(input).toLowerCase()}`;
}

export function getAnalyzeCache(
  channelInput: string,
  now = Date.now(),
): AnalyzeSuccessResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(channelInput));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!parsed?.data?.ok || typeof parsed.expiresAt !== "number")
      return null;
    if (parsed.expiresAt <= now) {
      localStorage.removeItem(keyFor(channelInput));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setAnalyzeCache(
  channelInput: string,
  data: AnalyzeSuccessResponse,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now(),
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: Entry = {
      data,
      expiresAt: now + ttlMs,
    };
    localStorage.setItem(keyFor(channelInput), JSON.stringify(entry));
  } catch {
  }
}

export function clearAnalyzeCacheEntry(channelInput: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor(channelInput));
  } catch {
  }
}

export const ANALYZE_CACHE_TTL_MS = DEFAULT_TTL_MS;
export const analyzeCacheTtlMinutes = DEFAULT_TTL_MS / 60_000;
