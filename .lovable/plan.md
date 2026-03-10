

## Problem
The `reviewer@jhakkas.app` account has full admin access — it can edit, delete, and modify everything. The `isReadOnly` flag exists in `useAuth` but is **never consumed** by any admin component.

## Solution: Global Read-Only Overlay + Granular Protection

Rather than modifying 30+ admin components individually (error-prone, incomplete), I'll use a **layered approach**:

### 1. Create a `ReadOnlyGuard` Context/Component
A wrapper component that:
- Provides a `useReadOnly()` hook to all admin components
- Shows a toast notification ("You have read-only access") when a mutation is attempted
- Wraps the entire admin dashboard content area

### 2. Create a `ReadOnlyBanner` Component
- Persistent banner at top of admin dashboard: "You are viewing in read-only mode. Data modifications are disabled."
- Visual indicator so the reviewer knows they can't edit

### 3. Create a generic `useReadOnlyGuard()` Hook
Returns a `guardAction` function that wraps any mutation callback:
```typescript
const { guardAction } = useReadOnlyGuard();
// Usage: onClick={guardAction(() => deleteStudent(id))}
// If read-only → shows toast, blocks action
// If not read-only → executes normally
```

### 4. Protect Key Mutation Points
Apply `isReadOnly` checks to the most critical admin components:
- **UserRoleManagement** — block role changes
- **StudentManagement** — block delete/edit
- **BatchManagement** — block create/delete
- **TestManagement** — block create/publish/delete
- **AdminSettings** — block all saves
- **QuestionBankTab** — block add/edit/delete
- **All other admin panels** — disable action buttons when `isReadOnly`

### 5. Protect API Layer (Edge Functions)
- In `invokeWithAuth`, add a client-side check: if `isReadOnly`, reject mutations before they hit the server
- This acts as a safety net

### 6. Disable Interactive Controls
- All `<Button>` that trigger mutations get `disabled={isReadOnly}`
- All `<Select>` for role changes get `disabled={isReadOnly}`
- Delete/Edit dialogs won't open for read-only users

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/hooks/useReadOnly.tsx` | New hook + context providing `isReadOnly` and `guardAction` |
| `src/components/admin/ReadOnlyBanner.tsx` | New banner component |
| `src/pages/AdminDashboard.tsx` | Add ReadOnlyBanner |
| `src/components/admin/UserRoleManagement.tsx` | Disable role change select + button |
| `src/components/admin/StudentManagement.tsx` | Disable edit/delete |
| `src/components/admin/BatchManagement.tsx` | Disable create/edit/delete |
| `src/components/admin/TestManagement.tsx` | Disable create/publish/delete |
| `src/components/admin/AdminSettings.tsx` | Disable save |
| `src/components/admin/QuestionBankTab.tsx` | Disable mutations |
| `src/components/admin/SchoolManagement.tsx` | Disable mutations |
| `src/components/admin/ZoneManagementNew.tsx` | Disable mutations |
| `src/components/admin/FeesManagement.tsx` | Disable mutations |
| `src/components/admin/PricingManagement.tsx` | Disable mutations |
| `src/components/admin/PromoCodeManagement.tsx` | Disable mutations |
| `src/components/admin/ReferralManagement.tsx` | Disable mutations |
| `src/components/admin/SubscriptionManagement.tsx` | Disable mutations |
| `src/components/admin/GuidedPathsManagement.tsx` | Disable mutations |
| `src/components/admin/RoadmapManagement.tsx` | Disable mutations |
| `src/components/admin/ParentManagement.tsx` | Disable mutations |
| `src/components/admin/ExamTypesManagement.tsx` | Disable mutations |
| `src/components/admin/LeaderboardManagement.tsx` | Disable mutations |
| ~15 more admin components | Same pattern — disable action buttons |

### Approach for Each Component
Instead of editing 30+ files individually, I'll create a **reusable pattern**:

1. Import `useAuth` → get `isReadOnly`
2. Add `disabled={isReadOnly}` to all mutation buttons
3. Add `title="Read-only mode"` tooltip on disabled buttons
4. Wrap destructive dialogs with `if (isReadOnly) return`

This ensures the reviewer account can **browse and view everything** but **cannot modify any data**.

