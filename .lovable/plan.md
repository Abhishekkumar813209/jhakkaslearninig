

## Fix: Build Error + Sidebar Page Reload + Rename "Books" → "Animated Books"

### 3 Issues to Fix

**1. Build Error: `@react-three/fiber` not installed**
`ThreeCanvas.tsx` imports `@react-three/fiber` and `@react-three/drei` but neither package is installed. Since adding these heavy 3D libraries just for a subtle background effect is overkill, the fix is to **replace `ThreeCanvas.tsx` and `ThreeBackground.tsx`** with a lightweight CSS/SVG animated background that achieves a similar floating-shapes effect without any extra dependencies.

**2. Sidebar causes full page reload**
Looking at the code, the sidebar navigation uses `react-router-dom`'s `useNavigate` which should do client-side navigation. The likely culprit is that the `StudentAppLayout` wraps each route individually, so navigating between routes unmounts and remounts the entire layout + sidebar. This is expected React Router behavior — it's not a full page reload, but a re-render of the layout. However, if the `ThreeBackground` component crashes (due to missing `@react-three/fiber`), it could cause the error boundary to trigger a reload. Fixing the build error (issue 1) should resolve this.

**3. Rename "Books" → "Animated Books" in sidebar**
Simple text change in `StudentAppSidebar.tsx` coming soon items.

### File Changes

| File | Action |
|---|---|
| `src/components/student/ThreeCanvas.tsx` | REWRITE — pure CSS/SVG floating shapes, no three.js |
| `src/components/student/ThreeBackground.tsx` | SIMPLIFY — remove lazy import of ThreeCanvas, use direct CSS component |
| `src/components/student/StudentAppSidebar.tsx` | MODIFY — rename "Books" → "Animated Books" |

