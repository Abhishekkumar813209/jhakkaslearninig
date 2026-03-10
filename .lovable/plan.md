

## Fix: Sticky Sidebar + Add 2 New Story Sections

### Issue 1: Sidebar not staying fixed
The sidebar uses `sticky top-0` but it scrolls away. Fix: change to `fixed left-0 top-0` and add `lg:ml-64` to the main content area so it doesn't overlap.

**File: `src/components/student/StudentAppLayout.tsx`**
- Change `aside` from `sticky top-0` to `fixed left-0 top-0 z-30`
- Add `lg:ml-64` to the main content wrapper so content shifts right on desktop

### Issue 2: Add "Trophy Ceremony" story section (Section 4.5)
New SVG illustration: Student on a stage/podium at school, receiving a trophy/cup from a teacher. Parents in the audience clapping. School banner in background. Bright, celebratory colors.

**Text:** "The moment that made it all worth it."  
**Description:** "Standing on stage, holding that trophy — with your parents watching from the audience. Hard work finally paid off."

### Issue 3: Add "School Map Aura" story section (Section 6)
New SVG illustration: A bird's-eye/map-style view showing multiple school buildings in an area, each with a colored glowing aura around them (like Google Maps pins but with radial glow halos). Different schools have different aura colors/sizes representing their reputation/performance. The student's school has the brightest aura.

**Text:** "Every school in your area has its own story."  
**Description:** "On the map, each school glows with its own aura — built by students like you. Your school's aura grows brighter with every achievement."

### File Changes

| File | Action |
|---|---|
| `src/components/student/StudentAppLayout.tsx` | FIX — `fixed` sidebar + `ml-64` offset |
| `src/components/student/StoryIllustrations.tsx` | ADD — `TrophyCeremonyIllustration` + `SchoolMapAuraIllustration` |
| `src/components/student/StudentHomeDashboard.tsx` | ADD — 2 new ScrollStorySection entries |

