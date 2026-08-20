import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FIELD = 22; // matches the Grove clearing's rough radius (see ForestFloor)
const CEILING = 14;

// Per-kind falling-particle tuning — thunderstorm is rain turned up (more
// drops, faster fall). Blizzard is snow with the fall speed pulled WAY down
// and the sideways sway pushed way up, so it reads as snow driven sideways
// by wind rather than just falling fast — "blowing snow", not "heavy snow".
const PRECIP_PARAMS = {
  rain: { count: 260, speed: 9, sway: 0, color: '#CFE0EA', size: 0.05, opacity: 0.55 },
  thunderstorm: { count: 380, speed: 13, sway: 0.15, color: '#C7D9E6', size: 0.055, opacity: 0.6 },
  snow: { count: 160, speed: 1.1, sway: 0.6, color: '#FFFFFF', size: 0.09, opacity: 0.85 },
  blizzard: { count: 320, speed: 1.4, sway: 3.2, color: '#FFFFFF', size: 0.1, opacity: 0.95 },
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
      if (y < 0) y = CEILING;
      posAttr.array[i * 3 + 1] = y;
      if (sway) {
        // Bounded and wrapped, not just accumulated — at blizzard's much
        // stronger sway this would otherwise drift every flake clean off
        // the field within seconds instead of reading as wind-driven snow.
        let x = posAttr.array[i * 3] + drift[i] * delta;
        if (x > FIELD) x = -FIELD;
        if (x < -FIELD) x = FIELD;
        posAttr.array[i * 3] = x;
      }
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

// A cluster of overlapping blobs forming one puffy cloud mass — same
// technique as Bush/leaf-canopy scatter elsewhere in the Grove. `anvil`
// stacks the blobs into a taller column with a wide flattened cap, echoing
// a cumulonimbus's towering-mountain-with-a-flat-top silhouette for the
// thunderstorm case specifically; every other category is just a low,
// wide puff.
function CloudCluster({ scale, color, anvil }) {
  const blobs = useMemo(() => {
    const list = [];
    const n = anvil ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.5 + hash(i * 3.1 + (anvil ? 500 : 0)) * 0.4;
      list.push({
        position: [Math.cos(a) * r, anvil ? i * 0.22 : hash(i + 3) * 0.3, Math.sin(a) * r * 0.6],
        scale: 0.7 + hash(i + 9) * 0.4,
      });
    }
    if (anvil) {
      // The flattened top a real cumulonimbus spreads into once it hits
      // the upper atmosphere — wider and squashed, sitting above the rest.
      list.push({ position: [0, n * 0.22 + 0.15, 0], scale: 1.7, flat: true });
    }
    return list;
  }, [anvil]);

  return (
    <group scale={scale}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.position} scale={b.flat ? [b.scale, b.scale * 0.35, b.scale] : b.scale}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const CLOUD_PARAMS = {
  cloudy: { count: 11, height: 9, spread: 20, scale: 2.2, color: '#B7BDC2', speed: 0.15 },
  rain: { count: 10, height: 8.5, spread: 20, scale: 2, color: '#8B939B', speed: 0.2 },
  // Fewer, much larger, darker, and stacked into an anvil shape — the
  // "massive towering cloud... dark threatening base" look, distinct at a
  // glance from the flatter overcast/rain cloud decks.
  thunderstorm: { count: 6, height: 7.5, spread: 18, scale: 3.6, color: '#3E444C', speed: 0.12, anvil: true },
  snow: { count: 9, height: 9, spread: 20, scale: 2, color: '#D8DDE0', speed: 0.15 },
  blizzard: { count: 9, height: 8, spread: 18, scale: 2.4, color: '#C3CBD1', speed: 0.18 },
};

// A drifting deck of cloud clusters overhead — actual geometry blocking the
// sky, not just a color tint, for anything where clouds are meant to be the
// visible cause (cloudy/rain/thunderstorm) or at least plausible (snow/
// blizzard forms from clouds too). Sunny/fog/windy skip this — nothing
// overhead in those.
function CloudCeiling({ weather }) {
  const params = CLOUD_PARAMS[weather];
  const clouds = useMemo(() => {
    if (!params) return [];
    return Array.from({ length: params.count }, (_, i) => ({
      z: (hash(i + 700) - 0.5) * params.spread * 2,
      baseX: (hash(i + 800) - 0.5) * params.spread * 2,
      y: params.height + hash(i + 900) * 1.5,
      scale: params.scale * (0.7 + hash(i + 950) * 0.6),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather]);
  const groupRefs = useRef([]);

  useFrame((state) => {
    if (!params) return;
    const t = state.clock.elapsedTime;
    const span = params.spread * 2;
    clouds.forEach((c, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      let x = c.baseX + t * params.speed;
      x -= Math.floor((x + params.spread) / span) * span;
      g.position.set(x, c.y, c.z);
    });
  });

  if (!params) return null;
  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} ref={(el) => (groupRefs.current[i] = el)} position={[c.baseX, c.y, c.z]}>
          <CloudCluster scale={c.scale} color={params.color} anvil={Boolean(params.anvil)} />
        </group>
      ))}
    </group>
  );
}

