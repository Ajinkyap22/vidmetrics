# VidMetrics: competitor channel pulse

MVP for **VidMetrics**: paste a **YouTube channel URL** (or `@handle` path) and inspect **recent uploads** with views, likes, comments, duration, and a **views-per-day** signal. Filtering defaults to **the current calendar month in UTC**; sort and refine on the client.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **YouTube Data API v3** (server-side only via `POST /api/analyze`)
- **Recharts** for a compact views bar chart

## Local setup

1. **Node.js 20+** recommended.
2. Copy environment template and add your API key:

   ```bash
   cp .env.example .env.local
   # edit .env.local: set YOUTUBE_API_KEY=...
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

### Google Cloud

1. Create a project, enable **YouTube Data API v3**, create an **API key**.
2. Restrict the key (recommended): limit to YouTube Data API v3; for browser/server-from-your-domain, add HTTP referrers for production and `http://localhost:3000/*` for development.

Detailed checklist: see [human_assistance_steps.md](./human_assistance_steps.md) (Vercel, GitHub, Loom, etc.).

## Architecture

- **`app/api/analyze/route.ts`:** validates JSON body, reads `YOUTUBE_API_KEY`, calls `analyzeChannel`.
- **`lib/youtube.ts`:** parses channel input (`UC...`, `@handle`, `/c/`, `/user/` + `search.list` fallback), loads up to **200** `playlistItems` from the uploads playlist, batches **`videos.list`** (50 IDs per call), normalizes metrics. When the handle does not resolve exactly, search may substitute a channel; the API returns `resolutionNote` and the UI shows a YouTube-style disclaimer.
- **`components/VidDashboard.tsx`:** client UI: filters (UTC date range, title, min views), sort (views / date / likes), **desktop table** + **mobile cards**, CSV export, "Top tier" badge for **top quartile of views/day** in the **current filtered** set.
- **`components/ViewsBarChart.tsx`:** horizontal bar chart of top views in the filtered list.

```mermaid
flowchart LR
  UI[VidDashboard]
  API[POST /api/analyze]
  YT[YouTube Data API v3]
  UI --> API
  API --> YT
```

## Product limits (honest)

- **No auth / rate limiting** on the demo API route (acceptable for an MVP; add Edge middleware + KV or a BFF quota in production).
- **Uploads list capped at 200** items per analysis to stay within sensible quota; UI notes when the list is truncated.
- **Search fallback** for `/c/` and `/user/` may pick the wrong channel if the name is ambiguous. Prefer `@handle` or `/channel/UC...` for demos. When search is used for a handle that did not match `forHandle`, the UI explains the substitution.

## Development approach

- Scaffolded with `create-next-app`, then iterated with AI assistance on data plumbing (`lib/youtube.ts`), UI/UX polish, and docs.
- AI helped with API shape design, TypeScript types, and responsive layout; behavior was validated manually against real channels and **own API key**.

## Scripts

| Command         | Purpose                |
| --------------- | ---------------------- |
| `npm run dev`   | Development server     |
| `npm run build` | Production build       |
| `npm run start` | Serve production build |
| `npm run lint`  | ESLint                 |
