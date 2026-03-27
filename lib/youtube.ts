import type {
  AnalyzeSuccessResponse,
  AnalyzeErrorResponse,
  VideoItem,
} from "./types";

const YT = "https://www.googleapis.com/youtube/v3";
const PLAYLIST_PAGE = 50;
const MAX_PLAYLIST_ITEMS = 200;
const VIDEO_BATCH = 50;
const YT_TIMEOUT_MS = 12_000;

type ParsedChannelRef =
  | { kind: "channelId"; channelId: string }
  | { kind: "handle"; handle: string }
  | { kind: "searchQuery"; query: string };

function tryParseUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (!/^https?:\/\//i.test(t)) {
      return new URL(`https://${t}`);
    }
    return new URL(t);
  } catch {
    return null;
  }
}

export function parseChannelInput(input: string): ParsedChannelRef | null {
  const raw = input.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;

  const asUrl = tryParseUrl(raw);
  if (!asUrl) {
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) return null;
    return { kind: "handle", handle };
  }

  const host = asUrl.hostname.replace(/^www\./i, "").toLowerCase();
  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "youtu.be"
  ) {
    return null;
  }

  if (host === "youtu.be") {
    return null;
  }

  const path = asUrl.pathname.replace(/\/+$/, "") || "/";

  const ch = path.match(/\/channel\/([^/]+)/i);
  if (ch?.[1]) {
    const id = ch[1].trim();
    if (id.length >= 10) {
      return { kind: "channelId", channelId: id };
    }
  }

  const h = path.match(/\/@([^/]+)/i);
  if (h?.[1]) {
    return {
      kind: "handle",
      handle: decodeURIComponent(h[1]),
    };
  }

  const c = path.match(/\/c\/([^/]+)/i);
  if (c?.[1]) {
    return {
      kind: "searchQuery",
      query: decodeURIComponent(c[1].replace(/\+/g, " ")),
    };
  }

  const u = path.match(/\/user\/([^/]+)/i);
  if (u?.[1]) {
    return {
      kind: "searchQuery",
      query: decodeURIComponent(u[1].replace(/\+/g, " ")),
    };
  }

  return null;
}

async function ytGet(
  key: string,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<Response> {
  const u = new URL(`${YT}/${path}`);
  u.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) u.searchParams.set(k, String(v));
  }
  return fetch(u.toString(), {
    next: { revalidate: 0 },
    cache: "no-store",
    signal: AbortSignal.timeout(YT_TIMEOUT_MS),
  });
}

type YtResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

async function ytRequest<T>(
  key: string,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<YtResult<T>> {
  let r: Response;
  try {
    r = await ytGet(key, path, params);
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      message: isTimeout
        ? "YouTube API request timed out."
        : "YouTube API request failed before receiving a response.",
    };
  }
  let data: unknown;
  try {
    data = await r.json();
  } catch {
    return {
      ok: false,
      status: r.status,
      message: "Could not read YouTube API response.",
    };
  }
  if (!r.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: { message?: string } }).error?.message ===
        "string"
        ? (data as { error: { message: string } }).error.message
        : `YouTube API returned HTTP ${r.status}`;
    return { ok: false, status: r.status, message: msg };
  }
  return { ok: true, data: data as T };
}

function isoDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const mi = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + mi * 60 + s;
}

