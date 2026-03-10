import { useEffect, useState } from 'react';
import ThreeCanvas from './ThreeCanvas';

export const ThreeBackground = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 hidden md:block opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
      <ThreeCanvas />
    </div>
  );
};
