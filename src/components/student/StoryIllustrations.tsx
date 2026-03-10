import { motion } from 'framer-motion';

// Shared SVG defs for consistent gradients
const SvgDefs = () => (
  <defs>
    <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f5cba7" />
      <stop offset="100%" stopColor="#e0a96d" />
    </linearGradient>
    <linearGradient id="hairGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#2c1810" />
      <stop offset="100%" stopColor="#4a2c1a" />
    </linearGradient>
    <linearGradient id="shirtBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#60a5fa" />
      <stop offset="100%" stopColor="#3b82f6" />
    </linearGradient>
    <linearGradient id="shirtGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4ade80" />
      <stop offset="100%" stopColor="#22c55e" />
    </linearGradient>
    <linearGradient id="laptopGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#e2e8f0" />
      <stop offset="100%" stopColor="#94a3b8" />
    </linearGradient>
    <linearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#dbeafe" />
      <stop offset="100%" stopColor="#93c5fd" />
    </linearGradient>
    <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#d4a574" />
      <stop offset="100%" stopColor="#a67c52" />
    </linearGradient>
    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glowGreen" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="pantsGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#475569" />
      <stop offset="100%" stopColor="#334155" />
    </linearGradient>
    <linearGradient id="parentShirt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#f472b6" />
      <stop offset="100%" stopColor="#ec4899" />
    </linearGradient>
    <linearGradient id="dadShirt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#818cf8" />
      <stop offset="100%" stopColor="#6366f1" />
    </linearGradient>
  </defs>
);

