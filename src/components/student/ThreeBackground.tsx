import { lazy, Suspense } from 'react';

const ThreeCanvas = lazy(() => import('./ThreeCanvas'));

export const ThreeBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
    <Suspense fallback={null}>
      <ThreeCanvas />
    </Suspense>
  </div>
);
