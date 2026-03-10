import { useEffect, useState, useMemo } from 'react';
import { StudentAppLayout } from '@/components/student/StudentAppLayout';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { MapPin, Sparkles } from 'lucide-react';

interface School {
  id: string;
  name: string;
  zone_id: string;
}

// Deterministic pseudo-random from string
const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getAuraColor = (score: number) => {
  if (score >= 80) return { gradient: ['hsl(45,100%,60%)', 'hsl(35,100%,45%)'], glow: 'hsl(45,100%,55%)', tier: 'Gold' };
  if (score >= 60) return { gradient: ['hsl(270,80%,65%)', 'hsl(280,70%,50%)'], glow: 'hsl(270,80%,60%)', tier: 'Purple' };
  return { gradient: ['hsl(210,90%,60%)', 'hsl(220,80%,45%)'], glow: 'hsl(210,90%,55%)', tier: 'Blue' };
};

const SchoolAuraPage = () => {
  const { profile } = useProfile();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      if (!profile?.zone_id) { setLoading(false); return; }
      const { data } = await supabase
        .from('schools')
        .select('id, name, zone_id')
        .eq('zone_id', profile.zone_id);
      setSchools(data || []);
      setLoading(false);
    };
    fetchSchools();
  }, [profile?.zone_id]);

  // Generate stable positions & aura scores
  const schoolData = useMemo(() => {
    const mapW = 800, mapH = 600;
    const padding = 80;
    return schools.map((s, i) => {
      const h = hashCode(s.id);
      const isMySchool = s.id === profile?.school_id;
      const auraScore = isMySchool ? 92 : 40 + (h % 50);
      const angle = (i / Math.max(schools.length, 1)) * Math.PI * 2;
      const radius = 120 + (h % 100);
      const cx = mapW / 2 + Math.cos(angle) * radius;
      const cy = mapH / 2 + Math.sin(angle) * radius;
      return {
        ...s,
        x: Math.max(padding, Math.min(mapW - padding, cx)),
        y: Math.max(padding, Math.min(mapH - padding, cy)),
        auraScore,
        isMySchool,
        colors: getAuraColor(auraScore),
      };
    });
  }, [schools, profile?.school_id]);

  return (
    <StudentAppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">School Aura Map</h1>
            <p className="text-sm text-muted-foreground">Schools in your zone, glowing with their aura</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">Loading schools...</div>
        ) : schools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-2">
            <MapPin className="h-10 w-10 opacity-40" />
            <p>No schools found in your zone.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
            <svg viewBox="0 0 800 600" className="w-full h-auto" style={{ minHeight: 400 }}>
              {/* Background */}
              <rect width="800" height="600" fill="hsl(var(--background))" />

              {/* Grid roads */}
              {[100, 200, 300, 400, 500, 600, 700].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="600" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
              ))}
              {[100, 200, 300, 400, 500].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2="800" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
              ))}

              {/* Curved roads */}
              <path d="M0,300 Q200,250 400,300 T800,280" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" fill="none" opacity="0.15" />
              <path d="M400,0 Q350,200 400,300 T380,600" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" fill="none" opacity="0.15" />

              {/* Aura defs */}
              <defs>
                {schoolData.map((s, i) => (
                  <radialGradient key={`grad-${i}`} id={`aura-${i}`}>
                    <stop offset="0%" stopColor={s.colors.gradient[0]} stopOpacity="0.6" />
                    <stop offset="50%" stopColor={s.colors.gradient[1]} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={s.colors.gradient[1]} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>

              {/* School pins */}
              {schoolData.map((s, i) => {
                const auraR = 30 + (s.auraScore / 100) * 50;
                return (
                  <motion.g
                    key={s.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5, type: 'spring' }}
                    style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                  >
                    {/* Pulsing aura */}
                    <circle cx={s.x} cy={s.y} r={auraR} fill={`url(#aura-${i})`}>
                      <animate attributeName="r" values={`${auraR};${auraR + 8};${auraR}`} dur={s.isMySchool ? '2s' : '3s'} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.6;1" dur={s.isMySchool ? '2s' : '3s'} repeatCount="indefinite" />
                    </circle>

                    {/* Pin */}
                    <circle cx={s.x} cy={s.y} r="8" fill={s.colors.glow} stroke="hsl(var(--background))" strokeWidth="2" />
                    <circle cx={s.x} cy={s.y} r="3" fill="hsl(var(--background))" />

                    {/* "Your School" badge */}
                    {s.isMySchool && (
                      <>
                        <rect x={s.x - 32} y={s.y - 30} width="64" height="16" rx="8" fill={s.colors.glow} />
                        <text x={s.x} y={s.y - 19} textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(var(--background))">Your School</text>
                      </>
                    )}

                    {/* School name */}
                    <text x={s.x} y={s.y + 20} textAnchor="middle" fontSize="9" fontWeight="500" fill="hsl(var(--foreground))" opacity="0.8">
                      {s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name}
                    </text>

                    {/* Aura score */}
                    <text x={s.x} y={s.y + 32} textAnchor="middle" fontSize="8" fill={s.colors.glow} fontWeight="600">
                      Aura: {s.auraScore}
                    </text>
                  </motion.g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 py-3 border-t border-border bg-muted/30">
              {[
                { tier: 'Gold (80+)', color: 'hsl(45,100%,60%)' },
                { tier: 'Purple (60-79)', color: 'hsl(270,80%,65%)' },
                { tier: 'Blue (40-59)', color: 'hsl(210,90%,60%)' },
              ].map(l => (
                <div key={l.tier} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
                  {l.tier}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentAppLayout>
  );
};

export default SchoolAuraPage;