const BOLT_POINTS = 10;
const BOLT_TOP_Y = 9;
const MAX_LIGHT_INTENSITY = 9;

// A jagged fork from cloud-height down to the ground, in place rather than
// a fresh geometry each strike — mutating the same buffer (same pattern as
// Precipitation above) avoids leaking a new BufferAttribute/GPU buffer on
// every single flash, which would add up over a long thunderstorm session.
function writeBoltPoints(array, originX, originZ) {
  let x = originX;
  for (let i = 0; i < BOLT_POINTS; i++) {
    const y = BOLT_TOP_Y * (1 - i / (BOLT_POINTS - 1));
    array[i * 3] = x;
    array[i * 3 + 1] = y;
    array[i * 3 + 2] = originZ;
    x += (Math.random() - 0.5) * 0.8;
  }
}

// Three coordinated pieces, all driven by one flash timer: an overhead
// point light (ambient glow on the scene), a visible jagged bolt geometry
// positioned freshly each strike, and a plane stuck directly in front of
// the camera that washes the view toward white — a single point light
// alone barely reads as lightning; the whole-view flash is what actually
// sells "the sky just lit up". Real strikes often flicker 2-3 times in
// quick succession rather than one clean flash — occasionally schedules a
// smaller second flicker ~100-250ms after the first for the same reason.
function Lightning() {
  const lightRef = useRef();
  const boltRef = useRef();
  const flashPlaneRef = useRef();
  const sinceFlash = useRef(0);
  const nextFlash = useRef(1.5 + Math.random() * 3);
  const boltVisibleUntil = useRef(-1);
  const flicker = useRef(null);
  const { camera } = useThree();
  const camDir = useRef(new THREE.Vector3());
  const boltPositions = useMemo(() => new Float32Array(BOLT_POINTS * 3), []);

  const strike = (intensity, t) => {
    if (lightRef.current) lightRef.current.intensity = intensity;
    boltVisibleUntil.current = t + 0.1;
    writeBoltPoints(boltPositions, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
    if (boltRef.current) boltRef.current.geometry.attributes.position.needsUpdate = true;
  };

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    sinceFlash.current += delta;

    if (sinceFlash.current > nextFlash.current) {
      sinceFlash.current = 0;
      nextFlash.current = 2 + Math.random() * 5;
      strike(MAX_LIGHT_INTENSITY, t);
      flicker.current = Math.random() < 0.5 ? { at: t + 0.1 + Math.random() * 0.15, done: false } : null;
    } else if (flicker.current && !flicker.current.done && t >= flicker.current.at) {
      flicker.current.done = true;
      strike(MAX_LIGHT_INTENSITY * 0.6, t);
    } else if (lightRef.current && lightRef.current.intensity > 0) {
      lightRef.current.intensity = Math.max(0, lightRef.current.intensity - delta * 20);
    }

    if (boltRef.current) boltRef.current.visible = t < boltVisibleUntil.current;

    if (flashPlaneRef.current) {
      const amount = lightRef.current ? Math.min(1, lightRef.current.intensity / MAX_LIGHT_INTENSITY) : 0;
      camera.getWorldDirection(camDir.current);
      flashPlaneRef.current.position.copy(camera.position).addScaledVector(camDir.current, 2);
      flashPlaneRef.current.quaternion.copy(camera.quaternion);
      flashPlaneRef.current.material.opacity = amount * 0.55;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={[0, 13, 0]} intensity={0} color="#EAF0FF" distance={45} />
      <line ref={boltRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={BOLT_POINTS} array={boltPositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#F5F8FF" toneMapped={false} />
      </line>
      <mesh ref={flashPlaneRef} renderOrder={999}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#EAF0FF" transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function WeatherEffects({ weather }) {
  if (weather === 'cloudy') return <CloudCeiling weather={weather} />;
  if (weather === 'rain' || weather === 'snow' || weather === 'blizzard') {
    return (
      <>
        <CloudCeiling weather={weather} />
        <Precipitation kind={weather} />
      </>
    );
  }
  if (weather === 'thunderstorm') {
    return (
      <>
        <CloudCeiling weather={weather} />
        <Precipitation kind="thunderstorm" />
        <Lightning />
      </>
    );
  }
  if (weather === 'windy') return <WindDebris />;
  // sunny/fog/clear are purely the sky/fog/light tint from getSkyColors —
  // nothing rendered here.
  return null;
}
