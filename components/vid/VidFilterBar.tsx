"use client";

function FilterField({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-zinc-500 dark:text-[#717171]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type Props = {
  dateStart: string;
  dateEnd: string;
  onDateStart: (v: string) => void;
  onDateEnd: (v: string) => void;
  titleQ: string;
  onTitleQ: (v: string) => void;
  minViews: string;
  onMinViews: (v: string) => void;
};

export function VidFilterBar({
  dateStart,
  dateEnd,
  onDateStart,
  onDateEnd,
  titleQ,
  onTitleQ,
  minViews,
  onMinViews,
}: Props) {
  return (
    <section className="px-1">
      <p className="mb-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-[#717171]">
        Filters
      </p>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <FilterField id="f-start" label="From (UTC)">
            <input
              id="f-start"
              type="date"
              value={dateStart}
              onChange={(e) => onDateStart(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 scheme-light transition-colors outline-none focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:scheme-dark"
            />
          </FilterField>
          <FilterField id="f-end" label="To (UTC)">
            <input
              id="f-end"
              type="date"
              value={dateEnd}
              onChange={(e) => onDateEnd(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 scheme-light transition-colors outline-none focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:scheme-dark"
            />
          </FilterField>
          <FilterField
            id="f-title"
            label="Title contains"
            className="min-w-40 flex-1"
          >
            <input
              id="f-title"
              type="search"
              value={titleQ}
              onChange={(e) => onTitleQ(e.target.value)}
              placeholder="Filter..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition-colors outline-none placeholder:text-zinc-400 focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
            />
          </FilterField>
          <FilterField id="f-minv" label="Min views" className="w-28">
            <input
              id="f-minv"
              inputMode="numeric"
              value={minViews}
              onChange={(e) => onMinViews(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition-colors outline-none placeholder:text-zinc-400 focus:border-[#FF0033] dark:border-white/10 dark:bg-[#0f0f0f] dark:text-[#f1f1f1] dark:placeholder:text-[#717171]"
            />
          </FilterField>
        </div>
      </div>
    </section>
  );
}
