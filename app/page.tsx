import { VidDashboard } from "@/components/VidDashboard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#0f0f0f]">
      <VidDashboard />
      <footer className="mt-auto border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-[#717171]">
        VidMetrics dashboard &mdash; channel insights powered by YouTube Data API v3.
      </footer>
    </div>
  );
}
