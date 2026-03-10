import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, Zap, Target, TrendingUp } from 'lucide-react';
import { FloatingParticles } from '@/components/student/FloatingParticles';

interface LinkedStudent {
  student_id: string;
  relationship: string;
  is_primary_contact: boolean;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    student_class: string;
    batch_id: string | null;
  };
}

interface ParentHeroSectionProps {
  linkedStudents: LinkedStudent[];
  selectedStudent: string | null;
  onSelectStudent: (id: string) => void;
  activity: any;
  progress: any;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export const ParentHeroSection = ({
  linkedStudents,
  selectedStudent,
  onSelectStudent,
  activity,
  progress,
}: ParentHeroSectionProps) => {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const currentStudent = linkedStudents.find(s => s.student_id === selectedStudent);

  const stats = [
    { icon: Zap, label: 'XP', value: activity?.gamification?.total_xp || 0, color: 'text-primary' },
    { icon: Flame, label: 'Streak', value: `${activity?.gamification?.streak_days || 0}d`, color: 'text-destructive' },
    { icon: TrendingUp, label: 'Tests', value: progress?.analytics?.tests_attempted || 0, color: 'text-primary' },
    { icon: Target, label: 'Avg', value: `${(progress?.analytics?.average_score || 0).toFixed(0)}%`, color: 'text-success' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30 py-8 px-4 md:px-8">
      <FloatingParticles />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="container mx-auto max-w-5xl relative z-10"
      >
        {/* Greeting */}
        <motion.div variants={fadeUp} className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {getGreeting()}, <span className="text-primary">Parent</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            Track your child's progress and achievements.
          </p>
        </motion.div>

        {/* Child Selector — Horizontal avatar chips */}
        <motion.div variants={fadeUp} className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {linkedStudents.map((student) => {
            const isSelected = selectedStudent === student.student_id;
            return (
              <motion.button
                key={student.student_id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectStudent(student.student_id)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md'
                    : 'bg-card/80 border-border hover:bg-accent/50'
                }`}
              >
                <Avatar className={`h-10 w-10 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  <AvatarImage src={student.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {student.profiles.full_name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {student.profiles.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Class {student.profiles.student_class}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Quick Stats */}
        {currentStudent && (
          <motion.div variants={fadeUp} className="flex gap-3 flex-wrap">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-2.5 shadow-sm"
              >
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};
