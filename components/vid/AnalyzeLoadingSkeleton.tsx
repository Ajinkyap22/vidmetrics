export function AnalyzeLoadingSkeleton() {
  return (
    <section className="animate-fade-slide-in rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
            Scanning Channel
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-[#aaaaaa]">
            Pulling uploads and ranking momentum...
          </p>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="h-2 w-1.5 animate-pulse rounded bg-[#FF0033]" />
          <span className="h-4 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:120ms]" />
          <span className="h-6 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:240ms]" />
          <span className="h-4 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:360ms]" />
          <span className="h-2 w-1.5 animate-pulse rounded bg-[#FF0033] [animation-delay:480ms]" />
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        <div className="h-2 w-2/3 rounded bg-zinc-200 dark:bg-white/10" />
        <div className="h-2 w-full rounded bg-zinc-200 dark:bg-white/10" />
        <div className="h-2 w-4/5 rounded bg-zinc-200 dark:bg-white/10" />
      </div>
    </section>
  );
}
