import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import HoverPanel from './HoverPanel';
import BloomPopup from './BloomPopup';
import GerminationSpline, { GERMINATION_SCENE_URL, GERMINATION_SCENE_DURATION } from './GerminationSpline';
import { getTreeGeometry } from '../utils/treeGeometry';
import { isWithering } from '../utils/staleness';

// Visual constants only — a "tree" is the visual treatment for a project,
// a "branch" fans out from the trunk, a "bloom" is the visual treatment
// for one version. None of this touches the data model.
const TRUNK_COLOR = '#7A5C3E';
const BRANCH_COLOR = '#8B6B47';
const LEAF_COLORS = ['#6B8F47', '#7FA050', '#5C7D3D', '#8AA85C'];
// Nobody's grown a new version here in a while — dry, autumnal tones
// instead of green, the same "state you can see without clicking in"
// idea as a dimmed, still butterfly for a resolved comment.
const WITHERED_LEAF_COLORS = ['#B8934A', '#A87B3D', '#C2A25C', '#8F6B3A'];
const UP = new THREE.Vector3(0, 1, 0);

const GROWTH_DURATION = 1.1;
const SEED_DURATION = 0.7;
// Overshoots slightly past 1 then settles — reads as a sprout popping up
// out of the soil rather than a flat fade/scale-in.
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export default function Tree({
  project,
  isHovered,
  isFocused,
  onHoverStart,
  onHoverEnd,
  onSelect,
  onOpenReview,
  justPlanted,
  reducedMotion,
  showNameTag = true,
  windStrength = 0,
}) {
  const groupRef = useRef();
  const treeGroupRef = useRef();
  const seedRef = useRef();
  const bloomRefs = useRef([]);
  const pointerDownAt = useRef(null);
  const bloomPointerDownAt = useRef(null);
  const growthStart = useRef(null);
  const [hoveredBloom, setHoveredBloom] = useState(null);
  const [splineFailed, setSplineFailed] = useState(false);
  const useSplineGermination = Boolean(GERMINATION_SCENE_URL) && !splineFailed;

  const { idSeed, trunkHeight, branches, bloomLocalPositions } = useMemo(
    () => getTreeGeometry(project),
    [project]
  );
  const withering = isWithering(project);
  const leafPalette = withering ? WITHERED_LEAF_COLORS : LEAF_COLORS;

  // Scatter small leaf blobs around every branch tip to form a canopy.
  // Bloom positions sit further out (see treeGeometry.js) so they poke
  // past this radius, but we also drop any leaf that happens to land too
  // close to a bloom — otherwise it can sit in front of the bloom from
  // the camera's angle and steal its hover/click.
  const leaves = useMemo(() => {
    const list = [];
    const BLOOM_CLEARANCE = 0.3;
    branches.forEach((b, bi) => {
      for (let i = 0; i < 10; i++) {
        const seed = idSeed + bi * 97 + i * 31;
        const h = (s) => {
          const x = Math.sin(s * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };
        const r = 0.28 + h(seed) * 0.24;
        const theta = h(seed + 1) * Math.PI * 2;
        const phi = h(seed + 2) * Math.PI;
        const position = [
          b.tip[0] + r * Math.sin(phi) * Math.cos(theta),
          b.tip[1] + r * Math.cos(phi) * 0.7,
          b.tip[2] + r * Math.sin(phi) * Math.sin(theta),
        ];
        const tooCloseToBloom = bloomLocalPositions.some(
          (bp) => Math.hypot(position[0] - bp[0], position[1] - bp[1], position[2] - bp[2]) < BLOOM_CLEARANCE
        );
        if (tooCloseToBloom) continue;
        list.push({
          position,
          scale: 0.16 + h(seed + 3) * 0.1,
          color: leafPalette[Math.floor(h(seed + 4) * leafPalette.length)],
        });
      }
    });
    return list;
  }, [branches, idSeed, bloomLocalPositions, leafPalette]);

  const topY = Math.max(trunkHeight, ...branches.map((b) => b.tip[1]));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (growthStart.current === null) growthStart.current = t;
    const elapsed = t - growthStart.current;
    // A freshly-planted project waits as a seed for a beat before the
    // tree itself starts growing — everyone else grows in immediately.
    // Reduced motion skips the seed-then-grow sequence entirely — the
    // tree is just there, full size, from the first frame. The wait
    // matches whichever seed animation is actually playing — the Spline
    // embed's authored duration, or the built-in procedural pop.
    const delay =
      justPlanted && !reducedMotion ? (useSplineGermination ? GERMINATION_SCENE_DURATION : SEED_DURATION) : 0;
    const growthT = reducedMotion ? 1 : Math.min(1, Math.max(0, elapsed - delay) / GROWTH_DURATION);
    const treeScale = elapsed < delay ? 0.001 : Math.max(0.02, easeOutBack(growthT));

    bloomRefs.current.forEach((group, i) => {
      if (!group) return;
      const boost = hoveredBloom === i ? 0.12 : 0.06;
      group.scale.setScalar(1 + Math.sin(t * 1.4 + i * 0.6) * boost);
    });
    if (groupRef.current) {
      const targetY = isHovered ? 0.08 : 0;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.15;
    }
    if (treeGroupRef.current) {
      treeGroupRef.current.scale.setScalar(treeScale);
      // A rigid whole-tree rock rather than independently flexing branches
      // — simpler and still clearly reads as "windy" without needing to
      // animate leaves/branches separately. Phased by idSeed so a Grove
      // full of trees doesn't sway in unison like one solid block.
      if (windStrength && !reducedMotion) {
        treeGroupRef.current.rotation.z = Math.sin(t * 1.6 + idSeed) * 0.05 * windStrength;
        treeGroupRef.current.rotation.x = Math.sin(t * 2.3 + idSeed * 1.7) * 0.02 * windStrength;
      } else if (treeGroupRef.current.rotation.z || treeGroupRef.current.rotation.x) {
        treeGroupRef.current.rotation.z = 0;
        treeGroupRef.current.rotation.x = 0;
      }
    }
    if (seedRef.current) {
      if (elapsed < delay) {
        const wiggle = 1 + Math.sin(elapsed * 9) * 0.06;
        seedRef.current.scale.set(0.5 * wiggle, 0.65 * wiggle, 0.5 * wiggle);
        seedRef.current.visible = true;
      } else {
        seedRef.current.visible = false;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={project.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverStart(project.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverEnd(project.id);
      }}
      onPointerDown={(e) => {
        pointerDownAt.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        // Manual click-vs-drag distance check — R3F's native "click" event
        // is unreliable when OrbitControls is also listening on the canvas
        // (it can register a tiny drag delta and swallow the click).
        const start = pointerDownAt.current;
        pointerDownAt.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) < 6) {
          e.stopPropagation();
          onSelect?.(project.id, { instant: e.shiftKey });
        }
      }}
    >
      {/* Soil mound at the base — a tree stands IN the ground, not on it.
          Stays at full scale through the seed phase; only the tree itself
          (below) grows out of it. */}
      <mesh position={[0, 0.02, 0]} scale={[1, 0.22, 1]}>
        <sphereGeometry args={[0.32, 20, 12]} />
        <meshStandardMaterial color="#B89A72" roughness={1} />
      </mesh>

      {/* Invisible, slightly-oversized hit zone around just the trunk — its
          real geometry is a thin tapered cylinder (radius 0.09-0.16), too
          narrow a target to click reliably. Deliberately kept short and
          narrow (not spanning up into the canopy) so it can't shadow the
          individually-clickable blooms sitting further out at branch tips
          once this tree is focused. The pointer handlers live on the outer
          group above; this only needs to bubble a hit up to them. */}
      <mesh position={[0, trunkHeight / 2, 0]} visible={false}>
        <cylinderGeometry args={[0.22, 0.28, trunkHeight, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* A freshly-planted project sits as a seed in the soil first, then
          the tree (below) pops out of it once the seed phase ends. The
          Spline embed (once configured, see GerminationSpline.jsx) replaces
          this procedural pop with an authored seed-to-sprout animation;
          if it fails to load, splineFailed flips this back automatically. */}
      {justPlanted && !reducedMotion && useSplineGermination && (
        <Html position={[0, 0.05, 0]} center distanceFactor={4} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <GerminationSpline onError={() => setSplineFailed(true)} />
        </Html>
      )}
      {justPlanted && !reducedMotion && !useSplineGermination && (
        <mesh ref={seedRef} position={[0, 0.16, 0]} scale={[0.5, 0.65, 0.5]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#7A5C3E" roughness={0.6} emissive="#C9A15A" emissiveIntensity={0.15} />
        </mesh>
      )}

      <group ref={treeGroupRef}>
      {/* Trunk — the one shadow-caster per tree; leaves/branches skip it
          to keep the shadow map cheap across a whole Grove of trees. */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, trunkHeight, 7]} />
        <meshStandardMaterial color={TRUNK_COLOR} roughness={0.9} />
      </mesh>

      {/* Branches — thin tapered cylinders oriented from trunk to each tip */}
      {branches.map((b, i) => {
        const dir = new THREE.Vector3(...b.tip);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
        return (
          <group key={i} position={[0, b.originY, 0]}>
            <mesh position={dir.clone().multiplyScalar(0.5)} quaternion={quat}>
              <cylinderGeometry args={[0.03, 0.06, len, 5]} />
              <meshStandardMaterial color={BRANCH_COLOR} roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Leaf canopy */}
      {leaves.map((leaf, i) => (
        <mesh key={i} position={leaf.position} scale={leaf.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={leaf.color} roughness={0.85} />
        </mesh>
      ))}

      {/* Blooms — one small flower per version, colored by project. Only
          individually interactive once this tree is the focused project;
          otherwise they're purely decorative and hover/click passes
          through to the whole-tree handlers above. */}
      {bloomLocalPositions.map((pos, i) => {
        const version = project.versions[i];
        return (
          <group
            key={version?.id ?? i}
            name={`bloom__${project.id}__${i}`}
            position={pos}
            ref={(el) => (bloomRefs.current[i] = el)}
            onPointerOver={(e) => {
              if (!isFocused) return;
              e.stopPropagation();
              setHoveredBloom(i);
            }}
            onPointerOut={(e) => {
              if (!isFocused) return;
              e.stopPropagation();
              setHoveredBloom((cur) => (cur === i ? null : cur));
            }}
            onPointerDown={(e) => {
              if (!isFocused) return;
              bloomPointerDownAt.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              if (!isFocused) return;
              const start = bloomPointerDownAt.current;
              bloomPointerDownAt.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (Math.hypot(dx, dy) < 6) {
                e.stopPropagation();
                onOpenReview?.(project.id, version.id);
              }
            }}
          >
            <mesh>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#FFF6D8" emissive="#FFF6D8" emissiveIntensity={0.6} />
            </mesh>
            {[0, 1, 2, 3, 4].map((p) => {
              const a = (p / 5) * Math.PI * 2;
              return (
                <mesh key={p} position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]} scale={[1, 0.4, 1.6]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshStandardMaterial
                    color={project.color}
                    emissive={project.color}
                    emissiveIntensity={isFocused && hoveredBloom === i ? 1.3 : isHovered ? 1.1 : 0.55}
                    roughness={0.5}
                  />
                </mesh>
              );
            })}

            {isFocused && hoveredBloom === i && version && (
              <Html position={[0, 0.28, 0]} center distanceFactor={4} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
                <BloomPopup version={version} color={project.color} />
              </Html>
            )}
          </group>
        );
      })}

      <pointLight
        position={[0, topY, 0]}
        color={project.color}
        intensity={isHovered ? 1.1 : 0.4}
        distance={4}
        decay={2}
      />

      {isHovered && !isFocused && (
        <Html position={[0, topY + 0.7, 0]} center distanceFactor={8} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <HoverPanel project={project} />
        </Html>
      )}
      </group>

      {/* A permanent name plate at the base — identifies the tree at a
          glance without hovering, once it's actually planted (not while
          it's still a seed) and no 2D panel is covering the Grove. */}
      {showNameTag && !(justPlanted && !reducedMotion) && (
        <Html position={[0, 0.42, 0]} center distanceFactor={10} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="select-none whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold"
            style={{
              background: 'rgba(58,42,26,0.82)',
              color: '#FBF3E4',
              border: `1px solid ${project.color}99`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            {project.name}
          </div>
        </Html>
      )}
    </group>
  );
}
