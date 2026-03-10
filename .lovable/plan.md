

## Fix: Wrap ALL Student-Facing Pages in StudentAppLayout

### Problem
Multiple student-facing pages still use bare `<div>` or old `Navbar` instead of `StudentAppLayout`. When navigating to any of these from the sidebar, the sidebar unmounts and remounts — feels like a full page reload.

### Pages to Fix

| File | Current Layout | Fix |
|---|---|---|
| `src/pages/student/NotesPage.tsx` | No layout wrapper | Wrap in `StudentAppLayout` |
| `src/pages/student/PaidClassesLectures.tsx` | No layout wrapper | Wrap in `StudentAppLayout` |
| `src/pages/TestResults.tsx` | Uses `Navbar` (4 return paths) | Replace all `Navbar` with `StudentAppLayout` |
| `src/pages/Quiz.tsx` | Uses `Navbar` (3 return paths) | Replace all `Navbar` with `StudentAppLayout` |
| `src/pages/Analytics.tsx` | Uses `Navbar` | Replace with `StudentAppLayout` |

Already fixed (no change needed): `Student.tsx`, `PaidClassesPage.tsx`, `SchoolAuraPage.tsx`, `Profile.tsx`, `Leaderboard.tsx`, `LiveRacing.tsx`, `Tests.tsx`, `Index.tsx`, `StudentRoadmapView.tsx`, `TopicDetailPage.tsx`, `GamePlayerPage.tsx`, `LecturePlayerPage.tsx`, `PaidClassesLecturePlayer.tsx`.

### What changes
For each file:
1. Import `StudentAppLayout` instead of `Navbar`
2. Replace `<Navbar />` + outer `<div>` with `<StudentAppLayout>` wrapper
3. Ensure ALL return paths (loading, error, main) are wrapped in `StudentAppLayout`

This is the same pattern already applied to `Student.tsx` and `StudentRoadmapView.tsx` — just extending it to every remaining student page.

