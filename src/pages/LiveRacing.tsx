import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StudentAppLayout } from '@/components/student/StudentAppLayout';
import { RaceTypeSelector } from '@/components/student/racing/RaceTypeSelector';
import { TopRacersSection } from '@/components/student/racing/TopRacersSection';
import { UserPositionSection } from '@/components/student/racing/UserPositionSection';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export type RaceType = 'class' | 'batch' | 'school' | 'zone' | 'overall';

interface RacingData {
  title: string;
  description: string;
  topRacers: any[];
  userPosition: any;
  nearbyRacers: any[];
  totalRacers: number;
  gapFromLeader: number;
  leaderXP: number;
}

const LiveRacing = () => {
  const { user } = useAuth();
  const [selectedRace, setSelectedRace] = useState<RaceType>('class');
  const [racingData, setRacingData] = useState<RacingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRacingData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('live-racing', {
        body: {
          race_type: selectedRace,
          user_id: user.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        setRacingData(data.data);
      } else {
        throw new Error(data?.error || 'Failed to fetch racing data');
      }
    } catch (error) {
      console.error('Error fetching racing data:', error);
      toast.error('Failed to load racing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRacingData();
  }, [selectedRace, user?.id]);

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('live-racing-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_gamification',
      }, () => {
        fetchRacingData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRace, user?.id]);

  if (loading && !racingData) {
    return (
      <StudentAppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentAppLayout>
    );
  }

  return (
    <StudentAppLayout>
      <div className="relative overflow-hidden">
        {/* Racing Track Background */}
        <div 
          className="fixed inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, hsl(var(--primary)) 40px, hsl(var(--primary)) 60px)',
            animation: 'track-move 2s linear infinite'
          }}
        />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              🏁 Live Racing Chart
            </h1>
            <p className="text-muted-foreground">
              Real-time rankings based on Jhakkas Points (XP)
            </p>
          </motion.div>

          {/* Race Type Selector */}
          <RaceTypeSelector
            selectedRace={selectedRace}
            onRaceChange={setSelectedRace}
          />

          {/* Racing Content */}
          <AnimatePresence mode="wait">
            {racingData && (
              <motion.div
                key={selectedRace}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Title */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {racingData.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {racingData.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Racers: {racingData.totalRacers}
                  </p>
                </div>

                {/* Top Racers */}
                <TopRacersSection racers={racingData.topRacers} />

                {/* User Position (if outside top 15) */}
                {racingData.userPosition && racingData.userPosition.position > 15 && (
                  <UserPositionSection
                    userPosition={racingData.userPosition}
                    nearbyRacers={racingData.nearbyRacers}
                    gapFromLeader={racingData.gapFromLeader}
                    leaderXP={racingData.leaderXP}
                  />
                )}

                {/* Empty State */}
                {racingData.totalRacers === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No racers found in this category yet.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </StudentAppLayout>
  );
};

export default LiveRacing;
