import type { AnalyzeSuccessResponse } from "./types";
import { channelAtHandle, normalizeChannelInput } from "./vidMetricsUtils";

const STORAGE_KEY = "vidmetrics-recent-channels:v1";
const MAX_ITEMS = 5;

export type RecentChannelItem = {
  input: string;
  channelId: string;
  title: string;
  label: string;
  ts: number;
};

function readAll(): RecentChannelItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentChannelItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(items: RecentChannelItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
  }
}

export function getRecentChannels(): RecentChannelItem[] {
  return readAll()
    .filter((x) => x.channelId && x.input)
    .sort((a, b) => b.ts - a.ts);
}

export function recordRecentFromAnalyze(
  userInput: string,
  response: AnalyzeSuccessResponse,
): RecentChannelItem[] {
  const input = normalizeChannelInput(userInput);
  const label = channelAtHandle(
    response.channel,
    response.channel.title || "Channel",
  );
  const next: RecentChannelItem = {
    input,
    channelId: response.channel.id,
    title: response.channel.title || "Channel",
    label,
    ts: Date.now(),
  };
  const rest = readAll().filter((x) => x.channelId !== next.channelId);
  const merged = [next, ...rest].slice(0, MAX_ITEMS);
  writeAll(merged);
  return merged;
}

export function clearRecentChannels(): void {
  writeAll([]);
}
