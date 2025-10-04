import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';

interface AlgorithmStep {
  step: number;
  compare?: [number, number];
  swap?: boolean;
  array_state: number[];
  highlight?: number[];
  sorted?: number[];
}

interface AlgorithmVisualizationData {
  algorithm: string;
  input_array: number[];
  steps: AlgorithmStep[];
  speed?: 'slow' | 'medium' | 'fast';
  show_pseudocode?: boolean;
}

interface AlgorithmVisualizationProps {
  svgData: AlgorithmVisualizationData;
  onComplete?: () => void;
}

const PSEUDOCODE: Record<string, string[]> = {
  bubble_sort: [
    'for i = 0 to n-1:',
    '  for j = 0 to n-i-1:',
    '    if arr[j] > arr[j+1]:',
    '      swap(arr[j], arr[j+1])',
  ],
  quick_sort: [
    'function quickSort(arr, low, high):',
    '  if low < high:',
    '    pivot = partition(arr, low, high)',
    '    quickSort(arr, low, pivot-1)',
    '    quickSort(arr, pivot+1, high)',
  ],
};

export const AlgorithmVisualization = ({ svgData, onComplete }: AlgorithmVisualizationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const speeds = { slow: 2000, medium: 1000, fast: 500 };
  const speed = speeds[svgData.speed || 'medium'];

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (currentStep < svgData.steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
          onComplete?.();
        }
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep, svgData.steps.length, speed, onComplete]);

  const currentStepData = svgData.steps[currentStep];
  const maxValue = Math.max(...svgData.input_array);
  const barWidth = 60;
  const barGap = 10;
  const chartHeight = 300;

  const getBarColor = (index: number): string => {
    if (currentStepData.sorted?.includes(index)) {
      return 'hsl(var(--primary))';
    }
    if (currentStepData.compare?.includes(index)) {
      return 'hsl(var(--destructive))';
    }
    if (currentStepData.highlight?.includes(index)) {
      return 'hsl(var(--accent-foreground))';
    }
    return 'hsl(var(--muted-foreground))';
  };

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleNext = () => {
    if (currentStep < svgData.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualization */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2 capitalize">
                {svgData.algorithm.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {svgData.steps.length}
                {currentStepData.compare && ` - Comparing indices ${currentStepData.compare[0]} and ${currentStepData.compare[1]}`}
                {currentStepData.swap && ' - Swapping!'}
              </p>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end justify-center gap-2 h-80 border border-border rounded-lg bg-accent/10 p-4">
              {currentStepData.array_state.map((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                
                return (
                  <motion.div
                    key={index}
                    className="relative flex flex-col items-center"
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-xs font-bold mb-1">{value}</span>
                    <motion.div
                      style={{
                        width: barWidth,
                        height: barHeight,
                        backgroundColor: getBarColor(index),
                      }}
                      className="rounded-t transition-colors duration-300"
                      animate={{
                        scale: currentStepData.compare?.includes(index) ? 1.1 : 1,
                      }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">{index}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Button onClick={handlePrev} size="sm" variant="outline" disabled={currentStep === 0}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button onClick={handlePlay} size="sm">
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
                      setIsPlaying(false);
                    }}
                  />
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted-foreground))' }} />
                  <span>Unsorted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                  <span>Comparing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                  <span>Sorted</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Pseudocode Panel */}
        {svgData.show_pseudocode && PSEUDOCODE[svgData.algorithm] && (
          <div>
            <Card className="p-4">
              <h4 className="font-bold mb-3">Pseudocode</h4>
              <pre className="text-xs font-mono space-y-1">
                {PSEUDOCODE[svgData.algorithm].map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-1 rounded transition-colors ${
                      idx === Math.floor(currentStep / 2) % PSEUDOCODE[svgData.algorithm].length
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </Card>

            {/* Array State */}
            <Card className="p-4 mt-4">
              <h4 className="font-bold mb-2">Current Array</h4>
              <div className="font-mono text-sm">
                [{currentStepData.array_state.join(', ')}]
              </div>
            </Card>

            {/* Statistics */}
            <Card className="p-4 mt-4">
              <h4 className="font-bold mb-2">Statistics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Array Size:</span>
                  <span className="font-semibold">{svgData.input_array.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comparisons:</span>
                  <span className="font-semibold">
                    {svgData.steps.filter(s => s.compare).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Swaps:</span>
                  <span className="font-semibold">
                    {svgData.steps.filter(s => s.swap).length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
