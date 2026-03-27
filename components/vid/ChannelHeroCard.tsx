"use client";

import Image from "next/image";
import clsx from "clsx";
import type { AnalyzeSuccessResponse } from "@/lib/types";
import { formatCompact } from "@/lib/vidMetricsUtils";
import { CARD, CARD_SHADOW } from "./dashboardStyles";

function subscriberLine(ch: AnalyzeSuccessResponse["channel"]): string | null {
  if (ch.subscribersHidden) return "Subscribers hidden on YouTube";
  if (ch.subscriberCount != null && Number.isFinite(ch.subscriberCount)) {
    return `${formatCompact(ch.subscriberCount)} subscribers`;
  }
  return null;
}

type Props = {
  data: AnalyzeSuccessResponse;
  channelThumbFailed: boolean;
  onChannelThumbError: () => void;
  exportDisabled: boolean;
  onExportCsv: () => void;
};

export function ChannelHeroCard({
  data,
  channelThumbFailed,
  onChannelThumbError,
  exportDisabled,
  onExportCsv,
}: Props) {
  const subs = subscriberLine(data.channel);

  return (
    <section
      className={clsx(
        CARD,
        CARD_SHADOW,
        "flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex items-center gap-4">
        {data.channel.thumbnailUrl && !channelThumbFailed ? (
          <Image
            src={data.channel.thumbnailUrl}
            alt=""
            width={60}
            height={60}
            className="rounded-full border-2 border-[#FF0033] object-cover"
            style={{ boxShadow: "0 0 18px rgba(255,0,51,0.35)" }}
            onError={onChannelThumbError}
          />
        ) : (
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-[#272727] dark:text-[#aaaaaa]">
            <span className="text-lg">▶</span>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-[#f1f1f1]">
            {data.channel.title}
          </h2>
          {subs ? (
            <p className="mt-1 text-sm font-medium text-zinc-700 tabular-nums dark:text-[#e8e8e8]">
              {subs}
            </p>
          ) : null}
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-[#aaaaaa]">
            {data.channel.customUrl
              ? `youtube.com/${data.channel.customUrl}`
              : `Channel ID ${data.channel.id}`}
            {" · "}
            {data.meta.playlistItemsScanned} uploads scanned
            {data.meta.uploadsPlaylistTruncated ? " (capped at 200)" : ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onExportCsv}
        disabled={exportDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-all duration-200 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-40 dark:border-white/10 dark:bg-[#272727] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            d="M7 1v8M4 6l3 3 3-3M1 10v1a2 2 0 002 2h8a2 2 0 002-2v-1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export CSV
      </button>
    </section>
  );
}
