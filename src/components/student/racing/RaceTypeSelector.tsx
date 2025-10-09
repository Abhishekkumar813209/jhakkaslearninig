import { Button } from '@/components/ui/button';
import { Users, School, MapPin, Globe, GraduationCap } from 'lucide-react';
import { RaceType } from '@/pages/LiveRacing';

interface RaceTypeSelectorProps {
  selectedRace: RaceType;
  onRaceChange: (type: RaceType) => void;
}

export const RaceTypeSelector = ({ selectedRace, onRaceChange }: RaceTypeSelectorProps) => {
  const raceTypes = [
    { type: 'class' as RaceType, icon: GraduationCap, label: 'My Class', color: 'from-blue-500 to-cyan-500' },
    { type: 'batch' as RaceType, icon: Users, label: 'My Batch', color: 'from-purple-500 to-pink-500' },
    { type: 'school' as RaceType, icon: School, label: 'My School', color: 'from-green-500 to-emerald-500' },
    { type: 'zone' as RaceType, icon: MapPin, label: 'My Zone', color: 'from-orange-500 to-red-500' },
    { type: 'overall' as RaceType, icon: Globe, label: 'Overall', color: 'from-yellow-500 to-amber-500' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8">
      {raceTypes.map(({ type, icon: Icon, label, color }) => (
        <Button
          key={type}
          variant={selectedRace === type ? 'default' : 'outline'}
          onClick={() => onRaceChange(type)}
          className={`relative overflow-hidden ${
            selectedRace === type
              ? `bg-gradient-to-r ${color} text-white hover:opacity-90`
              : ''
          }`}
        >
          <Icon className="h-4 w-4 mr-2" />
          {label}
        </Button>
      ))}
    </div>
  );
};
