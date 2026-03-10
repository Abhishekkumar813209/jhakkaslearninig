

## Plan: Combine "Free Test" and "Paid Test Series" into single "Tests" sidebar item

### Problem
The sidebar has two separate items — "Free Test" and "Paid Test Series" — both pointing to `/tests`. They should be merged into one "Tests" entry.

### Changes

**1. `src/components/student/StudentAppSidebar.tsx`**
- Remove both "Free Test" and "Paid Test Series" entries from `menuItems`
- Add single entry: `{ icon: FileText, label: 'Tests', path: '/tests' }`

**2. `src/components/student/StudentHomeDashboard.tsx`** (lines 160-162)
- Replace the two separate feature cards ("Paid Test Series" and "Free Test") with a single card: `{ title: 'Tests', description: 'Practice tests & assessments', icon: FileText, path: '/tests', available: true }`

Two files, minimal change.

