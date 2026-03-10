import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ScrollStorySectionProps {
  title: string;
  description: string;
  illustration: ReactNode;
  direction?: 'left' | 'right' | 'center';
  bgClass?: string;
}

export const ScrollStorySection = ({
  title,
  description,
  illustration,
  direction = 'left',
  bgClass = '',
}: ScrollStorySectionProps) => {
  const textVariants = {
    hidden: { opacity: 0, x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0, y: direction === 'center' ? 40 : 0 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
  };

  const illustrationVariants = {
    hidden: { opacity: 0, x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0, scale: 0.9 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, delay: 0.15, ease: 'easeOut' as const } },
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
