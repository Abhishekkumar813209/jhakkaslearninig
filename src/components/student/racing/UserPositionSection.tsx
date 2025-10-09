import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RacingCar } from './RacingCar';
import { ArrowUp, Target } from 'lucide-react';

interface UserPositionSectionProps {
  userPosition: any;
  nearbyRacers: any[];
  gapFromLeader: number;
  leaderXP: number;
}

export const UserPositionSection = ({
  userPosition,
  nearbyRacers,
  gapFromLeader,
  leaderXP,
}: UserPositionSectionProps) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const maxXP = leaderXP || 1;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">📍 Your Position</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToTop}
          className="gap-2"
        >
          <ArrowUp className="h-4 w-4" />
          Chase the Leader
        </Button>
      </div>

      {/* Gap from Leader */}
      <div className="bg-background/50 rounded-lg p-3 mb-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">Gap from Leader</p>
        <p className="text-2xl font-bold text-primary">
          {gapFromLeader.toLocaleString()} XP
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Complete tests to close the gap!
        </p>
      </div>

      {/* Nearby Racers */}
      <div className="space-y-3">
        {nearbyRacers.map((racer) => (
          <RacingCar
            key={racer.student_id}
            position={racer.position}
            name={racer.name}
            avatar={racer.avatar}
            totalXP={racer.total_xp}
            level={racer.level}
            maxXP={maxXP}
            batch={racer.batch}
            isCurrentUser={racer.student_id === userPosition.student_id}
          />
        ))}
      </div>
    </Card>
  );
};
