import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Atom {
  element: string;
  position: [number, number, number];
  color: string;
}

interface Bond {
  from: number;
  to: number;
  type: 'single' | 'double' | 'triple';
}

interface ChemistryMoleculeData {
  molecule: string;
  atoms: Atom[];
  bonds: Bond[];
  rotation_enabled?: boolean;
}

interface ChemistryMoleculeAnimationProps {
  svgData: ChemistryMoleculeData;
  onComplete?: () => void;
}

export const ChemistryMoleculeAnimation = ({ svgData }: ChemistryMoleculeAnimationProps) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const width = 600;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 80;

  // Project 3D to 2D with rotation
  const project3D = (atom: Atom): [number, number] => {
    const [x, y, z] = atom.position;
    
    // Rotate around Y axis
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    
    // Rotate around X axis
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    
    // Perspective projection
    const perspective = 1000;
    const scaleFactor = perspective / (perspective + z2 * scale);
    
    return [
      centerX + x1 * scale * scaleFactor,
      centerY + y1 * scale * scaleFactor
    ];
  };

  const getAtomRadius = (element: string): number => {
    const sizes: Record<string, number> = {
      'H': 12,
      'C': 18,
      'N': 16,
      'O': 16,
      'S': 20,
      'P': 19,
      'F': 14,
      'Cl': 18,
    };
    return sizes[element] || 15;
  };

  const renderBond = (bond: Bond) => {
    const atom1 = svgData.atoms[bond.from];
    const atom2 = svgData.atoms[bond.to];
    
    const [x1, y1] = project3D(atom1);
    const [x2, y2] = project3D(atom2);

    const offset = bond.type !== 'single' ? 3 : 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length * offset;
    const perpY = dx / length * offset;

    return (
      <g key={`${bond.from}-${bond.to}`}>
        <line
          x1={x1 + (bond.type === 'double' || bond.type === 'triple' ? perpX : 0)}
          y1={y1 + (bond.type === 'double' || bond.type === 'triple' ? perpY : 0)}
          x2={x2 + (bond.type === 'double' || bond.type === 'triple' ? perpX : 0)}
          y2={y2 + (bond.type === 'double' || bond.type === 'triple' ? perpY : 0)}
          stroke="hsl(var(--foreground))"
          strokeWidth="3"
          opacity="0.6"
        />
        {(bond.type === 'double' || bond.type === 'triple') && (
          <line
            x1={x1 - perpX}
            y1={y1 - perpY}
            x2={x2 - perpX}
            y2={y2 - perpY}
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            opacity="0.6"
          />
        )}
        {bond.type === 'triple' && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            opacity="0.6"
          />
        )}
      </g>
    );
  };

  const handleDrag = (_: any, info: { delta: { x: number; y: number } }) => {
    if (svgData.rotation_enabled) {
      setRotation(prev => ({
        x: prev.x + info.delta.y * 0.01,
        y: prev.y + info.delta.x * 0.01,
      }));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{svgData.molecule}</h3>
            <p className="text-sm text-muted-foreground">
              {svgData.rotation_enabled ? 'Drag to rotate the molecule' : 'Molecular structure'}
            </p>
          </div>
          <Badge variant="secondary">3D View</Badge>
        </div>

        {/* 3D Molecule Viewer */}
        <motion.svg
          width={width}
          height={height}
          className="border border-border rounded-lg bg-accent/10 cursor-grab active:cursor-grabbing"
          drag={svgData.rotation_enabled}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onDrag={handleDrag}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0}
        >
          {/* Render bonds first (behind atoms) */}
          {svgData.bonds.map((bond, idx) => (
            <g key={idx}>{renderBond(bond)}</g>
          ))}

          {/* Render atoms */}
          {svgData.atoms.map((atom, idx) => {
            const [x, y] = project3D(atom);
            const radius = getAtomRadius(atom.element);

            return (
              <motion.g
                key={idx}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                {/* Atom sphere with gradient */}
                <defs>
                  <radialGradient id={`gradient-${idx}`}>
                    <stop offset="0%" stopColor={atom.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={atom.color} stopOpacity="0.6" />
                  </radialGradient>
                </defs>
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={`url(#gradient-${idx})`}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                  opacity="0.9"
                />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  className="text-sm font-bold"
                  fill="hsl(var(--background))"
                >
                  {atom.element}
                </text>
              </motion.g>
            );
          })}
        </motion.svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from(new Set(svgData.atoms.map(a => a.element))).map(element => {
            const atom = svgData.atoms.find(a => a.element === element)!;
            return (
              <div key={element} className="flex items-center gap-2 text-sm">
                <div
                  className="w-4 h-4 rounded-full border-2 border-foreground"
                  style={{ backgroundColor: atom.color }}
                />
                <span>{element}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
