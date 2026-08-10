import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// A single drifting, pulsing glow near the ground — night-only ambience,
// distinct from the daytime AmbientLife birds/butterflies.
function Firefly({ seed }) {
  const ref = useRef();
  const p = useMemo(
    () => ({
      centerX: (hash(seed) - 0.5) * 20,
      centerZ: (hash(seed + 1) - 0.5) * 20,
      radius: 0.6 + hash(seed + 2) * 1.8,
      height: 0.25 + hash(seed + 3) * 0.9,
      speed: 0.15 + hash(seed + 4) * 0.2,
      phase: hash(seed + 5) * Math.PI * 2,
      pulsePhase: hash(seed + 6) * Math.PI * 2,
    }),
    [seed]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime * p.speed + p.phase;
    if (ref.current) {
      ref.current.position.set(
        p.centerX + Math.cos(t) * p.radius,
        p.height + Math.sin(t * 2.2) * 0.15,
        p.centerZ + Math.sin(t * 1.3) * p.radius
      );
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 3 + p.pulsePhase) * 0.5;
      ref.current.material.emissiveIntensity = 0.6 + pulse * 1.4;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.02, 6, 6]} />
      <meshStandardMaterial color="#FFF3B0" emissive="#FFE788" emissiveIntensity={1} />
    </mesh>
  );
}

export default function Fireflies() {
  const seeds = useMemo(() => Array.from({ length: 16 }, (_, i) => i * 23.7 + 700), []);
  return (
    <group>
      {seeds.map((s) => (
        <Firefly key={s} seed={s} />
      ))}
    </group>
  );
}
