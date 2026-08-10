import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Deterministic pseudo-random in [0,1) — same trick as the tree/floor scatter.
function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// CC-BY / CC-BY-SA 4.0 assets (credited in SettingsPanel's "About" section):
// "Simple_Bird" (CC-BY), "BUTTERFLY" (CC-BY), "Orchard Swallowtail",
// "Cairn's Birdwing", "Clearwing Swallowtail", "Ulysses Butterfly"
// (all CC-BY-SA) — all via Sketchfab. Each ships its own rigged "fly"
// animation, so the wingbeats are the artist's actual keyframes, not a
// hand-rolled scale/rotation hack.
const BIRD_MODEL_URL = '/models/simple-bird/scene.gltf';
const BUTTERFLY_MODEL_URLS = [
  '/models/butterfly/scene.gltf',
  '/models/orchard-swallowtail/scene.gltf',
  '/models/cairns-birdwing/scene.gltf',
  '/models/clearwing-swallowtail/scene.gltf',
  '/models/ulysses-butterfly/scene.gltf',
];

// These packs come from different artists with different native units (one
// bird pack's wingspan is ~3 "units", one butterfly's is ~125 "units", one
// is already ~0.1) — there's no single fixed scale that fits all of them.
// This measures each clone's actual bounding box once and scales it to a
// target real-world-ish size instead of trusting the source file's units.
function useNormalizedClone(url, targetSize) {
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z) || 1;
    return targetSize / largest;
  }, [cloned, targetSize]);
  return { cloned, animations, scale };
}

// Plays whichever animation clip the model ships with, at a per-instance
// speed and phase so a flock doesn't flap in perfect unison.
function AnimatedFlyer({ url, targetSize, speed, phaseOffset }) {
  const groupRef = useRef();
  const { cloned, animations, scale } = useNormalizedClone(url, targetSize);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const action = Object.values(actions)[0];
    if (!action) return;
    action.reset().play();
    action.setEffectiveTimeScale(speed);
    action.time = phaseOffset;
    return () => action.stop();
  }, [actions, speed, phaseOffset]);

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

// A bird traces a wide, slow circle high over the Grove.
function AmbientBird({ seed }) {
  const outerRef = useRef();
  const p = useMemo(
    () => ({
      radius: 7 + hash(seed) * 7,
      height: 4.2 + hash(seed + 1) * 3,
      speed: 0.09 + hash(seed + 2) * 0.07,
      phase: hash(seed + 3) * Math.PI * 2,
      animSpeed: 0.8 + hash(seed + 4) * 0.6,
      animPhase: hash(seed + 5) * 2,
    }),
    [seed]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime * p.speed + p.phase;
    const x = Math.cos(t) * p.radius;
    const z = Math.sin(t) * p.radius;
    const y = p.height + Math.sin(t * 2) * 0.4;
    if (outerRef.current) {
      outerRef.current.position.set(x, y, z);
      outerRef.current.rotation.y = -t + Math.PI / 2;
    }
  });

  return (
    <group ref={outerRef}>
      <Suspense fallback={null}>
        <AnimatedFlyer url={BIRD_MODEL_URL} targetSize={0.22} speed={p.animSpeed} phaseOffset={p.animPhase} />
      </Suspense>
    </group>
  );
}

// A butterfly loops low over the clearing in a tighter, wobblier path.
function AmbientButterfly({ seed }) {
  const outerRef = useRef();
  const p = useMemo(
    () => ({
      centerX: (hash(seed + 10) - 0.5) * 18,
      centerZ: (hash(seed + 11) - 0.5) * 18,
      radius: 1 + hash(seed) * 2.5,
      height: 0.9 + hash(seed + 1) * 2,
      speed: 0.3 + hash(seed + 2) * 0.35,
      phase: hash(seed + 3) * Math.PI * 2,
      model: BUTTERFLY_MODEL_URLS[Math.floor(hash(seed + 4) * BUTTERFLY_MODEL_URLS.length)],
      animSpeed: 1.2 + hash(seed + 5) * 1.2,
      animPhase: hash(seed + 6) * 2,
    }),
    [seed]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime * p.speed + p.phase;
    const x = p.centerX + Math.cos(t) * p.radius;
    const z = p.centerZ + Math.sin(t * 1.4) * p.radius;
    const y = p.height + Math.sin(t * 3) * 0.2;
    if (outerRef.current) {
      outerRef.current.position.set(x, y, z);
      outerRef.current.rotation.y = -t - Math.PI / 2;
    }
  });

  return (
    <group ref={outerRef}>
      <Suspense fallback={null}>
        <AnimatedFlyer url={p.model} targetSize={0.17} speed={p.animSpeed} phaseOffset={p.animPhase} />
      </Suspense>
    </group>
  );
}

// Purely decorative — never interactive, never blocks pointer events —
// just background life to keep the Grove from feeling static. Skipped
// entirely under reduced motion.
export default function AmbientLife({ reducedMotion }) {
  const birds = useMemo(() => Array.from({ length: 5 }, (_, i) => i * 37.1), []);
  const butterflies = useMemo(() => Array.from({ length: 9 }, (_, i) => i * 19.7 + 300), []);

  if (reducedMotion) return null;

  return (
    <group>
      {birds.map((seed) => (
        <AmbientBird key={seed} seed={seed} />
      ))}
      {butterflies.map((seed) => (
        <AmbientButterfly key={seed} seed={seed} />
      ))}
    </group>
  );
}
