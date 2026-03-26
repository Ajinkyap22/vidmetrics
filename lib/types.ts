export type AnalyzeRequestBody = {
  channelUrl: string;
};

export type ChannelSummary = {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  durationFormatted: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  viewsPerDay: number;
};

export type AnalyzeMeta = {
  playlistItemsScanned: number;
  uploadsPlaylistTruncated: boolean;
};

/** Present when we could not resolve the URL/handle exactly and used search instead. */
export type ChannelResolutionNote = {
  attempted: string;
  resolvedTitle: string;
};

export type AnalyzeSuccessResponse = {
  ok: true;
  channel: ChannelSummary;
  meta: AnalyzeMeta;
  videos: VideoItem[];
  /** YouTube-style disclaimer when search substituted a different channel. */
  resolutionNote?: ChannelResolutionNote;
};

export type AnalyzeErrorResponse = {
  ok: false;
  error: string;
  code?:
    | "PARSE"
    | "NOT_FOUND"
    | "YOUTUBE"
    | "NO_UPLOADS"
    | "EMPTY"
    | "CONFIG"
    | "BAD_REQUEST"
    | "VALIDATION"
    | "INTERNAL";
};

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