export function formatIsoDuration(iso: string): string {
  const sec = isoDurationSeconds(iso);
  if (sec <= 0) return "n/a";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function daysSince(isoDate: string): number {
  const pub = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - pub);
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function thumbUrl(snippet: {
  thumbnails?: {
    high?: { url?: string };
    medium?: { url?: string };
    default?: { url?: string };
  };
}): string {
  const raw =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    "";
  if (!raw) return "";
  // Some YouTube responses can be protocol-relative; normalize for browser safety.
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("http://")) return raw.replace(/^http:\/\//, "https://");
  return raw;
}

type ResolvedChannel = {
  id: string;
  snippet: {
    title?: string;
    customUrl?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails: {
    relatedPlaylists?: { uploads?: string };
  };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type ChannelListResponse = {
  items?: Array<{
    id: string;
    snippet?: ResolvedChannel["snippet"];
    contentDetails?: ResolvedChannel["contentDetails"];
    statistics?: ResolvedChannel["statistics"];
  }>;
};

type SearchListResponse = {
  items?: Array<{
    id?: { channelId?: string };
    snippet?: { channelId?: string };
  }>;
};

type ResolveOk = {
  ok: true;
  channel: ResolvedChannel;
  /** False when `forHandle` missed and we used search, or when resolving /c/ or /user/ via search only. */
  exactMatch: boolean;
  /** Label for UI when `exactMatch` is false (shown inside quotes). */
  attemptedLabel?: string;
};

type ResolveOutcome =
  | ResolveOk
  | { ok: false; error: string; code: "NOT_FOUND" | "YOUTUBE" };

async function resolveChannel(
  key: string,
  ref: ParsedChannelRef,
): Promise<ResolveOutcome> {
  const mapItem = (
    it:
      | {
          id: string;
          snippet?: ResolvedChannel["snippet"];
          contentDetails?: ResolvedChannel["contentDetails"];
          statistics?: ResolvedChannel["statistics"];
        }
      | undefined,
  ): ResolvedChannel | null => {
    if (!it?.snippet || !it.contentDetails) return null;
    return {
      id: it.id,
      snippet: it.snippet,
      contentDetails: it.contentDetails,
      statistics: it.statistics,
    };
  };

  const loadById = async (channelId: string): Promise<ResolveOutcome> => {
    const res = await ytRequest<ChannelListResponse>(key, "channels", {
      part: "snippet,contentDetails,statistics",
      id: channelId,
    });
    if (!res.ok) {
      return { ok: false, error: res.message, code: "YOUTUBE" };
    }
    const ch = mapItem(res.data.items?.[0]);
    if (!ch) {
      return {
        ok: false,
        error:
          "No channel with that ID. Copy the full /channel/... ID from YouTube, or use an @handle link.",
        code: "NOT_FOUND",
      };
    }
    return { ok: true, channel: ch, exactMatch: true };
  };

  /** Search always treats the result as a non-exact match for messaging. */
  const searchChannel = async (
    q: string,
    attemptedLabel: string,
  ): Promise<ResolveOutcome> => {
    const sr = await ytRequest<SearchListResponse>(key, "search", {
      part: "snippet",
      type: "channel",
      q,
      maxResults: 5,
    });
    if (!sr.ok) {
      return { ok: false, error: sr.message, code: "YOUTUBE" };
    }
    const chId =
      sr.data.items?.[0]?.id?.channelId ??
      sr.data.items?.[0]?.snippet?.channelId;
    if (!chId) {
      return {
        ok: false,
        error:
          "Channel not found. Try the channel @handle from its YouTube profile URL, or a /channel/UC... link.",
        code: "NOT_FOUND",
      };
    }
    const byId = await loadById(chId);
    if (!byId.ok) return byId;
    return {
      ok: true,
      channel: byId.channel,
      exactMatch: false,
      attemptedLabel,
    };
  };

  if (ref.kind === "channelId") {
    return loadById(ref.channelId);
  }

  if (ref.kind === "handle") {
    const res = await ytRequest<ChannelListResponse>(key, "channels", {
      part: "snippet,contentDetails,statistics",
      forHandle: ref.handle,
    });
    if (!res.ok) {
      return { ok: false, error: res.message, code: "YOUTUBE" };
    }
    const ch = mapItem(res.data.items?.[0]);
    if (ch) return { ok: true, channel: ch, exactMatch: true };
    return searchChannel(ref.handle, `@${ref.handle}`);
  }

  return searchChannel(ref.query, ref.query);
}

async function listUploadVideoIds(
  key: string,
  uploadsPlaylistId: string,
): Promise<
  | { ok: true; ids: string[]; truncated: boolean }
  | { ok: false; error: string; code: "YOUTUBE" }
> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let truncated = false;

  while (ids.length < MAX_PLAYLIST_ITEMS) {
    const remain = MAX_PLAYLIST_ITEMS - ids.length;
    const take = Math.min(PLAYLIST_PAGE, remain);
    const r = await ytRequest<{
      items?: {
        snippet?: { resourceId?: { videoId?: string } };
      }[];
      nextPageToken?: string;
    }>(key, "playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: take,
      pageToken,
    });
    if (!r.ok) {
      return {
        ok: false,
        error: r.message,
        code: "YOUTUBE",
      };
    }
    const j = r.data;
    const items = j.items || [];
    for (const it of items) {
      const vid = it.snippet?.resourceId?.videoId;
      if (vid) ids.push(vid);
      if (ids.length >= MAX_PLAYLIST_ITEMS) {
        truncated = Boolean(j.nextPageToken) || items.length === take;
        break;
      }
    }
    if (ids.length >= MAX_PLAYLIST_ITEMS) {
      if (j.nextPageToken) truncated = true;
      break;
    }
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }

  return { ok: true, ids, truncated };
}

async function fetchVideosBatched(
  key: string,
  videoIds: string[],
): Promise<
  | { ok: true; videos: VideoItem[] }
  | { ok: false; error: string; code: "YOUTUBE" }
> {
  const out: VideoItem[] = [];
  for (let i = 0; i < videoIds.length; i += VIDEO_BATCH) {
    const slice = videoIds.slice(i, i + VIDEO_BATCH);
    const r = await ytRequest<{
      items?: {
        id: string;
        snippet?: {
          title?: string;
          publishedAt?: string;
          thumbnails?: {
            high?: { url?: string };
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        contentDetails?: { duration?: string };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }[];
    }>(key, "videos", {
      part: "snippet,statistics,contentDetails",
      id: slice.join(","),
    });
    if (!r.ok) {
      return {
        ok: false,
        error: r.message,
        code: "YOUTUBE",
      };
    }
    const j = r.data;
    for (const v of j.items || []) {
      const sn = v.snippet;
      const st = v.statistics;
      const cd = v.contentDetails;
      if (!sn?.publishedAt) continue;
      const views = parseInt(st?.viewCount || "0", 10);
      const likes = parseInt(st?.likeCount || "0", 10);
      const comments = parseInt(st?.commentCount || "0", 10);
      const durIso = cd?.duration || "PT0S";
      const dSec = isoDurationSeconds(durIso);
      const d = daysSince(sn.publishedAt);
      out.push({
        id: v.id,
        title: sn.title || "Untitled",
        publishedAt: sn.publishedAt,
        thumbnailUrl: thumbUrl(sn as { thumbnails?: object }),
        durationFormatted: formatIsoDuration(durIso),
        durationSeconds: dSec,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
        viewsPerDay: views / d,
      });
    }
  }
  return { ok: true, videos: out };
}

export async function analyzeChannel(
  apiKey: string,
  channelUrl: string,
): Promise<AnalyzeSuccessResponse | AnalyzeErrorResponse> {
  const ref = parseChannelInput(channelUrl);
  if (!ref) {
    return {
      ok: false,
      error:
        "Could not parse that input. Paste a YouTube channel link (@handle, /channel/UC..., /c/..., or /user/...).",
      code: "PARSE",
    };
  }

  const resolved = await resolveChannel(apiKey, ref);
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      code: resolved.code,
    };
  }

  const channelData = resolved.channel;
  const resolutionNote =
    resolved.exactMatch === false && resolved.attemptedLabel
      ? {
          attempted: resolved.attemptedLabel,
          resolvedTitle: channelData.snippet.title || "Channel",
        }
      : undefined;

  const uploads = channelData.contentDetails.relatedPlaylists?.uploads;
  if (!uploads) {
    return {
      ok: false,
      error:
        "This channel has no uploads playlist (unusual). Try another channel.",
      code: "NO_UPLOADS",
    };
  }

  const uploadIds = await listUploadVideoIds(apiKey, uploads);
  if (!uploadIds.ok) {
    return {
      ok: false,
      error: uploadIds.error,
      code: uploadIds.code,
    };
  }

  const { ids, truncated } = uploadIds;
  if (ids.length === 0) {
    return {
      ok: false,
      error: "No videos found in the recent uploads list.",
      code: "EMPTY",
    };
  }

  const videosResult = await fetchVideosBatched(apiKey, ids);
  if (!videosResult.ok) {
    return {
      ok: false,
      error: videosResult.error,
      code: videosResult.code,
    };
  }
  const videos = videosResult.videos;
  const snippet = channelData.snippet;
  const stats = channelData.statistics;
  let subscriberCount: number | undefined;
  let subscribersHidden: boolean | undefined;
  if (stats?.hiddenSubscriberCount === true) {
    subscribersHidden = true;
  } else if (stats?.subscriberCount != null && stats.subscriberCount !== "") {
    const n = parseInt(stats.subscriberCount, 10);
    if (Number.isFinite(n)) subscriberCount = n;
  }

  return {
    ok: true,
    channel: {
      id: channelData.id,
      title: snippet.title || "Channel",
      customUrl: snippet.customUrl,
      thumbnailUrl: thumbUrl(snippet),
      ...(subscriberCount != null ? { subscriberCount } : {}),
      ...(subscribersHidden ? { subscribersHidden: true } : {}),
    },
    meta: {
      playlistItemsScanned: ids.length,
      uploadsPlaylistTruncated: truncated,
    },
    videos,
    ...(resolutionNote ? { resolutionNote } : {}),
  };
}
