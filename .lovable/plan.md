

## Problem
1. The `/` route is wrapped in `<ProtectedRoute>` — so any visitor immediately gets redirected to `/login`
2. Login page is plain/boring — needs a trophy-winning boy vector illustration and animations

## Plan

### 1. Make Home Page Public
- **`src/App.tsx`**: Remove `<ProtectedRoute>` wrapper from the `/` route. The `<Index>` component (which renders `StudentHomeDashboard`) will be publicly accessible.
- **`src/components/student/StudentHomeDashboard.tsx`**: Instead of assuming the user is logged in, check `useAuth()` — if not logged in, show a public landing view. If logged in, show the current dashboard. The `useProfile` hook call should be conditional or handle null gracefully.
- **`src/components/student/StudentAppLayout.tsx`**: Handle unauthenticated users — don't redirect parents if not logged in, show a simplified header for guests (with Login/Signup button instead of profile icons).

### 2. Redesign Login Page with Animation
- **`src/pages/Login.tsx`**: Redesign to a split-layout:
  - **Left side** (desktop): Animated illustration area with a vector SVG/illustration of a boy winning a trophy, plus motivational text and floating animations using framer-motion
  - **Right side**: The existing login form card
  - **Mobile**: Illustration on top, form below
  - Add entrance animations (fade-in, slide-up) using framer-motion
  - Use an inline SVG illustration of a student celebrating with a trophy (vector art style, no external image needed)

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` (line 68-72) | Remove ProtectedRoute from `/` route |
| `src/pages/Index.tsx` | Add auth check — show landing for guests, dashboard for logged-in |
| `src/components/student/StudentAppLayout.tsx` | Handle guest users in header |
| `src/pages/Login.tsx` | Redesign with split layout, trophy boy SVG illustration, framer-motion animations |

### Login Page Design
- Split layout: illustration (left) + form (right)
- Inline SVG of a boy holding a trophy with confetti/stars
- Framer-motion animations: staggered fade-in, floating trophy, pulsing stars
- Gradient background on illustration side
- Mobile: stacked layout with smaller illustration on top

