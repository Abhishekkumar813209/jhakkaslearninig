import { motion } from 'framer-motion';

const float = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

export const ParentWatchingIllustration = () => (
  <motion.svg {...float} viewBox="0 0 200 180" className="w-48 h-44 mx-auto" fill="none">
    {/* Parent figure */}
    <circle cx="70" cy="50" r="18" className="fill-primary/20 stroke-primary" strokeWidth="2" />
    <path d="M70 68 C50 68 40 90 40 110 L100 110 C100 90 90 68 70 68Z" className="fill-primary/15 stroke-primary" strokeWidth="1.5" />
    {/* Child figure */}
    <circle cx="130" cy="65" r="14" className="fill-accent stroke-primary/60" strokeWidth="2" />
    <path d="M130 79 C115 79 108 95 108 110 L152 110 C152 95 145 79 130 79Z" className="fill-accent/50 stroke-primary/60" strokeWidth="1.5" />
    {/* Book/Screen */}
    <rect x="105" y="115" width="50" height="35" rx="4" className="fill-card stroke-primary/40" strokeWidth="1.5" />
    <line x1="115" y1="125" x2="145" y2="125" className="stroke-primary/30" strokeWidth="2" />
    <line x1="115" y1="132" x2="140" y2="132" className="stroke-primary/20" strokeWidth="2" />
    <line x1="115" y1="139" x2="135" y2="139" className="stroke-primary/20" strokeWidth="2" />
    {/* Progress bar */}
    <rect x="40" y="120" width="50" height="8" rx="4" className="fill-muted" />
    <rect x="40" y="120" width="32" height="8" rx="4" className="fill-primary" />
    {/* Stars */}
    <motion.text x="155" y="45" fontSize="16" animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>⭐</motion.text>
    <motion.text x="170" y="65" fontSize="12" animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}>✨</motion.text>
  </motion.svg>
);

export const ReportCardIllustration = () => (
  <motion.svg {...float} viewBox="0 0 200 180" className="w-48 h-44 mx-auto" fill="none">
    {/* Report card */}
    <rect x="40" y="20" width="120" height="140" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    <rect x="40" y="20" width="120" height="30" rx="8" className="fill-primary/10" />
    <text x="100" y="40" textAnchor="middle" className="fill-primary text-[11px] font-bold">REPORT CARD</text>
    {/* Rows */}
    {[65, 85, 105, 125].map((y, i) => (
      <g key={y}>
        <rect x="55" y={y} width="45" height="6" rx="3" className="fill-muted" />
        <rect x="115" y={y} width={[30, 25, 35, 20][i]} height="6" rx="3" className={['fill-primary', 'fill-primary/70', 'fill-primary', 'fill-primary/50'][i]} />
      </g>
    ))}
    {/* Grade badge */}
    <circle cx="160" cy="30" r="15" className="fill-primary" />
    <text x="160" y="35" textAnchor="middle" className="fill-primary-foreground text-[12px] font-bold">A+</text>
  </motion.svg>
);

export const TrophyMomentIllustration = () => (
  <motion.svg {...float} viewBox="0 0 200 180" className="w-48 h-44 mx-auto" fill="none">
    {/* Trophy */}
    <motion.g animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
      <path d="M80 50 L80 30 L120 30 L120 50 C120 70 110 80 100 85 C90 80 80 70 80 50Z" className="fill-warning/30 stroke-warning" strokeWidth="2" />
      <rect x="92" y="85" width="16" height="20" className="fill-warning/40 stroke-warning" strokeWidth="1.5" />
      <rect x="82" y="105" width="36" height="8" rx="2" className="fill-warning/50 stroke-warning" strokeWidth="1.5" />
      {/* Handles */}
      <path d="M80 40 C65 40 60 55 70 60" className="stroke-warning" strokeWidth="2" fill="none" />
      <path d="M120 40 C135 40 140 55 130 60" className="stroke-warning" strokeWidth="2" fill="none" />
    </motion.g>
    {/* Confetti */}
    {[
      { x: 45, y: 40, color: 'fill-primary' },
      { x: 155, y: 35, color: 'fill-destructive' },
      { x: 60, y: 25, color: 'fill-warning' },
      { x: 140, y: 50, color: 'fill-primary' },
      { x: 50, y: 60, color: 'fill-success' },
      { x: 150, y: 65, color: 'fill-warning' },
    ].map((c, i) => (
      <motion.rect
        key={i}
        x={c.x} y={c.y}
        width="6" height="6"
        rx="1"
        className={c.color}
        animate={{ y: [c.y, c.y + 80], opacity: [1, 0], rotate: [0, 360] }}
        transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
      />
    ))}
    {/* Parent & child watching */}
    <circle cx="70" cy="140" r="10" className="fill-primary/20 stroke-primary/50" strokeWidth="1.5" />
    <circle cx="130" cy="145" r="8" className="fill-accent stroke-primary/40" strokeWidth="1.5" />
  </motion.svg>
);
