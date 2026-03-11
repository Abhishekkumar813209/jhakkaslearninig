

## Plan

### 1. Add Real-time XP Display to Navbar
**File: `src/components/student/StudentAppLayout.tsx`**
- Import `XPDisplay` component
- Add `<XPDisplay compact />` next to the Bell and User icons for logged-in users
- This already supports real-time updates via Supabase realtime channel and `xp-updated` events

### 2. Add "Daily Rewards" Link to Sidebar
**File: `src/components/student/StudentAppSidebar.tsx`**
- Add a new menu item with a `Gift` icon labeled "Daily Rewards" pointing to `/student/dashboard`
- Place it right after "School Aura" in the navigation list
- This page already has `AttendanceButton` (daily check-in for XP), `StreakTracker`, `DailyQuests`, and `ShareXPButton` — it just has no sidebar link

### Summary
- 2 files modified
- No new pages needed — the dashboard with attendance/rewards already exists at `/student/dashboard`, just needs a sidebar entry
- XP in navbar uses the existing `XPDisplay` component in compact mode with real-time updates

