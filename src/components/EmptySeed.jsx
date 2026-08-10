import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

// Shown instead of the Grove's trees when there are zero projects — a
// seed waiting in the soil, not a blank field. Planting the first project
// is what makes it germinate into a tree (see Tree.jsx's grow-in).
export default function EmptySeed({ onLoadExamples }) {
  const seedRef = useRef();

  useFrame((state) => {
    if (!seedRef.current) return;
    const t = state.clock.elapsedTime;
    seedRef.current.position.y = 0.16 + Math.sin(t * 1.2) * 0.02;
    seedRef.current.rotation.y = t * 0.3;
  });

  return (
    <group>
      {/* Soil mound */}
      <mesh position={[0, 0.03, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshStandardMaterial color="#B89A72" roughness={1} />
      </mesh>

      {/* Seed */}
      <mesh ref={seedRef} scale={[0.5, 0.65, 0.5]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#7A5C3E" roughness={0.6} emissive="#C9A15A" emissiveIntensity={0.15} />
      </mesh>

      <pointLight position={[0, 1, 0]} color="#FFE9B8" intensity={0.7} distance={5} decay={2} />

      <Html position={[0, 1, 0]} center distanceFactor={8} zIndexRange={[1, 0]}>
        <div
          className="glass-surface select-none whitespace-nowrap rounded-2xl px-4 py-3 text-center"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-[13px] font-semibold text-stone-800">Your Grove is empty</div>
          <div className="mt-1 text-[11px] text-stone-600">Plant your first project to watch it grow</div>
          {onLoadExamples && (
            <button
              type="button"
              onClick={onLoadExamples}
              className="mt-2 text-[10.5px] font-medium text-emerald-700 underline-offset-2 hover:underline"
              style={{ pointerEvents: 'auto' }}
            >
              Load example projects
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}
