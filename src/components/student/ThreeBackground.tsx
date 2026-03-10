import { useEffect, useState, lazy, Suspense } from 'react';

const ThreeCanvas = lazy(() => import('./ThreeCanvas'));

export const ThreeBackground = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Defer 3D loading until after main content is interactive (3s delay)
    const timer = setTimeout(() => setShouldRender(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 hidden md:block opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
      <Suspense fallback={null}>
        <ThreeCanvas />
      </Suspense>
    </div>
  );
};
