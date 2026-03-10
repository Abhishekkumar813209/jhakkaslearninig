

## Fix: Roadmap Page Loading State Missing Sidebar

### Problem
In `src/pages/Student.tsx` (renders at `/roadmap`), the loading state (lines 14-23) renders a bare `<div>` without `StudentAppLayout`. This causes the sidebar to unmount while loading, creating a "full page reload" feel.

### Fix
Wrap the loading state inside `StudentAppLayout` so the sidebar stays visible while content loads.

| File | Change |
|---|---|
| `src/pages/Student.tsx` | Wrap loading spinner in `<StudentAppLayout>` instead of bare `<div>` |

**Before:**
```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">...</div>
    </div>
  );
}
```

**After:**
```tsx
if (loading) {
  return (
    <StudentAppLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">...</div>
      </div>
    </StudentAppLayout>
  );
}
```

Single file, single line change. Sidebar will persist during loading.

