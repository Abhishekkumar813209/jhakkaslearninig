import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  FileText,
  Book,
  FileDown,
  Trophy,
  ClipboardList,
  PenTool,
  Brain,
  ArrowRight,
  Flame,
  Zap,
  GraduationCap,
} from 'lucide-react';
import { FloatingParticles } from './FloatingParticles';
import { ScrollStorySection } from './ScrollStorySection';
import {
  ConfusedStudentIllustration,
  DiscoveryIllustration,
  ProgressIllustration,
  SuccessIllustration,
  ProudParentsIllustration,
} from './StoryIllustrations';

const primaryFeatures = [
  {
    id: 'paid-classes',
    title: 'Paid Classes',
    description: 'Live & recorded sessions from expert teachers',
    icon: Users,
    path: '/student/paid-classes',
    gradient: 'from-primary to-primary/80',
  },
  {
    id: 'roadmap',
    title: 'My Roadmap',
    description: 'Your personalized learning path',
    icon: BookOpen,
    path: '/roadmap',
    gradient: 'from-success to-success/80',
  },
  {
    id: 'daily-quiz',
    title: 'Daily Quiz',
    description: 'Race against time, earn XP daily',
    icon: Brain,
    path: '/racing',
    gradient: 'from-warning to-warning/80',
  },
];

const secondaryFeatures = [
  { id: 'free-test', title: 'Free Test', icon: FileText, path: '/tests', available: true },
  { id: 'pdf-notes', title: 'Notes', icon: FileDown, path: '/student/notes', available: true },
  { id: 'paid-test-series', title: 'Paid Test Series', icon: Trophy, path: '/tests', available: true },
  { id: 'books', title: 'Books', icon: Book, path: '#', available: false },
  { id: 'syllabus-pyq', title: 'Syllabus + PYQs', icon: ClipboardList, path: '#', available: false },
  { id: 'create-test', title: 'Create Test', icon: PenTool, path: '#', available: false },
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export const StudentHomeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleNav = (path: string, available = true) => {
    if (available && path !== '#') navigate(path);
  };

  return (
    <div className="relative">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30 py-10 px-4 md:px-8">
        <FloatingParticles />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="container mx-auto max-w-5xl relative z-10"
        >
          {/* Greeting */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {getGreeting()}, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Continue your learning journey — every step counts.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={fadeUp} className="flex gap-3 mb-10 flex-wrap">
            {[
              { icon: Flame, label: 'Streak', value: '0 days', color: 'text-destructive' },
              { icon: Zap, label: 'XP', value: '0', color: 'text-primary' },
              { icon: GraduationCap, label: 'Courses', value: '0', color: 'text-success' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm"
              >
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Primary Feature Tiles */}
          <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4 mb-6">
            {primaryFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(f.path)}
                  className="cursor-pointer"
                >
                  <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${f.gradient} text-primary-foreground p-5 h-full`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Icon className="h-7 w-7 opacity-90" />
                        <h3 className="text-lg font-bold">{f.title}</h3>
                        <p className="text-sm opacity-80 leading-snug">{f.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-60 mt-1" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Secondary Feature Grid */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {secondaryFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.id}
                  whileHover={f.available ? { scale: 1.02, y: -1 } : {}}
                  whileTap={f.available ? { scale: 0.98 } : {}}
                  onClick={() => handleNav(f.path, f.available)}
                  className={f.available ? 'cursor-pointer' : 'cursor-not-allowed'}
                >
                  <Card className={`relative p-4 border border-border transition-shadow hover:shadow-md ${!f.available ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{f.title}</span>
                    </div>
                    {!f.available && (
                      <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
                        Soon
                      </Badge>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ===== STORYTELLING SECTIONS ===== */}
      <ScrollStorySection
        title="Studying always felt confusing and boring."
        description="Scattered notes, endless chapters, no clear direction. Every student has felt this — sitting with a pile of books, not knowing where to start."
        illustration={<ConfusedStudentIllustration />}
        direction="left"
        bgClass="bg-background"
      />

      <ScrollStorySection
        title="Then everything changed."
        description="A structured platform with roadmaps, interactive quizzes, video lectures, and smart notes — all in one place. Learning finally had a path."
        illustration={<DiscoveryIllustration />}
        direction="right"
        bgClass="bg-accent/20"
      />

      <ScrollStorySection
        title="Learning finally started making sense."
        description="Track your progress across subjects, build streaks, earn XP, and watch yourself level up. Every topic completed is a step closer to your goal."
        illustration={<ProgressIllustration />}
        direction="left"
        bgClass="bg-background"
      />

      <ScrollStorySection
        title="Confidence replaced confusion."
        description="With consistent practice, clear roadmaps, and gamified learning — what once felt impossible became achievable. You're not just studying, you're mastering."
        illustration={<SuccessIllustration />}
        direction="right"
        bgClass="bg-accent/20"
      />

      <ScrollStorySection
        title="Success is even sweeter when your family sees your growth."
        description="Your parents can track your journey, celebrate your streaks, and see the transformation. Their pride is your greatest reward."
        illustration={<ProudParentsIllustration />}
        direction="center"
        bgClass="bg-gradient-to-b from-background to-accent/20"
      />

      {/* CTA Section */}
      <section className="py-16 px-4 text-center bg-gradient-to-t from-primary/5 to-background">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-2xl"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Ready to start your journey?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of students who transformed their learning with Jhakkas.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/roadmap')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors"
          >
            Explore Your Roadmap <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
