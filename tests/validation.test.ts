import { describe, expect, it } from "vitest";
import { validateAnalyzeBody } from "../lib/validation";

describe("validateAnalyzeBody", () => {
  it("accepts a valid channelUrl string", () => {
    const result = validateAnalyzeBody({
      channelUrl: " https://www.youtube.com/@test ",
    });

    expect(result).toEqual({
      ok: true,
      channelUrl: "https://www.youtube.com/@test",
    });
  });

  it("rejects missing channelUrl", () => {
    const result = validateAnalyzeBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION");
    }
  });

  it("rejects non-object payloads", () => {
    const result = validateAnalyzeBody("oops");
    expect(result.ok).toBe(false);
  });

  it("rejects channelUrl values that are too long", () => {
    const result = validateAnalyzeBody({
      channelUrl: `https://youtube.com/${"x".repeat(500)}`,
    });

    expect(result).toEqual({
      ok: false,
      error: "channelUrl is too long.",
      code: "VALIDATION",
    });
  });
});
