import { useMemo } from 'react';
import RealisticGrassPatches from './RealisticFlora';

// Deterministic pseudo-random in [0,1) — same trick used for tree/leaf
// scatter, so the floor looks the same on every render/reload.
function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const GRASS_COLORS = ['#7FA050', '#6B8F47', '#8AA85C', '#5C7D3D'];
const LEAF_LITTER_COLORS = ['#B8863E', '#C9A15A', '#9A7038', '#D4B26A'];
const BUSH_COLORS = ['#4E7A3D', '#5C8A47', '#3D6B33'];
const BG_TRUNK_COLOR = '#5C4632';
const BG_CANOPY_COLORS = ['#3E6B36', '#4E7A42', '#356030', '#2E5A2A'];
const ROCK_COLOR = '#A79A87';
const CLEARING_RADIUS = 13;

function GrassTuft({ position, rotation, scale, color }) {
  // Three thin blades fanned from one root, not one lonely spike — reads
  // as an actual tuft of grass instead of a stray thorn.
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[-0.35, 0, 0.35].map((lean, i) => (
        <mesh key={i} position={[lean * 0.18, 0.5, 0]} rotation={[lean * 0.9, 0, lean * 0.5]}>
          <coneGeometry args={[0.09, 1, 4]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Bush({ position, scale, colorSet }) {
  // A squat cluster of leaf blobs at ground level — undergrowth, distinct
  // from a tree's canopy which sits high on a trunk.
  const blobs = useMemo(() => {
    const list = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 0.22 + hash(i * 3.1 + position[0] * 7 + position[2] * 5) * 0.1;
      list.push({
        position: [Math.cos(a) * r, 0.18 + hash(i + 2) * 0.12, Math.sin(a) * r],
        scale: 0.22 + hash(i + 5) * 0.1,
        color: colorSet[i % colorSet.length],
      });
    }
    return list;
  }, [position]);

  return (
    <group position={position} scale={scale}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.position} scale={b.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={b.color} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

function BackgroundTree({ position, scale, trunkHeight }) {
  // Cheap, non-interactive silhouette — no branches or blooms, just
  // enough shape to read as "forest" beyond the clearing. Fog does the
  // rest of the work fading it into the distance.
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.16, trunkHeight, 6]} />
        <meshStandardMaterial color={BG_TRUNK_COLOR} roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            (hash(i + position[0]) - 0.5) * 0.5,
            trunkHeight + 0.3 + i * 0.35,
            (hash(i + position[2]) - 0.5) * 0.5,
          ]}
          scale={0.7 - i * 0.12}
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={BG_CANOPY_COLORS[(i + Math.floor(position[0])) % BG_CANOPY_COLORS.length]} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Scatters ambient ground detail across the whole clearing, and rings it
// with a wall of background trees + undergrowth so the Grove reads as a
// clearing IN a forest, not a decorated lot sitting on its own.
export default function ForestFloor() {
  const grass = useMemo(() => {
    const list = [];
    for (let i = 0; i < 220; i++) {
      const s = i * 17.31;
      const r = Math.sqrt(hash(s)) * CLEARING_RADIUS;
      const theta = hash(s + 1) * Math.PI * 2;
      list.push({
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: hash(s + 2) * Math.PI * 2,
        scale: 0.35 + hash(s + 3) * 0.35,
        color: GRASS_COLORS[Math.floor(hash(s + 4) * GRASS_COLORS.length)],
      });
    }
    return list;
  }, []);

  const litter = useMemo(() => {
    const list = [];
    for (let i = 0; i < 70; i++) {
      const s = i * 29.7 + 500;
      const r = Math.sqrt(hash(s)) * CLEARING_RADIUS;
      const theta = hash(s + 1) * Math.PI * 2;
      list.push({
        position: [Math.cos(theta) * r, 0.01, Math.sin(theta) * r],
        rotation: hash(s + 2) * Math.PI * 2,
        scale: [0.05 + hash(s + 3) * 0.04, 0.015, 0.035 + hash(s + 4) * 0.03],
        color: LEAF_LITTER_COLORS[Math.floor(hash(s + 5) * LEAF_LITTER_COLORS.length)],
      });
    }
    return list;
  }, []);

  const rocks = useMemo(() => {
    const list = [];
    for (let i = 0; i < 26; i++) {
      const s = i * 41.3 + 1000;
      const r = Math.sqrt(hash(s)) * CLEARING_RADIUS;
      const theta = hash(s + 1) * Math.PI * 2;
      const scale = 0.05 + hash(s + 2) * 0.07;
      list.push({
        position: [Math.cos(theta) * r, scale * 0.35, Math.sin(theta) * r],
        scale: [scale, scale * (0.55 + hash(s + 3) * 0.3), scale],
        rotation: hash(s + 4) * Math.PI * 2,
      });
    }
    return list;
  }, []);

  const bushes = useMemo(() => {
    const list = [];
    for (let i = 0; i < 16; i++) {
      const s = i * 53.9 + 1500;
      const r = 2.5 + hash(s) * (CLEARING_RADIUS - 2.5);
      const theta = hash(s + 1) * Math.PI * 2;
      list.push({
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        scale: 0.7 + hash(s + 2) * 0.5,
      });
    }
    return list;
  }, []);

  // Real grass-patch clumps, spread across the whole clearing on the same
  // radial distribution as the procedural grass tufts — heavier per
  // instance (~210k vertices) than any other prop here, so the count stays
  // well short of "one per procedural tuft" to keep frame rate sane.
  const grassPatches = useMemo(() => {
    const list = [];
    for (let i = 0; i < 18; i++) {
      const s = i * 71.3 + 4000;
      const r = Math.sqrt(hash(s)) * CLEARING_RADIUS;
      const theta = hash(s + 1) * Math.PI * 2;
      list.push({
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        rotation: hash(s + 2) * Math.PI * 2,
        scaleVariance: 0.8 + hash(s + 3) * 0.5,
      });
    }
    return list;
  }, []);

  // A ring of background trees just past the clearing's edge, thick
  // enough that you can't see "off the edge of the world" — bleeds into
  // the fog by ~radius 22.
  const treeLine = useMemo(() => {
    const list = [];
    for (let i = 0; i < 70; i++) {
      const s = i * 12.7 + 2000;
      const r = CLEARING_RADIUS + 1 + hash(s) * 9;
      const theta = hash(s + 1) * Math.PI * 2;
      list.push({
        position: [Math.cos(theta) * r, 0, Math.sin(theta) * r],
        scale: 0.8 + hash(s + 2) * 0.9,
        trunkHeight: 1.4 + hash(s + 3) * 1.2,
      });
    }
    return list;
  }, []);

  return (
    <group>
      {grass.map((g, i) => (
        <GrassTuft key={`g${i}`} position={g.position} rotation={g.rotation} scale={g.scale} color={g.color} />
      ))}
      {litter.map((l, i) => (
        <mesh key={`l${i}`} position={l.position} rotation={[-Math.PI / 2, 0, l.rotation]} scale={l.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={l.color} roughness={1} />
        </mesh>
      ))}
      {rocks.map((r, i) => (
        <mesh key={`r${i}`} position={r.position} rotation={[0, r.rotation, 0]} scale={r.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={ROCK_COLOR} roughness={0.95} />
        </mesh>
      ))}
      {bushes.map((b, i) => (
        <Bush key={`b${i}`} position={b.position} scale={b.scale} colorSet={BUSH_COLORS} />
      ))}
      <RealisticGrassPatches items={grassPatches} />
      {treeLine.map((t, i) => (
        <BackgroundTree key={`t${i}`} position={t.position} scale={t.scale} trunkHeight={t.trunkHeight} />
      ))}
    </group>
  );
}
