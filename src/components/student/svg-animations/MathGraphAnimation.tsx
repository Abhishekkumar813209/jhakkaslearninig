import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface MathGraphData {
  equation: string;
  x_range: [number, number];
  y_range: [number, number];
  steps: {
    step: number;
    description: string;
    highlight?: string;
    animate?: boolean;
  }[];
  interactive?: {
    allow_point_drag?: boolean;
    show_grid?: boolean;
  };
}

interface MathGraphAnimationProps {
  svgData: MathGraphData;
  onComplete?: () => void;
}

export const MathGraphAnimation = ({ svgData, onComplete }: MathGraphAnimationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const width = 600;
  const height = 400;
  const padding = 40;

  const [xMin, xMax] = svgData.x_range;
  const [yMin, yMax] = svgData.y_range;

  const scaleX = (x: number) => ((x - xMin) / (xMax - xMin)) * (width - 2 * padding) + padding;
  const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  useEffect(() => {
    if (isPlaying && currentStep < svgData.steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setProgress(0);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (currentStep >= svgData.steps.length - 1) {
      setIsPlaying(false);
      onComplete?.();
    }
  }, [isPlaying, currentStep, svgData.steps.length, onComplete]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress(prev => (prev >= 100 ? 100 : prev + 2));
      }, 60);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const evaluateEquation = (x: number): number => {
    // Simple parser for y = mx + c format
    const eq = svgData.equation.toLowerCase().replace(/\s/g, '');
    const match = eq.match(/y=([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?/);
    
    if (match) {
      const m = match[1] ? parseFloat(match[1] || '1') : 1;
      const c = match[2] ? parseFloat(match[2]) : 0;
      return m * x + c;
    }
    return 0;
  };

  const generatePoints = () => {
    const points: [number, number][] = [];
    const step = (xMax - xMin) / 100;
    for (let x = xMin; x <= xMax; x += step) {
      points.push([scaleX(x), scaleY(evaluateEquation(x))]);
    }
    return points;
  };

  const points = generatePoints();
  const pathData = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleNext = () => {
    if (currentStep < svgData.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setProgress(0);
    }
  };
  const handleReset = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const currentStepData = svgData.steps[currentStep];

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">{svgData.equation}</h3>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </div>

        {/* SVG Graph */}
        <svg width={width} height={height} className="border border-border rounded-lg bg-background mb-4">
          {/* Grid */}
          {svgData.interactive?.show_grid && (
            <g className="opacity-20">
              {Array.from({ length: 21 }, (_, i) => {
                const x = padding + (i * (width - 2 * padding)) / 20;
                return (
                  <line
                    key={`v-${i}`}
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={height - padding}
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                );
              })}
              {Array.from({ length: 21 }, (_, i) => {
                const y = padding + (i * (height - 2 * padding)) / 20;
                return (
                  <line
                    key={`h-${i}`}
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                );
              })}
            </g>
          )}

          {/* Axes */}
          <g className="text-foreground">
            {/* X-axis */}
            <line
              x1={padding}
              y1={scaleY(0)}
              x2={width - padding}
              y2={scaleY(0)}
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Y-axis */}
            <line
              x1={scaleX(0)}
              y1={padding}
              x2={scaleX(0)}
              y2={height - padding}
              stroke="currentColor"
              strokeWidth="2"
            />

            {/* Axis labels */}
            <text x={width - padding + 10} y={scaleY(0) + 5} className="text-xs">x</text>
            <text x={scaleX(0) + 5} y={padding - 10} className="text-xs">y</text>
          </g>

          {/* Graph Line */}
          {currentStepData.animate && (
            <motion.path
              d={pathData}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {!currentStepData.animate && currentStep > 0 && (
            <path
              d={pathData}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
            />
          )}

          {/* Highlight points */}
          {currentStepData.highlight === 'slope' && (
            <g>
              <circle cx={scaleX(1)} cy={scaleY(evaluateEquation(1))} r="6" fill="hsl(var(--destructive))" />
              <circle cx={scaleX(2)} cy={scaleY(evaluateEquation(2))} r="6" fill="hsl(var(--destructive))" />
              <line
                x1={scaleX(1)}
                y1={scaleY(evaluateEquation(1))}
                x2={scaleX(2)}
                y2={scaleY(evaluateEquation(1))}
                stroke="hsl(var(--accent-foreground))"
                strokeWidth="2"
                strokeDasharray="4"
              />
              <line
                x1={scaleX(2)}
                y1={scaleY(evaluateEquation(1))}
                x2={scaleX(2)}
                y2={scaleY(evaluateEquation(2))}
                stroke="hsl(var(--accent-foreground))"
                strokeWidth="2"
                strokeDasharray="4"
              />
            </g>
          )}

          {currentStepData.highlight === 'intercept' && (
            <circle cx={scaleX(0)} cy={scaleY(evaluateEquation(0))} r="8" fill="hsl(var(--destructive))" />
          )}
        </svg>

        {/* Controls */}
        <div className="flex items-center gap-2 mb-4">
          <Button onClick={handlePlay} size="sm" variant="outline">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button onClick={handleNext} size="sm" variant="outline" disabled={currentStep >= svgData.steps.length - 1}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button onClick={handleReset} size="sm" variant="outline">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="flex-1 mx-4">
            <Slider
              value={[currentStep]}
              max={svgData.steps.length - 1}
              step={1}
              onValueChange={([value]) => {
                setCurrentStep(value);
                setProgress(0);
              }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} / {svgData.steps.length}
          </span>
        </div>
      </Card>
    </div>
  );
};
