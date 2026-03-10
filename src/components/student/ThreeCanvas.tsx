import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

const FloatingShape = ({
  position,
  color,
  size = 1,
  speed = 1,
  distort = 0.3,
  shape = 'sphere',
}: {
  position: [number, number, number];
  color: string;
  size?: number;
  speed?: number;
  distort?: number;
  shape?: 'sphere' | 'torus' | 'octahedron';
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1 * speed;
      meshRef.current.rotation.y += delta * 0.15 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={1.5} floatingRange={[-0.5, 0.5]}>
      <mesh ref={meshRef} position={position}>
        {shape === 'sphere' && <sphereGeometry args={[size, 32, 32]} />}
        {shape === 'torus' && <torusGeometry args={[size, size * 0.35, 16, 32]} />}
        {shape === 'octahedron' && <octahedronGeometry args={[size]} />}
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.15}
          distort={distort}
          speed={2}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
};

const Scene = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 5, 5]} intensity={0.4} />
    <FloatingShape position={[-4, 2, -5]} color="#3b82f6" size={1.2} speed={0.8} shape="sphere" />
    <FloatingShape position={[4, -1, -6]} color="#8b5cf6" size={0.9} speed={1.2} shape="torus" />
    <FloatingShape position={[-2, -2, -4]} color="#06b6d4" size={0.7} speed={0.6} shape="octahedron" />
    <FloatingShape position={[3, 3, -7]} color="#3b82f6" size={1.5} speed={0.5} distort={0.4} shape="sphere" />
    <FloatingShape position={[-5, 0, -8]} color="#a78bfa" size={1} speed={0.9} shape="torus" />
    <FloatingShape position={[1, -3, -5]} color="#22d3ee" size={0.6} speed={1.1} shape="octahedron" />
    <FloatingShape position={[5, 1, -9]} color="#6366f1" size={1.3} speed={0.7} distort={0.5} shape="sphere" />
  </>
);

const ThreeCanvas = () => (
  <Canvas
    dpr={[1, 1.5]}
    camera={{ position: [0, 0, 5], fov: 60 }}
    style={{ background: 'transparent' }}
    gl={{ alpha: true, antialias: true }}
  >
    <Scene />
  </Canvas>
);

export default ThreeCanvas;
