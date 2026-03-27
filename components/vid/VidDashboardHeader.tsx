"use client";

import { ThemeToggle } from "../ThemeToggle";

export function VidDashboardHeader() {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FF0033]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <polygon points="2,1 11,6 2,11" fill="white" />
            </svg>
          </span>
          <span className="bg-linear-to-r from-[#FF0033] to-[#FF6B00] bg-clip-text text-sm font-bold tracking-[0.2em] text-transparent uppercase">
            VidMetrics
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-[#f1f1f1]">
          Competitor{" "}
          <span className="bg-linear-to-r from-[#FF0033] to-[#FF6B00] bg-clip-text text-transparent">
            Pulse
          </span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-500 dark:text-[#aaaaaa]">
          Paste a channel URL and instantly see which recent uploads are pulling
          views. Defaults to{" "}
          <strong className="font-semibold text-zinc-800 dark:text-[#f1f1f1]">
            this month (UTC)
          </strong>
          .
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}
