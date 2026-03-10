

## Plan: Lazy-load Three.js 3D Background Below the Hero

### What you want
- Hero section (first 100vh) loads instantly — no 3D, just the current greeting + feature tiles + floating particles
- Below the hero, the scroll-triggered story sections get the Three.js 3D animated background that fades in as you scroll
- No full page reload — sidebar stays persistent

### How

**1. Install missing packages**
- `@react-three/fiber@^8.18` and `@react-three/drei@^9.122.0` (compatible with React 18 + three@0.170)

**2. Create `ThreeScene.tsx`** — the actual 3D canvas
- Floating geometric shapes (spheres, icosahedrons, torus) with slow rotation and drift
- Subtle, low-opacity, matching the primary/accent theme colors
- Uses `<Canvas>` from R3F with `frameloop="demand"` or low-fps for performance

**3. Rewrite `ThreeBackground.tsx`** — lazy loader with scroll trigger
- Uses `IntersectionObserver` to detect when the user scrolls past 100vh (hero)
- Only then does it `React.lazy()` import and mount `ThreeScene`
- Fades in with CSS animation over ~1s
- Stays `position: fixed` behind story sections once loaded
- Hidden on mobile (`hidden md:block`)

**4. Update `StudentHomeDashboard.tsx`**
- Move `<ThreeBackground />` from the top of the page to **after** the hero section, wrapping the story sections
- Hero section keeps `FloatingParticles` (CSS-based, lightweight)

### Files changed

| File | Action |
|---|---|
| `package.json` | Add `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0` |
| `src/components/student/ThreeScene.tsx` | **NEW** — actual R3F 3D canvas with floating shapes |
| `src/components/student/ThreeBackground.tsx` | **REWRITE** — lazy load ThreeScene on scroll past hero |
| `src/components/student/ThreeCanvas.tsx` | **DELETE** — replaced by ThreeScene |
| `src/components/student/StudentHomeDashboard.tsx` | Move `<ThreeBackground />` below hero section |

### Key detail: no page reload
- ThreeScene is lazy-imported (`React.lazy`) so it doesn't block initial bundle
- IntersectionObserver triggers load only when scrolled into view
- `StudentAppLayout` sidebar is unaffected — 3D only lives inside the dashboard content area

