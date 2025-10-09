import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface RacingCarProps {
  position: number;
  name: string;
  avatar: string;
  totalXP: number;
  level: number;
  maxXP: number;
  batch?: string;
  isCurrentUser?: boolean;
}

export const RacingCar = ({
  position,
  name,
  avatar,
  totalXP,
  level,
  maxXP,
  batch,
  isCurrentUser = false,
}: RacingCarProps) => {
  const progress = (totalXP / maxXP) * 100;

  const getRankIcon = () => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankColor = () => {
    if (isCurrentUser) return 'from-primary to-primary/60';
    switch (position) {
      case 1:
        return 'from-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-amber-700 to-amber-800';
      default:
        return 'from-muted to-muted/60';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: position * 0.05 }}
      className={`relative ${
        isCurrentUser ? 'ring-2 ring-primary rounded-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3 p-3 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background/90 transition-colors">
        {/* Rank */}
        <div className="flex-shrink-0 w-10 flex items-center justify-center">
          {getRankIcon()}
        </div>

        {/* Avatar */}
        <Avatar className="h-10 w-10 border-2 border-border">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">
              {isCurrentUser ? '🚗 YOU' : name}
            </p>
            <Badge variant="secondary" className="text-xs">
              Lvl {level}
            </Badge>
            {batch && (
              <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                {batch}
              </Badge>
            )}
          </div>

          {/* Progress Track */}
          <div className="relative h-2 bg-secondary/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${getRankColor()}`}
            />
          </div>
        </div>

        {/* XP Display */}
        <div className="text-right">
          <p className="text-sm font-bold text-primary">
            {totalXP.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
      </div>

      {/* Percentage on track */}
      {position <= 3 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg"
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </motion.div>
  );
};
