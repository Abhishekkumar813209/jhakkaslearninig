import { useEffect, useRef, useState, lazy, Suspense } from 'react';

const ThreeScene = lazy(() => import('./ThreeScene'));

export const ThreeBackground = () => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel element placed where 3D should start loading */}
      <div ref={sentinelRef} className="absolute top-0 left-0 w-1 h-1" />

      {shouldLoad && (
        <div
          className="fixed inset-0 pointer-events-none z-0 hidden md:block opacity-0 animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards', animationDuration: '1.5s' }}
        >
          <Suspense fallback={null}>
            <ThreeScene />
          </Suspense>
        </div>
      )}
    </>
  );
};
