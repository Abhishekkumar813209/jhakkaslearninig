import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Check, RotateCcw } from 'lucide-react';

interface Variable {
  name: string;
  min: number;
  max: number;
  default: number;
  unit: string;
}

interface PhysicsSimulatorData {
  title: string;
  variables: Variable[];
  graph_type: string;
  target_graph?: string;
  challenge?: string;
}

interface PhysicsSimulatorProps {
  gameData: PhysicsSimulatorData;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: () => void;
}

export const PhysicsSimulator = ({ gameData, onCorrect, onWrong, onComplete }: PhysicsSimulatorProps) => {
  const [values, setValues] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [isMatched, setIsMatched] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Initialize with default values
    const initialValues: Record<string, number> = {};
    gameData.variables.forEach(v => {
      initialValues[v.name] = v.default;
    });
    setValues(initialValues);
  }, [gameData]);

  useEffect(() => {
    // Generate chart data based on current values
    generateChartData();
  }, [values]);

  const generateChartData = () => {
    if (gameData.graph_type === 'trajectory') {
      // Projectile motion calculation
      const velocity = values.velocity || 20;
      const angle = values.angle || 45;
      const angleRad = (angle * Math.PI) / 180;
      const g = 9.8;

      const vx = velocity * Math.cos(angleRad);
      const vy = velocity * Math.sin(angleRad);
      const totalTime = (2 * vy) / g;
      const points = 50;

      const data = [];
      for (let i = 0; i <= points; i++) {
        const t = (totalTime * i) / points;
        const x = vx * t;
        const y = vy * t - 0.5 * g * t * t;
        
        if (y >= 0) {
          data.push({
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
          });
        }
      }
      setChartData(data);
    } else if (gameData.graph_type === 'linear') {
      // Simple linear relationship
      const data = [];
      for (let i = 0; i <= 100; i += 10) {
        const y = (values[gameData.variables[0].name] || 1) * i;
        data.push({ x: i, y });
      }
      setChartData(data);
    }
  };

  const handleVariableChange = (varName: string, newValue: number[]) => {
    setValues(prev => ({ ...prev, [varName]: newValue[0] }));
  };

  const handleReset = () => {
    const resetValues: Record<string, number> = {};
    gameData.variables.forEach(v => {
      resetValues[v.name] = v.default;
    });
    setValues(resetValues);
    setIsMatched(false);
  };

  const handleCheckMatch = () => {
    setAttempts(prev => prev + 1);
    
    // Simplified matching logic - check if values are close to target
    // In real implementation, compare with target_graph data
    const velocity = values.velocity || 20;
    const angle = values.angle || 45;
    
    // Example: target is 45° and 30 m/s
    const targetVelocity = 30;
    const targetAngle = 45;
    
    const velocityMatch = Math.abs(velocity - targetVelocity) < 2;
    const angleMatch = Math.abs(angle - targetAngle) < 2;
    
    if (velocityMatch && angleMatch) {
      setIsMatched(true);
      onCorrect();
      setTimeout(() => onComplete(), 2000);
    } else {
      onWrong();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Title */}
      <h2 className="text-2xl font-bold mb-6 text-center">{gameData.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4">Variables</h3>
            
            {gameData.variables.map(variable => (
              <div key={variable.name} className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium capitalize">
                    {variable.name}
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {values[variable.name]?.toFixed(1) || variable.default} {variable.unit}
                  </span>
                </div>
                <Slider
                  min={variable.min}
                  max={variable.max}
                  step={1}
                  value={[values[variable.name] || variable.default]}
                  onValueChange={(val) => handleVariableChange(variable.name, val)}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{variable.min}</span>
                  <span>{variable.max}</span>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full mb-3"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            {gameData.challenge && (
              <Button
                onClick={handleCheckMatch}
                className="w-full"
                disabled={isMatched}
              >
                {isMatched ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Matched!
                  </>
                ) : (
                  'Check Match'
                )}
              </Button>
            )}
          </Card>

          {gameData.challenge && (
            <Card className="p-4 bg-accent/30">
              <h4 className="font-semibold mb-2">Challenge</h4>
              <p className="text-sm text-muted-foreground">{gameData.challenge}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Attempts: {attempts}
              </p>
            </Card>
          )}
        </div>

        {/* Graph Display */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-bold mb-4">Visualization</h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="x" 
                  label={{ value: gameData.graph_type === 'trajectory' ? 'Distance (m)' : 'X', position: 'insideBottom', offset: -5 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  label={{ value: gameData.graph_type === 'trajectory' ? 'Height (m)' : 'Y', angle: -90, position: 'insideLeft' }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={false}
                  name={gameData.graph_type === 'trajectory' ? 'Trajectory' : 'Value'}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Equations Display */}
            <div className="mt-4 p-4 bg-accent/30 rounded-lg">
              <p className="font-mono text-sm">
                {gameData.graph_type === 'trajectory' && (
                  <>
                    v₀ = {values.velocity?.toFixed(1) || 20} m/s, θ = {values.angle?.toFixed(1) || 45}°
                    <br />
                    Range = {((values.velocity || 20) ** 2 * Math.sin(2 * ((values.angle || 45) * Math.PI / 180)) / 9.8).toFixed(2)} m
                    <br />
                    Max Height = {((values.velocity || 20) ** 2 * Math.sin((values.angle || 45) * Math.PI / 180) ** 2 / (2 * 9.8)).toFixed(2)} m
                  </>
                )}
              </p>
            </div>
          </Card>

          {isMatched && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-6 bg-primary/10 border border-primary rounded-lg text-center"
            >
              <Check className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold">Perfect Match!</p>
              <p className="text-sm text-muted-foreground">You've matched the target graph!</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
