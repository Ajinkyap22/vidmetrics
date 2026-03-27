export type AnalyzeBodyValidation =
  | { ok: true; channelUrl: string }
  | { ok: false; error: string; code: "VALIDATION" };

const MAX_CHANNEL_URL_LEN = 300;

export function validateAnalyzeBody(body: unknown): AnalyzeBodyValidation {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      error: 'Invalid request body. Send JSON: { "channelUrl": "..." }',
      code: "VALIDATION",
    };
  }

  const channelUrl = "channelUrl" in body ? (body as { channelUrl?: unknown }).channelUrl : undefined;
  const url = typeof channelUrl === "string" ? channelUrl.trim() : "";

  if (!url) {
    return {
      ok: false,
      error: 'Missing channelUrl. Send JSON: { "channelUrl": "..." }',
      code: "VALIDATION",
    };
  }

  if (url.length > MAX_CHANNEL_URL_LEN) {
    return {
      ok: false,
      error: "channelUrl is too long.",
      code: "VALIDATION",
    };
  }

  return { ok: true, channelUrl: url };
}
