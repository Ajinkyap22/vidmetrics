import { VidDashboard } from "@/components/VidDashboard";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <VidDashboard />
      <footer className="mt-auto border-t border-zinc-200/80 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        Built for the VidMetrics hiring challenge — data via YouTube Data API v3.
      </footer>
    </div>
  );
}
