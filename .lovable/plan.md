

## Fix: Roadmap Routes Missing StudentAppLayout (Causes Full Page Reload Feel)

### Problem
Several roadmap-related pages use the old `Navbar` component instead of `StudentAppLayout`. When navigating from sidebar (which uses `StudentAppLayout`) to these pages, the entire layout unmounts and remounts — sidebar disappears and reappears, giving a "full page reload" feel.

**Affected pages using `Navbar` instead of `StudentAppLayout`:**
- `StudentRoadmapView.tsx` — uses `Navbar`
- `TopicDetailPage.tsx` — uses `Navbar`
- `GamePlayerPage.tsx` — uses `Navbar`
- `LecturePlayerPage.tsx` — no layout at all

### Fix
Wrap all these pages in `StudentAppLayout` instead of `Navbar`, matching the pattern used by every other student route. This ensures the sidebar persists across navigation without remounting.

| File | Change |
|---|---|
| `src/pages/StudentRoadmapView.tsx` | Replace `Navbar` with `StudentAppLayout` |
| `src/pages/TopicDetailPage.tsx` | Replace `Navbar` with `StudentAppLayout` |
| `src/pages/GamePlayerPage.tsx` | Replace `Navbar` with `StudentAppLayout` |
| `src/pages/LecturePlayerPage.tsx` | Wrap in `StudentAppLayout` |

Each file: swap the import, replace the outer `<div>` + `<Navbar />` wrapper with `<StudentAppLayout>`, keep inner content as-is. Loading states also get wrapped in `StudentAppLayout` so the sidebar stays visible while content loads.

