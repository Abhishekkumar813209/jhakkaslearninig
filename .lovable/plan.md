

## Plan: Redesign Parent Portal with Animated UI (like Student Homepage)

### Current State
The parent dashboard (`ParentDashboard.tsx`, 637 lines) is purely functional — plain cards stacked vertically with no visual flair. Other parent pages (Studies, Tests, Rankings) are even more bare — just placeholder cards.

### Strategy
Add the same visual treatment as the student homepage while **retaining all existing functionality**:

1. **Hero Section** — Animated greeting with floating particles, child selector as stylish avatar chips
2. **Animated Stat Cards** — XP, Streak, Tests, Avg Score with stagger animations (framer-motion)
3. **Scroll-triggered Sections** — Reuse `ScrollStorySection` pattern for each data block (Zone, Rankings, Chapter Progress, Racing, etc.)
4. **3D Background** — Reuse `ThreeBackground` (lazy-loaded on scroll, desktop only)
5. **Parent-specific Illustrations** — SVG illustrations for parent context (watching child grow, progress tracking)

### Files to Change

| File | What |
|---|---|
| `src/pages/ParentDashboard.tsx` | **Major rewrite of JSX/UI** — Add hero section with FloatingParticles, wrap data sections in motion.div with scroll-triggered fade-up animations, add ThreeBackground, keep all data fetching & state logic intact |
| `src/components/parent/ParentHeroSection.tsx` | **New** — Greeting + child selector + quick stats with animations (extracted from dashboard for cleanliness) |
| `src/components/parent/ParentStoryIllustrations.tsx` | **New** — 3-4 SVG illustrations for parent context (parent watching progress, report card, trophy moment) |
| `src/components/parent/ParentAppLayout.tsx` | Minor — ensure consistent with student layout pattern |

### Design Details

**Hero Section:**
- Gradient background (`from-primary/5 via-background to-accent/30`)
- FloatingParticles overlay
- Animated greeting: "Good morning, Parent 👋"
- Child selector as horizontal scrollable avatar cards with ring highlight
- Quick stats row (XP, Streak, Tests, Avg Score) — same style as student

**Data Sections (scroll-triggered):**
- Each existing card section (Zone, Rankings, Performance, Chapter Progress, Racing, Fees) gets wrapped in `motion.div` with `whileInView` fade-up animation
- Staggered children for grid items
- Cards get subtle hover scale effects (`whileHover={{ scale: 1.02 }}`)

**3D Background:**
- Reuse existing `ThreeBackground` component (lazy-loaded, desktop-only)
- Placed behind data sections, same as student homepage

**Zone Cards:**
- Keep double-click toggle functionality
- Add glow/pulse effect on active zone
- Smoother transitions with framer-motion

### What stays the same
- All data fetching logic (9 parallel API calls)
- Student switching with race condition protection
- All child components (StudentZoneAnalysis, TopicWiseBreakdown, ParentRoadmapCalendar, ChapterTestProgress, racing sections)
- All state management
- ParentAppLayout wrapper

### Approach
Single major edit to `ParentDashboard.tsx` restructuring the JSX with animations + 2 new small component files for illustrations and hero section. ~4 files total.