// Section 1: Confused student — slouched, messy desk, question marks
export const ConfusedStudentIllustration = () => (
  <div className="relative w-80 h-80 mx-auto">
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SvgDefs />
      {/* Desk */}
      <rect x="40" y="220" width="240" height="12" rx="4" fill="url(#deskGrad)" />
      <rect x="60" y="232" width="8" height="60" rx="2" fill="#a67c52" />
      <rect x="252" y="232" width="8" height="60" rx="2" fill="#a67c52" />
      
      {/* Scattered books */}
      <rect x="55" y="200" width="35" height="22" rx="3" fill="#fbbf24" opacity="0.8" transform="rotate(-15 55 200)" />
      <rect x="60" y="195" width="30" height="18" rx="2" fill="#f87171" opacity="0.7" transform="rotate(-8 60 195)" />
      <rect x="210" y="198" width="40" height="20" rx="3" fill="#60a5fa" opacity="0.7" transform="rotate(12 210 198)" />
      <rect x="230" y="205" width="32" height="16" rx="2" fill="#a78bfa" opacity="0.6" transform="rotate(5 230 205)" />
      
      {/* Crumpled paper */}
      <circle cx="170" cy="205" r="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="130" cy="210" r="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      
      {/* Student body — slouched */}
      {/* Legs */}
      <rect x="138" y="230" width="16" height="50" rx="6" fill="url(#pantsGrad)" transform="rotate(-5 138 230)" />
      <rect x="162" y="230" width="16" height="50" rx="6" fill="url(#pantsGrad)" transform="rotate(5 162 230)" />
      {/* Shoes */}
      <ellipse cx="135" cy="278" rx="12" ry="6" fill="#1e293b" />
      <ellipse cx="181" cy="278" rx="12" ry="6" fill="#1e293b" />
      
      {/* Torso — slouched forward */}
      <path d="M135 175 C135 175, 128 220, 140 232 L176 232 C188 220, 181 175, 181 175 Z" fill="url(#shirtBlue)" />
      
      {/* Arms — resting on desk */}
      <path d="M135 190 C120 195, 100 210, 95 215" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M181 190 C196 195, 216 210, 221 215" stroke="url(#skinGrad)" strokeWidth="14" strokeLinecap="round" fill="none" />
      
      {/* Head resting on hand */}
      <circle cx="158" cy="148" r="28" fill="url(#skinGrad)" />
      {/* Hair */}
      <path d="M130 140 C130 115, 145 105, 158 105 C171 105, 186 115, 186 140 C186 130, 175 120, 158 120 C141 120, 130 130, 130 140 Z" fill="url(#hairGrad)" />
      {/* Left ear */}
      <ellipse cx="131" cy="150" rx="5" ry="7" fill="url(#skinGrad)" />
      {/* Right ear */}
      <ellipse cx="185" cy="150" rx="5" ry="7" fill="url(#skinGrad)" />
      
      {/* Face — confused/bored expression */}
      {/* Eyes — half-closed */}
      <path d="M145 145 Q148 142, 151 145" stroke="#1e293b" strokeWidth="2" fill="none" />
      <path d="M165 145 Q168 142, 171 145" stroke="#1e293b" strokeWidth="2" fill="none" />
      {/* Eyebrows — furrowed */}
      <path d="M143 139 Q148 136, 152 138" stroke="#4a2c1a" strokeWidth="1.5" fill="none" />
      <path d="M164 138 Q168 136, 173 139" stroke="#4a2c1a" strokeWidth="1.5" fill="none" />
      {/* Mouth — slight frown */}
      <path d="M151 160 Q158 156, 165 160" stroke="#c08060" strokeWidth="1.5" fill="none" />
    </svg>
    
    {/* Animated question marks */}
    <motion.div
      animate={{ y: [-8, 8, -8], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute top-6 right-8 text-3xl font-bold text-primary/40 select-none"
    >?</motion.div>
    <motion.div
      animate={{ y: [5, -10, 5], opacity: [0.5, 0.2, 0.5] }}
      transition={{ duration: 3.5, repeat: Infinity, delay: 0.8 }}
      className="absolute top-10 left-10 text-2xl font-bold text-muted-foreground/30 select-none"
    >?</motion.div>
    <motion.div
      animate={{ y: [-5, 10, -5], opacity: [0.2, 0.8, 0.2] }}
      transition={{ duration: 2.8, repeat: Infinity, delay: 1.4 }}
      className="absolute top-2 left-1/2 text-xl font-bold text-destructive/30 select-none"
    >?</motion.div>
    
    {/* Floating sad cloud */}
    <motion.div
      animate={{ x: [-5, 5, -5], y: [-3, 3, -3] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute top-4 right-16"
    >
      <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
        <ellipse cx="24" cy="20" rx="20" ry="12" fill="hsl(var(--muted))" opacity="0.4" />
        <ellipse cx="16" cy="16" rx="10" ry="10" fill="hsl(var(--muted))" opacity="0.3" />
        <ellipse cx="32" cy="14" rx="12" ry="10" fill="hsl(var(--muted))" opacity="0.3" />
      </svg>
    </motion.div>
  </div>
);

// Section 2: Discovery — student finds the platform
export const DiscoveryIllustration = () => (
  <div className="relative w-80 h-80 mx-auto">
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SvgDefs />
      {/* Chair */}
      <rect x="120" y="250" width="80" height="8" rx="3" fill="#94a3b8" />
      <rect x="126" y="258" width="6" height="35" rx="2" fill="#64748b" />
      <rect x="188" y="258" width="6" height="35" rx="2" fill="#64748b" />
      
      {/* Desk */}
      <rect x="20" y="220" width="280" height="10" rx="4" fill="url(#deskGrad)" />
      <rect x="30" y="230" width="6" height="55" rx="2" fill="#a67c52" />
      <rect x="284" y="230" width="6" height="55" rx="2" fill="#a67c52" />
      
      {/* Laptop */}
      <rect x="90" y="175" width="100" height="45" rx="5" fill="url(#laptopGrad)" />
      <rect x="95" y="180" width="90" height="35" rx="3" fill="url(#screenGlow)" />
      {/* Screen content */}
      <rect x="100" y="185" width="40" height="4" rx="1" fill="#3b82f6" opacity="0.6" />
      <rect x="100" y="192" width="55" height="3" rx="1" fill="#60a5fa" opacity="0.4" />
      <rect x="100" y="198" width="30" height="3" rx="1" fill="#22c55e" opacity="0.5" />
      <rect x="135" y="198" width="20" height="3" rx="1" fill="#f59e0b" opacity="0.5" />
      <rect x="100" y="204" width="45" height="3" rx="1" fill="#8b5cf6" opacity="0.4" />
      {/* Laptop base */}
      <rect x="80" y="218" width="120" height="5" rx="2" fill="#94a3b8" />
      
      {/* Student — sitting upright, engaged */}
      {/* Legs */}
      <rect x="140" y="248" width="14" height="40" rx="5" fill="url(#pantsGrad)" />
      <rect x="162" y="248" width="14" height="40" rx="5" fill="url(#pantsGrad)" />
      
      {/* Torso — upright */}
      <path d="M138 178 C138 178, 135 230, 140 248 L176 248 C181 230, 178 178, 178 178 Z" fill="url(#shirtBlue)" />
      
      {/* Arms — on keyboard */}
      <path d="M138 195 C125 205, 110 215, 105 218" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M178 195 C191 205, 200 215, 195 218" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      
      {/* Head — looking at screen */}
      <circle cx="158" cy="150" r="26" fill="url(#skinGrad)" />
      {/* Hair */}
      <path d="M132 142 C132 118, 146 108, 158 108 C170 108, 184 118, 184 142 C184 132, 174 122, 158 122 C142 122, 132 132, 132 142 Z" fill="url(#hairGrad)" />
      <ellipse cx="133" cy="152" rx="4" ry="6" fill="url(#skinGrad)" />
      <ellipse cx="183" cy="152" rx="4" ry="6" fill="url(#skinGrad)" />
      
      {/* Eyes — open wide, interested */}
      <circle cx="149" cy="148" r="4" fill="white" />
      <circle cx="149" cy="148" r="2.5" fill="#1e293b" />
      <circle cx="148" cy="147" r="1" fill="white" />
      <circle cx="167" cy="148" r="4" fill="white" />
      <circle cx="167" cy="148" r="2.5" fill="#1e293b" />
      <circle cx="166" cy="147" r="1" fill="white" />
      {/* Eyebrows — raised */}
      <path d="M144 139 Q149 136, 154 139" stroke="#4a2c1a" strokeWidth="1.5" fill="none" />
      <path d="M162 139 Q167 136, 172 139" stroke="#4a2c1a" strokeWidth="1.5" fill="none" />
      {/* Mouth — slight smile */}
      <path d="M152 162 Q158 166, 164 162" stroke="#c08060" strokeWidth="1.5" fill="none" />
    </svg>
    
    {/* Glowing screen effect */}
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 w-32 h-20 rounded-full bg-primary/10 blur-2xl"
    />
    
    {/* Floating UI elements */}
    <motion.div
      animate={{ y: [-5, 5, -5], x: [0, 3, 0] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute top-12 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
    >
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded bg-primary/60" />
        <div className="w-12 h-2 rounded bg-muted" />
      </div>
    </motion.div>
    <motion.div
      animate={{ y: [4, -6, 4], x: [0, -3, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
      className="absolute top-20 left-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg"
    >
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-success/60" />
        <div className="w-10 h-2 rounded bg-muted" />
      </div>
    </motion.div>
    
    {/* Sparkle */}
    <motion.div
      animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
      className="absolute top-6 right-20 text-xl text-primary"
    >✨</motion.div>
  </div>
);

// Section 3: Progress — confident student with metrics
export const ProgressIllustration = () => (
  <div className="relative w-80 h-80 mx-auto">
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SvgDefs />
      {/* Desk */}
      <rect x="30" y="230" width="260" height="10" rx="4" fill="url(#deskGrad)" />
      
      {/* Laptop - screen showing progress */}
      <rect x="85" y="185" width="100" height="45" rx="5" fill="url(#laptopGrad)" />
      <rect x="90" y="190" width="90" height="35" rx="3" fill="url(#screenGlow)" />
      {/* Progress bars on screen */}
      <rect x="95" y="195" width="60" height="4" rx="1.5" fill="#e2e8f0" />
      <rect x="95" y="195" width="45" height="4" rx="1.5" fill="#3b82f6" />
      <rect x="95" y="203" width="60" height="4" rx="1.5" fill="#e2e8f0" />
      <rect x="95" y="203" width="36" height="4" rx="1.5" fill="#22c55e" />
      <rect x="95" y="211" width="60" height="4" rx="1.5" fill="#e2e8f0" />
      <rect x="95" y="211" width="50" height="4" rx="1.5" fill="#f59e0b" />
      {/* Checkmark */}
      <circle cx="168" cy="200" r="6" fill="#22c55e" opacity="0.8" />
      <path d="M165 200 L167 203 L172 197" stroke="white" strokeWidth="1.5" fill="none" />
      <rect x="78" y="228" width="114" height="5" rx="2" fill="#94a3b8" />
      
      {/* Student — confident, leaning back slightly */}
      <rect x="142" y="255" width="14" height="38" rx="5" fill="url(#pantsGrad)" />
      <rect x="164" y="255" width="14" height="38" rx="5" fill="url(#pantsGrad)" />
      
      <path d="M140 185 C140 185, 137 238, 142 255 L178 255 C183 238, 180 185, 180 185 Z" fill="url(#shirtGreen)" />
      
      {/* Arms — relaxed */}
      <path d="M140 200 C128 208, 115 218, 110 225" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M180 200 C192 205, 200 210, 205 218" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      
      {/* Head — confident expression */}
      <circle cx="160" cy="158" r="26" fill="url(#skinGrad)" />
      <path d="M134 150 C134 126, 148 116, 160 116 C172 116, 186 126, 186 150 C186 140, 176 130, 160 130 C144 130, 134 140, 134 150 Z" fill="url(#hairGrad)" />
      <ellipse cx="135" cy="160" rx="4" ry="6" fill="url(#skinGrad)" />
      <ellipse cx="185" cy="160" rx="4" ry="6" fill="url(#skinGrad)" />
      
      {/* Eyes — focused */}
      <circle cx="151" cy="156" r="3.5" fill="white" />
      <circle cx="151" cy="156" r="2" fill="#1e293b" />
      <circle cx="150" cy="155" r="0.8" fill="white" />
      <circle cx="169" cy="156" r="3.5" fill="white" />
      <circle cx="169" cy="156" r="2" fill="#1e293b" />
      <circle cx="168" cy="155" r="0.8" fill="white" />
      {/* Confident smile */}
      <path d="M153 170 Q160 175, 167 170" stroke="#c08060" strokeWidth="1.8" fill="none" />
    </svg>
    
    {/* Animated stats */}
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, type: 'spring' }}
      className="absolute top-4 right-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 shadow-lg"
    >
      <span className="text-sm font-bold">🔥 12 day streak</span>
    </motion.div>
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.5, type: 'spring' }}
      className="absolute top-16 left-0 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 shadow-lg"
    >
      <span className="text-sm font-bold">⚡ 2,450 XP</span>
    </motion.div>
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.7, type: 'spring' }}
      className="absolute bottom-10 right-0 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 shadow-lg"
    >
      <span className="text-sm font-bold">🏆 Level 8</span>
    </motion.div>
    
    {/* Progress glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.25, 0.1] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 h-28 rounded-full bg-success/10 blur-2xl"
    />
  </div>
);

// Section 4: Success — standing confident student
export const SuccessIllustration = () => (
  <div className="relative w-80 h-80 mx-auto">
    <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SvgDefs />
      {/* Floor */}
      <ellipse cx="160" cy="295" rx="100" ry="8" fill="hsl(var(--muted))" opacity="0.3" />
      
      {/* Organized desk behind */}
      <rect x="180" y="200" width="120" height="8" rx="3" fill="url(#deskGrad)" opacity="0.6" />
      <rect x="200" y="185" width="25" height="16" rx="2" fill="#3b82f6" opacity="0.3" />
      <rect x="230" y="182" width="25" height="19" rx="2" fill="#22c55e" opacity="0.3" />
      <rect x="260" y="188" width="22" height="13" rx="2" fill="#8b5cf6" opacity="0.3" />
      
      {/* Student — standing tall */}
      {/* Legs */}
      <rect x="140" y="240" width="16" height="55" rx="6" fill="url(#pantsGrad)" />
      <rect x="164" y="240" width="16" height="55" rx="6" fill="url(#pantsGrad)" />
      {/* Shoes */}
      <ellipse cx="148" cy="294" rx="14" ry="5" fill="#1e293b" />
      <ellipse cx="172" cy="294" rx="14" ry="5" fill="#1e293b" />
      
      {/* Torso — upright, confident */}
      <path d="M138 160 C138 160, 135 225, 140 242 L180 242 C185 225, 182 160, 182 160 Z" fill="url(#shirtGreen)" />
      
      {/* Arms — slightly raised in confidence */}
      <path d="M138 175 C122 168, 108 155, 100 145" stroke="url(#skinGrad)" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M182 175 C198 168, 212 155, 220 145" stroke="url(#skinGrad)" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Hands */}
      <circle cx="97" cy="142" r="7" fill="url(#skinGrad)" />
      <circle cx="223" cy="142" r="7" fill="url(#skinGrad)" />
      
      {/* Head */}
      <circle cx="160" cy="128" r="28" fill="url(#skinGrad)" />
      <path d="M132 120 C132 96, 146 86, 160 86 C174 86, 188 96, 188 120 C188 110, 178 100, 160 100 C142 100, 132 110, 132 120 Z" fill="url(#hairGrad)" />
      <ellipse cx="133" cy="130" rx="4" ry="7" fill="url(#skinGrad)" />
      <ellipse cx="187" cy="130" rx="4" ry="7" fill="url(#skinGrad)" />
      
      {/* Eyes — bright, happy */}
      <circle cx="150" cy="126" r="4" fill="white" />
      <circle cx="150" cy="126" r="2.5" fill="#1e293b" />
      <circle cx="149" cy="125" r="1" fill="white" />
      <circle cx="170" cy="126" r="4" fill="white" />
      <circle cx="170" cy="126" r="2.5" fill="#1e293b" />
      <circle cx="169" cy="125" r="1" fill="white" />
      {/* Big smile */}
      <path d="M150 141 Q160 150, 170 141" stroke="#c08060" strokeWidth="2" fill="none" />
      {/* Blush */}
      <circle cx="141" cy="136" r="5" fill="#fca5a5" opacity="0.3" />
      <circle cx="179" cy="136" r="5" fill="#fca5a5" opacity="0.3" />
    </svg>
    
    {/* Achievement badges */}
    {[
      { x: 'right-4', y: 'top-8', delay: 0.3 },
      { x: 'right-14', y: 'top-2', delay: 0.5 },
      { x: 'left-6', y: 'top-12', delay: 0.7 },
    ].map((pos, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: pos.delay, type: 'spring', stiffness: 200 }}
        className={`absolute ${pos.x} ${pos.y} w-10 h-10 rounded-full bg-success/20 border-2 border-success/30 flex items-center justify-center shadow-lg`}
      >
        <span className="text-success text-lg">✓</span>
      </motion.div>
    ))}
    
    {/* Stars */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
        className="absolute text-warning"
        style={{ left: `${20 + i * 30}%`, top: `${5 + i * 8}%` }}
      >⭐</motion.div>
    ))}
    
    {/* Success glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-52 h-36 rounded-full bg-success/10 blur-3xl"
    />
  </div>
);

// Section 5: Proud Parents — family scene
export const ProudParentsIllustration = () => (
  <div className="relative w-96 h-80 mx-auto">
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SvgDefs />
      {/* Floor */}
      <ellipse cx="200" cy="300" rx="160" ry="10" fill="hsl(var(--muted))" opacity="0.2" />
      
      {/* Father — left */}
      {/* Legs */}
      <rect x="85" y="240" width="14" height="55" rx="5" fill="url(#pantsGrad)" />
      <rect x="105" y="240" width="14" height="55" rx="5" fill="url(#pantsGrad)" />
      {/* Torso */}
      <path d="M82 170 C82 170, 79 225, 85 242 L120 242 C126 225, 123 170, 123 170 Z" fill="url(#dadShirt)" />
      {/* Arms */}
      <path d="M82 185 C72 195, 65 210, 68 220" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M123 185 C133 190, 145 195, 155 195" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* Head */}
      <circle cx="102" cy="142" r="26" fill="url(#skinGrad)" />
      <path d="M76 134 C76 112, 89 102, 102 102 C115 102, 128 112, 128 134 C128 124, 118 114, 102 114 C86 114, 76 124, 76 134 Z" fill="url(#hairGrad)" />
      <ellipse cx="77" cy="144" rx="4" ry="6" fill="url(#skinGrad)" />
      <ellipse cx="127" cy="144" rx="4" ry="6" fill="url(#skinGrad)" />
      {/* Happy face */}
      <circle cx="94" cy="140" r="3" fill="white" />
      <circle cx="94" cy="140" r="1.8" fill="#1e293b" />
      <circle cx="110" cy="140" r="3" fill="white" />
      <circle cx="110" cy="140" r="1.8" fill="#1e293b" />
      <path d="M94 153 Q102 160, 110 153" stroke="#c08060" strokeWidth="1.8" fill="none" />
      {/* Mustache */}
      <path d="M95 148 Q102 151, 109 148" stroke="#4a2c1a" strokeWidth="1.5" fill="none" />
      
      {/* Mother — right */}
      {/* Legs */}
      <rect x="275" y="245" width="13" height="50" rx="5" fill="url(#pantsGrad)" />
      <rect x="295" y="245" width="13" height="50" rx="5" fill="url(#pantsGrad)" />
      {/* Torso — sari/dress */}
      <path d="M272 175 C272 175, 269 230, 275 247 L310 247 C316 230, 313 175, 313 175 Z" fill="url(#parentShirt)" />
      {/* Dupatta/shawl */}
      <path d="M285 175 C295 180, 320 185, 325 200" stroke="#f9a8d4" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Arms */}
      <path d="M272 190 C262 200, 255 210, 252 220" stroke="url(#skinGrad)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M313 190 C325 195, 235 195, 245 195" stroke="url(#skinGrad)" strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* Head */}
      <circle cx="293" cy="148" r="25" fill="url(#skinGrad)" />
      {/* Long hair */}
      <path d="M268 140 C268 116, 280 108, 293 108 C306 108, 318 116, 318 140 C318 130, 308 120, 293 120 C278 120, 268 130, 268 140 Z" fill="#2c1810" />
      <path d="M268 140 C265 160, 265 175, 270 180" stroke="#2c1810" strokeWidth="6" fill="none" />
      <path d="M318 140 C321 160, 321 175, 316 180" stroke="#2c1810" strokeWidth="6" fill="none" />
      <ellipse cx="269" cy="150" rx="4" ry="6" fill="url(#skinGrad)" />
      <ellipse cx="317" cy="150" rx="4" ry="6" fill="url(#skinGrad)" />
      {/* Bindi */}
      <circle cx="293" cy="132" r="2" fill="#ef4444" />
      {/* Happy face */}
      <circle cx="285" cy="146" r="2.8" fill="white" />
      <circle cx="285" cy="146" r="1.6" fill="#1e293b" />
      <circle cx="301" cy="146" r="2.8" fill="white" />
      <circle cx="301" cy="146" r="1.6" fill="#1e293b" />
      <path d="M286 158 Q293 164, 300 158" stroke="#c08060" strokeWidth="1.5" fill="none" />
      
      {/* Student — center, confident */}
      {/* Legs */}
      <rect x="180" y="245" width="15" height="50" rx="6" fill="url(#pantsGrad)" />
      <rect x="200" y="245" width="15" height="50" rx="6" fill="url(#pantsGrad)" />
      {/* Torso */}
      <path d="M177 170 C177 170, 174 228, 180 247 L216 247 C222 228, 219 170, 219 170 Z" fill="url(#shirtBlue)" />
      {/* Arms up — celebrating */}
      <path d="M177 185 C162 175, 152 158, 148 140" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M219 185 C234 175, 244 158, 248 140" stroke="url(#skinGrad)" strokeWidth="12" strokeLinecap="round" fill="none" />
      <circle cx="146" cy="137" r="6" fill="url(#skinGrad)" />
      <circle cx="250" cy="137" r="6" fill="url(#skinGrad)" />
      {/* Head */}
      <circle cx="198" cy="142" r="27" fill="url(#skinGrad)" />
      <path d="M171 134 C171 110, 184 100, 198 100 C212 100, 225 110, 225 134 C225 124, 215 114, 198 114 C181 114, 171 124, 171 134 Z" fill="url(#hairGrad)" />
      <ellipse cx="172" cy="144" rx="4" ry="6" fill="url(#skinGrad)" />
      <ellipse cx="224" cy="144" rx="4" ry="6" fill="url(#skinGrad)" />
      {/* Big happy eyes */}
      <circle cx="190" cy="140" r="4" fill="white" />
      <circle cx="190" cy="140" r="2.5" fill="#1e293b" />
      <circle cx="189" cy="139" r="1" fill="white" />
      <circle cx="206" cy="140" r="4" fill="white" />
      <circle cx="206" cy="140" r="2.5" fill="#1e293b" />
      <circle cx="205" cy="139" r="1" fill="white" />
      {/* Big grin */}
      <path d="M189 155 Q198 164, 207 155" stroke="#c08060" strokeWidth="2" fill="none" />
      {/* Blush */}
      <circle cx="181" cy="150" r="5" fill="#fca5a5" opacity="0.3" />
      <circle cx="215" cy="150" r="5" fill="#fca5a5" opacity="0.3" />
      
      {/* Trophy in student's hand */}
      <rect x="144" y="120" width="8" height="15" rx="1" fill="#fbbf24" />
      <rect x="140" y="115" width="16" height="8" rx="3" fill="#fbbf24" />
      <circle cx="148" cy="112" r="5" fill="#fbbf24" />
      <circle cx="148" cy="112" r="3" fill="#fde68a" />
    </svg>
    
    {/* Hearts */}
    {[0, 1, 2, 3].map((i) => (
      <motion.div
        key={i}
        animate={{ y: [-8, -20, -8], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.5, delay: i * 0.5, repeat: Infinity }}
        className="absolute text-destructive/50"
        style={{ left: `${20 + i * 20}%`, top: `${5 + (i % 2) * 8}%` }}
      >❤️</motion.div>
    ))}
    
    {/* Warm family glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full bg-warning/10 blur-3xl"
    />
  </div>
);
