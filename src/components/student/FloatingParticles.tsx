const particles = [
  { size: 6, x: '10%', y: '20%', delay: 0, duration: 6, color: 'bg-primary/10' },
  { size: 4, x: '25%', y: '60%', delay: 1.5, duration: 7, color: 'bg-primary/8' },
  { size: 10, x: '70%', y: '15%', delay: 0.8, duration: 8, color: 'bg-primary/6' },
  { size: 5, x: '85%', y: '45%', delay: 2.2, duration: 6.5, color: 'bg-accent/20' },
  { size: 3, x: '45%', y: '80%', delay: 3, duration: 7.5, color: 'bg-primary/8' },
  { size: 8, x: '60%', y: '35%', delay: 1, duration: 9, color: 'bg-accent/15' },
  { size: 4, x: '15%', y: '75%', delay: 2.8, duration: 6, color: 'bg-primary/10' },
  { size: 7, x: '90%', y: '70%', delay: 0.5, duration: 8, color: 'bg-accent/20' },
  { size: 3, x: '50%', y: '10%', delay: 1.8, duration: 7, color: 'bg-primary/6' },
  { size: 5, x: '35%', y: '50%', delay: 3.5, duration: 6.5, color: 'bg-primary/10' },
  { size: 12, x: '20%', y: '40%', delay: 0.3, duration: 10, color: 'bg-primary/5' },
  { size: 14, x: '75%', y: '55%', delay: 1.2, duration: 11, color: 'bg-accent/10' },
];

export const FloatingParticles = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {particles.map((p, i) => (
      <div
        key={i}
        className={`absolute rounded-full ${p.color}`}
        style={{
          width: p.size,
          height: p.size,
          left: p.x,
          top: p.y,
          animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          filter: p.size > 8 ? 'blur(2px)' : undefined,
        }}
      />
    ))}
  </div>
);
