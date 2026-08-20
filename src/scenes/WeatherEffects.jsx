import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FIELD = 22; // matches the Grove clearing's rough radius (see ForestFloor)
const CEILING = 14;

// A falling-particle layer for rain/snow, shared by both since the only
// real difference is speed/size/color — one falls fast and thin, the other
// drifts down slow with a little sideways sway. A single mutated
// THREE.Points buffer rather than one mesh per drop (the Fireflies pattern)
// — that tops out well under 300 instances before costing real frame time,
// and rain/snow need more particles than fireflies ever did to read as
// weather instead of a few stray dots.
function Precipitation({ kind }) {
  const count = kind === 'snow' ? 160 : 260;
  const fallSpeed = kind === 'snow' ? 1.1 : 9;

  const [positions, drift] = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (hash(i) - 0.5) * FIELD * 2;
      arr[i * 3 + 1] = hash(i + 50) * CEILING;
      arr[i * 3 + 2] = (hash(i + 100) - 0.5) * FIELD * 2;
    }
    const sway = Array.from({ length: count }, (_, i) => (hash(i + 200) - 0.5) * 0.6);
    return [arr, sway];
  }, [count]);

  const pointsRef = useRef();

  useFrame((_, delta) => {
    const posAttr = pointsRef.current?.geometry.attributes.position;
    if (!posAttr) return;
    for (let i = 0; i < count; i++) {
      let y = posAttr.array[i * 3 + 1] - fallSpeed * delta;
      if (kind === 'snow') posAttr.array[i * 3] += drift[i] * delta;
      if (y < 0) y = CEILING;
      posAttr.array[i * 3 + 1] = y;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={kind === 'snow' ? '#FFFFFF' : '#CFE0EA'}
        size={kind === 'snow' ? 0.09 : 0.05}
        transparent
        opacity={kind === 'snow' ? 0.85 : 0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Only rain and snow get a particle layer — overcast/haze/clear are purely
// the sky/fog/light tint from getSkyColors, nothing falling.
export default function WeatherEffects({ weather }) {
  if (weather !== 'rain' && weather !== 'snow') return null;
  return <Precipitation kind={weather} />;
}
