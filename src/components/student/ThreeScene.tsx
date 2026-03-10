import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const FloatingShape = ({
  position,
  geometry,
  color,
  speed,
  rotationSpeed,
}: {
  position: [number, number, number];
  geometry: 'sphere' | 'icosahedron' | 'torus' | 'octahedron';
  color: string;
  speed: number;
  rotationSpeed: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const initialY = position[1];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x += rotationSpeed * 0.002;
    meshRef.current.rotation.z += rotationSpeed * 0.001;
    meshRef.current.position.y = initialY + Math.sin(t * speed) * 0.3;
  });

  const geo = useMemo(() => {
    switch (geometry) {
      case 'sphere': return <sphereGeometry args={[0.4, 16, 16]} />;
      case 'icosahedron': return <icosahedronGeometry args={[0.45, 0]} />;
      case 'torus': return <torusGeometry args={[0.35, 0.12, 12, 24]} />;
      case 'octahedron': return <octahedronGeometry args={[0.4, 0]} />;
    }
  }, [geometry]);

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={meshRef} position={position}>
        {geo}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
          roughness={0.8}
          metalness={0.1}
          wireframe={Math.random() > 0.5}
        />
      </mesh>
    </Float>
  );
};

const shapes: {
  position: [number, number, number];
  geometry: 'sphere' | 'icosahedron' | 'torus' | 'octahedron';
  color: string;
  speed: number;
  rotationSpeed: number;
}[] = [
  { position: [-3, 1.5, -2], geometry: 'icosahedron', color: '#6366f1', speed: 0.3, rotationSpeed: 0.8 },
  { position: [3.5, -1, -3], geometry: 'torus', color: '#8b5cf6', speed: 0.25, rotationSpeed: 0.6 },
  { position: [-1.5, -2, -1.5], geometry: 'sphere', color: '#a78bfa', speed: 0.35, rotationSpeed: 1 },
  { position: [2, 2, -2.5], geometry: 'octahedron', color: '#7c3aed', speed: 0.2, rotationSpeed: 0.5 },
  { position: [0, 0, -4], geometry: 'sphere', color: '#6366f1', speed: 0.15, rotationSpeed: 0.7 },
  { position: [-4, 0, -3], geometry: 'torus', color: '#a78bfa', speed: 0.28, rotationSpeed: 0.9 },
  { position: [4, 1, -1.5], geometry: 'icosahedron', color: '#8b5cf6', speed: 0.22, rotationSpeed: 0.4 },
];

const ThreeScene = () => (
  <Canvas
    camera={{ position: [0, 0, 5], fov: 60 }}
    dpr={[1, 1.5]}
    gl={{ antialias: false, alpha: true }}
    style={{ background: 'transparent' }}
  >
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 5, 5]} intensity={0.4} />
    {shapes.map((s, i) => (
      <FloatingShape key={i} {...s} />
    ))}
  </Canvas>
);

export default ThreeScene;
