import { NextResponse } from "next/server";
import { analyzeChannel } from "@/lib/youtube";
import { validateAnalyzeBody } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  const validated = validateAnalyzeBody(body);
  if (!validated.ok) {
    return NextResponse.json(validated, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server missing YOUTUBE_API_KEY. Add it to .env.local for local dev.",
        code: "CONFIG",
      },
      { status: 500 },
    );
  }

  try {
    const result = await analyzeChannel(key, validated.channelUrl);

    if (!result.ok) {
      const st =
        result.code === "PARSE" || result.code === "BAD_REQUEST"
          ? 400
          : result.code === "CONFIG" || result.code === "INTERNAL"
            ? 500
            : result.code === "YOUTUBE"
              ? 502
              : 422;

      return NextResponse.json(result, { status: st });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error while calling YouTube.",
        code: "INTERNAL",
      },
      { status: 500 },
    );
  }
}
