import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FIELD = 22; // matches the Grove clearing's rough radius (see ForestFloor)
const CEILING = 14;

// Per-kind falling-particle tuning — thunderstorm is rain turned up (more
// drops, faster fall), blizzard is snow turned up (more flakes, faster
// fall, wider sideways sway) rather than a distinct system.
const PRECIP_PARAMS = {
  rain: { count: 260, speed: 9, sway: 0, color: '#CFE0EA', size: 0.05, opacity: 0.55 },
  thunderstorm: { count: 380, speed: 13, sway: 0.15, color: '#C7D9E6', size: 0.055, opacity: 0.6 },
  snow: { count: 160, speed: 1.1, sway: 0.6, color: '#FFFFFF', size: 0.09, opacity: 0.85 },
  blizzard: { count: 280, speed: 2.6, sway: 1.4, color: '#FFFFFF', size: 0.1, opacity: 0.9 },
};

// A falling-particle layer for rain/snow/thunderstorm/blizzard — one mutated
// THREE.Points buffer rather than one mesh per drop (the Fireflies pattern)
// — that tops out well under 300 instances before costing real frame time,
// and this needs more particles than fireflies ever did to read as weather
// instead of a few stray dots.
function Precipitation({ kind }) {
  const { count, speed, sway, color, size, opacity } = PRECIP_PARAMS[kind];

  const [positions, drift] = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (hash(i) - 0.5) * FIELD * 2;
      arr[i * 3 + 1] = hash(i + 50) * CEILING;
      arr[i * 3 + 2] = (hash(i + 100) - 0.5) * FIELD * 2;
    }
    const s = Array.from({ length: count }, (_, i) => (hash(i + 200) - 0.5) * sway);
    return [arr, s];
  }, [count, sway]);

  const pointsRef = useRef();

  useFrame((_, delta) => {
    const posAttr = pointsRef.current?.geometry.attributes.position;
    if (!posAttr) return;
    for (let i = 0; i < count; i++) {
      let y = posAttr.array[i * 3 + 1] - speed * delta;
      if (sway) posAttr.array[i * 3] += drift[i] * delta;
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
      <pointsMaterial color={color} size={size} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// Loose dust/leaf debris drifting sideways across the clearing at ground-ish
// height, rather than falling — the visual signature of "windy" (see also
// the sky's own dusty tint in getSkyColors) with nothing actually falling
// from the sky. Colored per-particle from a leaf-ish palette (matching the
// canopy colors in Tree.jsx) rather than one flat dust tone, and bobbing
// up and down as it crosses — reads as tumbling leaves, not a sandstorm.
const DEBRIS_COLORS = [
  [0.42, 0.56, 0.28], // '#6B8F47'
  [0.5, 0.63, 0.31], // '#7FA050'
  [0.72, 0.66, 0.36], // dry leaf tan
  [0.79, 0.55, 0.24], // '#C98A2E'-ish
];

function WindDebris() {
  const count = 90;
  const [positions, colors, bobSeeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const bob = new Float32Array(count * 2); // [phase, speed] per particle
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (hash(i) - 0.5) * FIELD * 2;
      pos[i * 3 + 1] = 0.15 + hash(i + 50) * 1.6;
      pos[i * 3 + 2] = (hash(i + 100) - 0.5) * FIELD * 2;
      const c = DEBRIS_COLORS[Math.floor(hash(i + 400) * DEBRIS_COLORS.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
      bob[i * 2] = hash(i + 500) * Math.PI * 2;
      bob[i * 2 + 1] = 2 + hash(i + 600) * 2;
    }
    return [pos, col, bob];
  }, []);
  const speeds = useMemo(() => Array.from({ length: count }, (_, i) => 3 + hash(i + 300) * 3), []);
  const baseHeights = useMemo(() => Array.from({ length: count }, (_, i) => 0.15 + hash(i + 50) * 1.6), []);
  const pointsRef = useRef();

  useFrame((state, delta) => {
    const posAttr = pointsRef.current?.geometry.attributes.position;
    if (!posAttr) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let x = posAttr.array[i * 3] + speeds[i] * delta;
      if (x > FIELD) x = -FIELD;
      posAttr.array[i * 3] = x;
      posAttr.array[i * 3 + 1] = baseHeights[i] + Math.sin(t * bobSeeds[i * 2 + 1] + bobSeeds[i * 2]) * 0.2;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.07} transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// A bright, fast-decaying point light overhead firing at random intervals —
// cheap and reads as lightning without any actual bolt geometry, which
// would need a lot more work to look right than a flash does.
function Lightning() {
  const lightRef = useRef();
  const sinceFlash = useRef(0);
  const nextFlash = useRef(2 + Math.random() * 4);

  useFrame((_, delta) => {
    sinceFlash.current += delta;
    if (sinceFlash.current > nextFlash.current) {
      sinceFlash.current = 0;
      nextFlash.current = 3 + Math.random() * 7;
      if (lightRef.current) lightRef.current.intensity = 7;
    } else if (lightRef.current && lightRef.current.intensity > 0) {
      lightRef.current.intensity = Math.max(0, lightRef.current.intensity - delta * 14);
    }
  });

  return <pointLight ref={lightRef} position={[0, 13, 0]} intensity={0} color="#EAF0FF" distance={45} />;
}

export default function WeatherEffects({ weather }) {
  if (weather === 'rain' || weather === 'snow' || weather === 'blizzard') {
    return <Precipitation kind={weather} />;
  }
  if (weather === 'thunderstorm') {
    return (
      <>
        <Precipitation kind="thunderstorm" />
        <Lightning />
      </>
    );
  }
  if (weather === 'windy') return <WindDebris />;
  // overcast/fog/haze/clear are purely the sky/fog/light tint from
  // getSkyColors — nothing rendered here.
  return null;
}
