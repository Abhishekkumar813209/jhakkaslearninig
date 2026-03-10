import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
}

interface ScrollStorySectionProps {
  title: string;
  description: string;
  illustration: ReactNode;
  direction?: 'left' | 'right' | 'center';
  bgClass?: string;
  features?: FeatureItem[];
}

const FeatureCard = ({ feature, index }: { feature: FeatureItem; index: number }) => {
  const navigate = useNavigate();
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 + index * 0.12, duration: 0.5, ease: 'easeOut' }}
      whileHover={feature.available ? { scale: 1.04, y: -3 } : {}}
      whileTap={feature.available ? { scale: 0.97 } : {}}
      onClick={() => feature.available && feature.path !== '#' && navigate(feature.path)}
      className={`relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-lg transition-shadow hover:shadow-xl ${
        feature.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{feature.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
        </div>
      </div>
      {!feature.available && (
        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
          Soon
        </Badge>
      )}
    </motion.div>
  );
};

export const ScrollStorySection = ({
  title,
  description,
  illustration,
  direction = 'left',
  bgClass = '',
  features,
}: ScrollStorySectionProps) => {
  const textVariants = {
    hidden: { opacity: 0, x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0, y: direction === 'center' ? 40 : 0 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
  };

  const illustrationVariants = {
    hidden: { opacity: 0, x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0, scale: 0.9 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, delay: 0.15, ease: 'easeOut' as const } },
  };

  const renderFeatures = () => {
    if (!features || features.length === 0) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg mx-auto md:mx-0">
        {features.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    );
  };

  if (direction === 'center') {
    return (
      <section className={`relative min-h-[70vh] flex items-center justify-center py-20 ${bgClass}`}>
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={textVariants}
            className="mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={illustrationVariants}
          >
            {illustration}
          </motion.div>
          {features && features.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10 max-w-2xl mx-auto">
              {features.map((f, i) => (
                <FeatureCard key={f.title} feature={f} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`relative min-h-[70vh] flex items-center py-20 ${bgClass}`}>
      <div className={`container mx-auto max-w-5xl px-6 grid md:grid-cols-2 gap-12 items-center ${direction === 'right' ? 'md:[direction:rtl]' : ''}`}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={textVariants}
          className="md:[direction:ltr]"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
          {renderFeatures()}
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={illustrationVariants}
          className="flex justify-center md:[direction:ltr]"
        >
          {illustration}
        </motion.div>
      </div>
    </section>
  );
};
