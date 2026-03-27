import { describe, expect, it } from "vitest";
import { parseChannelInput } from "../lib/youtube";

describe("parseChannelInput", () => {
  it("parses channel ID URLs", () => {
    const parsed = parseChannelInput(
      "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
    );
    expect(parsed).toEqual({
      kind: "channelId",
      channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    });
  });

  it("parses handle URLs", () => {
    const parsed = parseChannelInput("youtube.com/@GoogleDevelopers");
    expect(parsed).toEqual({
      kind: "handle",
      handle: "GoogleDevelopers",
    });
  });

  it("parses /c and /user paths as search queries", () => {
    expect(
      parseChannelInput("https://www.youtube.com/c/GoogleDevelopers"),
    ).toEqual({
      kind: "searchQuery",
      query: "GoogleDevelopers",
    });

    expect(parseChannelInput("https://www.youtube.com/user/Google")).toEqual({
      kind: "searchQuery",
      query: "Google",
    });
  });

  it("rejects unsupported hosts", () => {
    expect(parseChannelInput("https://example.com/@foo")).toBeNull();
    expect(parseChannelInput("https://youtu.be/abc123")).toBeNull();
  });
});
