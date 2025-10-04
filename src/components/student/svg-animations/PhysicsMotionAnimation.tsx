import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface PhysicsObject {
  type: string;
  initial_position: [number, number];
  velocity: [number, number];
  acceleration: [number, number];
}

interface Vector {
  type: string;
  color: string;
  scale: number;
}

interface PhysicsMotionData {
  scenario: string;
  objects: PhysicsObject[];
  vectors: Vector[];
  duration: number;
  steps: {
    time: number;
    description: string;
  }[];
}

interface PhysicsMotionAnimationProps {
  svgData: PhysicsMotionData;
  onComplete?: () => void;
}

export const PhysicsMotionAnimation = ({ svgData, onComplete }: PhysicsMotionAnimationProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const width = 800;
  const height = 400;

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          if (next >= svgData.duration) {
            setIsPlaying(false);
            onComplete?.();
            return svgData.duration;
          }
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, svgData.duration, onComplete]);

  useEffect(() => {
    const stepIndex = svgData.steps.findIndex((step, idx) => {
      const nextStep = svgData.steps[idx + 1];
      return currentTime >= step.time && (!nextStep || currentTime < nextStep.time);
    });
    setCurrentStepIndex(Math.max(0, stepIndex));
  }, [currentTime, svgData.steps]);

  const calculatePosition = (obj: PhysicsObject, t: number): [number, number] => {
    const [x0, y0] = obj.initial_position;
    const [vx, vy] = obj.velocity;
    const [ax, ay] = obj.acceleration;

    const x = x0 + vx * t + 0.5 * ax * t * t;
    const y = y0 + vy * t + 0.5 * ay * t * t;

    return [x, y];
  };

  const calculateVelocity = (obj: PhysicsObject, t: number): [number, number] => {
    const [vx, vy] = obj.velocity;
    const [ax, ay] = obj.acceleration;

    return [vx + ax * t, vy + ay * t];
  };

  const renderObject = (obj: PhysicsObject) => {
    const [x, y] = calculatePosition(obj, currentTime);

    if (obj.type === 'car') {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="-30" y="-15" width="60" height="30" fill="hsl(var(--primary))" rx="5" />
          <circle cx="-15" cy="15" r="8" fill="hsl(var(--foreground))" />
          <circle cx="15" cy="15" r="8" fill="hsl(var(--foreground))" />
        </g>
      );
    }

    return (
      <circle cx={x} cy={y} r="20" fill="hsl(var(--primary))" />
    );
  };

  const renderVector = (obj: PhysicsObject, vectorConfig: Vector) => {
    const [x, y] = calculatePosition(obj, currentTime);
    const [vx, vy] = vectorConfig.type === 'velocity' 
      ? calculateVelocity(obj, currentTime)
      : obj.acceleration;

    const scale = vectorConfig.scale;
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    
    if (magnitude === 0) return null;

    const endX = x + vx * scale;
    const endY = y + vy * scale;

    return (
      <g>
        <defs>
          <marker
            id={`arrow-${vectorConfig.type}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={vectorConfig.color} />
          </marker>
        </defs>
        <line
          x1={x}
          y1={y}
          x2={endX}
          y2={endY}
          stroke={vectorConfig.color}
          strokeWidth="3"
          markerEnd={`url(#arrow-${vectorConfig.type})`}
        />
        <text
          x={endX + 10}
          y={endY - 10}
          className="text-xs"
          fill={vectorConfig.color}
        >
          {vectorConfig.type}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">{svgData.scenario.replace(/_/g, ' ').toUpperCase()}</h3>
          <p className="text-muted-foreground">
            {svgData.steps[currentStepIndex]?.description || 'Physics simulation'}
          </p>
        </div>

        {/* Animation Canvas */}
        <svg width={width} height={height} className="border border-border rounded-lg bg-accent/20 mb-4">
          {/* Ground line */}
          <line
            x1="0"
            y1={height - 50}
            x2={width}
            y2={height - 50}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Render objects */}
          {svgData.objects.map((obj, idx) => (
            <motion.g
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {renderObject(obj)}
              {svgData.vectors.map((vec, vIdx) => (
                <g key={vIdx}>
                  {renderVector(obj, vec)}
                </g>
              ))}
            </motion.g>
          ))}

          {/* Time display */}
          <text x={width - 100} y={30} className="text-lg font-bold">
            t = {currentTime.toFixed(1)}s
          </text>
        </svg>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsPlaying(!isPlaying)} size="sm">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button onClick={() => { setCurrentTime(0); setIsPlaying(false); }} size="sm" variant="outline">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="flex-1 mx-4">
              <Slider
                value={[currentTime]}
                max={svgData.duration}
                step={0.1}
                onValueChange={([value]) => setCurrentTime(value)}
              />
            </div>
            <span className="text-sm text-muted-foreground min-w-[80px]">
              {currentTime.toFixed(1)}s / {svgData.duration}s
            </span>
          </div>

          {/* Vector Legend */}
          <div className="flex gap-4 text-sm">
            {svgData.vectors.map((vec, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-8 h-0.5" style={{ backgroundColor: vec.color }} />
                <span className="capitalize">{vec.type}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
