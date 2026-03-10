// Lightweight CSS-based floating shapes background (replaced three.js)
const shapes = [
  { x: '10%', y: '15%', size: 80, color: 'hsl(var(--primary) / 0.08)', duration: 12, delay: 0, type: 'circle' },
  { x: '75%', y: '20%', size: 60, color: 'hsl(var(--primary) / 0.06)', duration: 15, delay: 2, type: 'circle' },
  { x: '85%', y: '60%', size: 100, color: 'hsl(var(--accent) / 0.07)', duration: 18, delay: 1, type: 'circle' },
  { x: '20%', y: '70%', size: 50, color: 'hsl(var(--primary) / 0.05)', duration: 10, delay: 3, type: 'square' },
  { x: '55%', y: '45%', size: 70, color: 'hsl(var(--accent) / 0.06)', duration: 14, delay: 0.5, type: 'circle' },
  { x: '40%', y: '80%', size: 90, color: 'hsl(var(--primary) / 0.04)', duration: 16, delay: 2.5, type: 'circle' },
];

const ThreeCanvas = () => (
  <div className="w-full h-full relative overflow-hidden">
    {shapes.map((s, i) => (
      <div
        key={i}
        className={s.type === 'square' ? 'rounded-xl' : 'rounded-full'}
        style={{
          position: 'absolute',
          left: s.x,
          top: s.y,
          width: s.size,
          height: s.size,
          background: s.color,
          filter: 'blur(1px)',
          animation: `float ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }}
      />
    ))}
  </div>
);

export default ThreeCanvas;
