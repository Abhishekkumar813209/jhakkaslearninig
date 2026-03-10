const particles = [
  { size: 6, x: '10%', y: '20%', delay: 0, duration: 6 },
  { size: 4, x: '25%', y: '60%', delay: 1.5, duration: 7 },
  { size: 8, x: '70%', y: '15%', delay: 0.8, duration: 8 },
  { size: 5, x: '85%', y: '45%', delay: 2.2, duration: 6.5 },
  { size: 3, x: '45%', y: '80%', delay: 3, duration: 7.5 },
  { size: 7, x: '60%', y: '35%', delay: 1, duration: 9 },
  { size: 4, x: '15%', y: '75%', delay: 2.8, duration: 6 },
  { size: 6, x: '90%', y: '70%', delay: 0.5, duration: 8 },
  { size: 3, x: '50%', y: '10%', delay: 1.8, duration: 7 },
  { size: 5, x: '35%', y: '50%', delay: 3.5, duration: 6.5 },
];

export const FloatingParticles = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {particles.map((p, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-primary/10"
        style={{
          width: p.size,
          height: p.size,
          left: p.x,
          top: p.y,
          animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }}
      />
    ))}
  </div>
);
