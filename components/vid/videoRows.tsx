"use client";

import Image from "next/image";
import clsx from "clsx";
import type { VideoItem } from "@/lib/types";
import { formatNumber, formatUtcDate } from "@/lib/vidMetricsUtils";

export function VideoTableRow({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <tr className="group border-b border-zinc-100 bg-zinc-50 last:border-b-0 hover:bg-zinc-100 dark:border-white/5 dark:bg-[#1a1a1a] dark:hover:bg-[#222]">
      <td className="px-4 py-3">
        <a
          href={`https://www.youtube.com/watch?v=${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3"
        >
          <div className="relative shrink-0 overflow-hidden rounded-lg">
            <Image
              src={v.thumbnailUrl || "/vercel.svg"}
              alt=""
              width={88}
              height={48}
              className="h-12 w-22 object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <span className="line-clamp-2 font-medium text-zinc-900 transition-colors duration-150 group-hover:text-[#FF0033] dark:text-[#f1f1f1]">
            {v.title}
            {hot ? <HotBadge /> : null}
          </span>
        </a>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-[#aaaaaa]">
        {formatUtcDate(v.publishedAt)}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-[#aaaaaa]">
        {v.durationFormatted}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-[#f1f1f1]">
        {formatNumber(v.viewCount)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums dark:text-[#aaaaaa]">
        {formatNumber(v.likeCount)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 tabular-nums dark:text-[#aaaaaa]">
        {formatNumber(v.commentCount)}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums dark:text-[#f1f1f1]">
        {v.viewsPerDay.toFixed(1)}
      </td>
    </tr>
  );
}

export function VideoCard({ v, hot }: { v: VideoItem; hot: boolean }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-colors duration-200 hover:bg-zinc-100 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:bg-[#222]">
      <a
        href={`https://www.youtube.com/watch?v=${v.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-3"
      >
        <div className="relative shrink-0 overflow-hidden rounded-xl">
          <Image
            src={v.thumbnailUrl || "/vercel.svg"}
            alt=""
            width={128}
            height={72}
            className="h-18 w-32 object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-3 font-semibold text-zinc-900 dark:text-[#f1f1f1]">
            {v.title}
          </h3>
          {hot ? (
            <span className="mt-2 inline-block">
              <HotBadge />
            </span>
          ) : null}
        </div>
      </a>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <MetaRow label="Published" value={formatUtcDate(v.publishedAt)} />
        <MetaRow label="Duration" value={v.durationFormatted} mono />
        <MetaRow label="Views" value={formatNumber(v.viewCount)} bold />
        <MetaRow label="Likes" value={formatNumber(v.likeCount)} />
        <MetaRow label="Comments" value={formatNumber(v.commentCount)} />
        <MetaRow label="Views/day" value={v.viewsPerDay.toFixed(1)} bold />
      </dl>
    </article>
  );
}

function MetaRow({
  label,
  value,
  bold = false,
  mono = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="font-medium text-zinc-500 dark:text-[#717171]">{label}</dt>
      <dd
        className={clsx(
          "text-zinc-800 tabular-nums dark:text-[#f1f1f1]",
          bold && "font-semibold",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </>
  );
}

function HotBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase dark:bg-[#ffb600]">
      <span>▲</span> Trending
    </span>
  );
}
