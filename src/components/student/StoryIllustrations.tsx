import { motion } from 'framer-motion';

// Section 1: Confused student
export const ConfusedStudentIllustration = () => (
  <div className="relative w-64 h-64 mx-auto">
    {/* Desk */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-3 rounded-full bg-muted" />
    <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-44 h-20 rounded-lg bg-secondary border border-border" />
    {/* Scattered books */}
    <motion.div
      animate={{ rotate: [-5, 5, -5] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute bottom-14 left-8 w-10 h-14 rounded bg-primary/20 border border-primary/30 -rotate-12"
    />
    <motion.div className="absolute bottom-16 right-10 w-8 h-12 rounded bg-destructive/15 border border-destructive/20 rotate-6" />
    {/* Student head */}
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
      <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/25 flex items-center justify-center">
        <span className="text-2xl">😕</span>
      </div>
      {/* Body */}
      <div className="w-20 h-12 -mt-2 mx-auto rounded-t-xl bg-primary/10 border border-primary/15" style={{ marginLeft: '-2px' }} />
    </div>
    {/* Question marks */}
    <motion.span
      animate={{ y: [-5, 5, -5], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 2.5, repeat: Infinity }}
      className="absolute top-8 right-12 text-2xl text-muted-foreground/50"
    >?</motion.span>
    <motion.span
      animate={{ y: [3, -5, 3], opacity: [0.6, 0.3, 0.6] }}
      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      className="absolute top-4 left-16 text-xl text-muted-foreground/40"
    >?</motion.span>
  </div>
);

// Section 2: Discovery
export const DiscoveryIllustration = () => (
  <div className="relative w-72 h-64 mx-auto">
    {/* Laptop */}
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
      <div className="w-40 h-24 rounded-t-lg bg-card border-2 border-primary/30 overflow-hidden">
        {/* Screen content */}
        <div className="p-2 space-y-1.5">
          <div className="h-2 w-20 rounded bg-primary/30" />
          <div className="h-2 w-28 rounded bg-primary/15" />
          <div className="flex gap-1 mt-2">
            <motion.div
              animate={{ scaleX: [0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              className="h-3 w-8 rounded bg-success/40 origin-left"
            />
            <motion.div
              animate={{ scaleX: [0, 1] }}
              transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, repeatDelay: 2 }}
              className="h-3 w-6 rounded bg-primary/30 origin-left"
            />
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                className="h-4 w-4 rounded bg-primary/20"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="w-44 h-2 rounded-b-lg bg-muted-foreground/20 mx-auto" />
    </div>
    {/* Student - more engaged */}
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
      <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/35 flex items-center justify-center">
        <span className="text-2xl">🤔</span>
      </div>
    </div>
    {/* Glow effect */}
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-primary/10 blur-2xl"
    />
    {/* Sparkles */}
    <motion.span
      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-10 right-8 text-lg text-primary"
    >✨</motion.span>
  </div>
);

// Section 3: Progress
export const ProgressIllustration = () => (
  <div className="w-72 mx-auto space-y-4">
    {/* Progress bars */}
    {[
      { label: 'Physics', pct: 75, color: 'bg-primary' },
      { label: 'Maths', pct: 60, color: 'bg-success' },
      { label: 'Chemistry', pct: 45, color: 'bg-warning' },
    ].map((item, i) => (
      <div key={item.label} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">{item.label}</span>
          <span className="text-muted-foreground">{item.pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${item.pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: i * 0.2, ease: 'easeOut' }}
            className={`h-full rounded-full ${item.color}`}
          />
        </div>
      </div>
    ))}
    {/* Stats row */}
    <div className="flex justify-between pt-4">
      {[
        { label: 'Streak', value: '🔥 12', },
        { label: 'XP', value: '⚡ 2,450', },
        { label: 'Level', value: '🏆 8', },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 + i * 0.15 }}
          className="text-center px-4 py-2 rounded-xl bg-card border border-border"
        >
          <div className="text-lg font-bold">{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Section 4: Success
export const SuccessIllustration = () => (
  <div className="relative w-64 h-64 mx-auto">
    {/* Organized desk */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-3 rounded-full bg-muted" />
    <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-44 h-20 rounded-lg bg-secondary border border-border" />
    {/* Neatly stacked books */}
    <div className="absolute bottom-14 left-10 space-y-0.5">
      <div className="w-8 h-2.5 rounded-sm bg-primary/30" />
      <div className="w-8 h-2.5 rounded-sm bg-success/30" />
      <div className="w-8 h-2.5 rounded-sm bg-primary/20" />
    </div>
    {/* Confident student */}
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-16 h-16 rounded-full bg-success/20 border-2 border-success/35 flex items-center justify-center"
      >
        <span className="text-2xl">😎</span>
      </motion.div>
    </div>
    {/* Completed checkmarks */}
    {[
      { x: 'right-4', y: 'top-12' },
      { x: 'right-10', y: 'top-6' },
      { x: 'left-6', y: 'top-10' },
    ].map((pos, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
        className={`absolute ${pos.x} ${pos.y} w-8 h-8 rounded-full bg-success/20 flex items-center justify-center`}
      >
        <span className="text-success text-sm">✓</span>
      </motion.div>
    ))}
    {/* Glow */}
    <motion.div
      animate={{ opacity: [0.15, 0.35, 0.15] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full bg-success/10 blur-3xl"
    />
  </div>
);

// Section 5: Proud Parents
export const ProudParentsIllustration = () => (
  <div className="relative w-80 h-56 mx-auto">
    {/* Parents */}
    <div className="absolute bottom-8 left-12 flex gap-3 items-end">
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/25 flex items-center justify-center"
      >
        <span className="text-xl">👨</span>
      </motion.div>
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, delay: 0.3, repeat: Infinity }}
        className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/25 flex items-center justify-center"
      >
        <span className="text-xl">👩</span>
      </motion.div>
    </div>
    {/* Student studying confidently */}
    <div className="absolute bottom-8 right-12">
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-14 h-14 rounded-full bg-success/20 border-2 border-success/30 flex items-center justify-center"
      >
        <span className="text-xl">📚</span>
      </motion.div>
    </div>
    {/* Hearts / love */}
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ y: [-5, -15, -5], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity }}
        className="absolute text-destructive/60"
        style={{ left: `${30 + i * 25}%`, top: '10px' }}
      >
        ❤️
      </motion.span>
    ))}
    {/* Warm glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.25, 0.1] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-warning/10 blur-3xl"
    />
  </div>
);
