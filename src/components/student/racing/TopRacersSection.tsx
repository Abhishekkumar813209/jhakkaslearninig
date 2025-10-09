import { Card } from '@/components/ui/card';
import { RacingCar } from './RacingCar';
import { Trophy } from 'lucide-react';

interface TopRacersSectionProps {
  racers: any[];
}

export const TopRacersSection = ({ racers }: TopRacersSectionProps) => {
  if (racers.length === 0) return null;

  const maxXP = racers[0]?.total_xp || 1;

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-2">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold">Top 15 Racers</h3>
      </div>

      <div className="space-y-3">
        {racers.map((racer) => (
          <RacingCar
            key={racer.student_id}
            position={racer.position}
            name={racer.name}
            avatar={racer.avatar}
            totalXP={racer.total_xp}
            level={racer.level}
            maxXP={maxXP}
            batch={racer.batch}
          />
        ))}
      </div>
    </Card>
  );
};
