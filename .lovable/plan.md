

## Plan: Rename "Daily Quiz" → "Racing Leaderboard" + Add "School Aura" Page

### Changes

#### 1. Rename "Daily Quiz" to "Racing Leaderboard"

**Files:** `StudentAppSidebar.tsx`, `StudentHomeDashboard.tsx`
- Change label from "Daily Quiz" to "Racing Leaderboard" everywhere (sidebar menu item + dashboard feature cards)
- Path stays `/racing`, icon stays `Brain` (or switch to `Trophy`)

#### 2. Add "School Aura" sidebar item + new page

**Sidebar (`StudentAppSidebar.tsx`):**
- Add new menu item: `{ icon: MapPin, label: 'School Aura', path: '/student/school-aura' }`
- Place it after "Racing Leaderboard"

**New Page (`src/pages/student/SchoolAuraPage.tsx`):**
- Wrapped in `StudentAppLayout`
- Fetches the logged-in student's profile to get their `zone_id`
- Fetches all schools in that zone from `schools` table
- Renders an animated SVG map with:
  - A stylized bird's-eye view background (roads, grid pattern via SVG paths)
  - Each school as a pin/building icon with a **radial gradient glow aura**
  - Hardcoded aura scores (random 40-95 range per school, student's own school gets highest)
  - Color tiers: Gold (80+), Purple (60-79), Blue (40-59)
  - Pulsing CSS animation on each aura circle
  - School name labels below each pin
  - Student's school highlighted with a "Your School" badge and brightest glow
- Uses Framer Motion for staggered entrance animations on each school pin

**Route (`App.tsx`):**
- Add route `/student/school-aura` → `SchoolAuraPage`

#### 3. Files Summary

| File | Action |
|---|---|
| `src/components/student/StudentAppSidebar.tsx` | MODIFY — rename Daily Quiz, add School Aura item |
| `src/components/student/StudentHomeDashboard.tsx` | MODIFY — rename Daily Quiz references |
| `src/pages/student/SchoolAuraPage.tsx` | CREATE — animated SVG map with school auras |
| `src/App.tsx` | MODIFY — add route |

