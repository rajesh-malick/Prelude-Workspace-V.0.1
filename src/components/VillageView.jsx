import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';
import { getTreeGeometry, hash } from '../utils/treeGeometry';

const PLOT_RADIUS = 1.55;
const PLOT_COLOR = '#C7A76B';
const PLOT_BORDER_COLOR = '#9C7B45';
const SPACING = 4.1;

// A raised, bordered patch of ground under each person's cluster — each
// teammate visibly owns their own separate parcel, kept deliberately
// unconnected to anyone else's (no paths between territories).
function Plot() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[PLOT_RADIUS, PLOT_RADIUS, 0.06, 24]} />
        <meshStandardMaterial color={PLOT_BORDER_COLOR} />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[PLOT_RADIUS - 0.18, PLOT_RADIUS - 0.18, 0.06, 24]} />
        <meshStandardMaterial color={PLOT_COLOR} />
      </mesh>
    </group>
  );
}

// One small tree per real project rather than one aggregate tree per
// person — each still built from the same cheap trunk + a few canopy
// blobs as before (see the module comment below for why that stays cheap
// even multiplied out this way). Shape/scale comes from the project's own
// name (deterministic, so it doesn't reshuffle on every render), not a
// fetched version count — the directory endpoint intentionally only ships
// names, not each project's full contents.
function MiniProjectTree({ name, offset, scale, color, onClick, onHoverChange }) {
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(() => getTreeGeometry({ id: name, versions: [{}] }), [name]);

  return (
    <group
      position={[offset[0], 0, offset[1]]}
      scale={hovered ? scale * 1.12 : scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHoverChange?.(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHoverChange?.(false);
      }}
    >
      <mesh position={[0, geometry.trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, geometry.trunkHeight, 6]} />
        <meshStandardMaterial color="#7A5C3E" />
      </mesh>
      {geometry.branches.map((b, i) => (
        <mesh key={i} position={b.tip} castShadow>
          <icosahedronGeometry args={[0.32 + (i % 3) * 0.04, 0]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Html position={[0, geometry.trunkHeight + 0.7, 0]} center distanceFactor={9} occlude>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-stone-900/80 px-2 py-0.5 text-[9.5px] font-medium text-white">
          {name}
        </div>
      </Html>
    </group>
  );
}

// Deterministic hash-jittered ring layout — organic-looking without being
// random-every-render. A single project sits dead center (matches how a
// lone tree looked before this became a cluster); more than one fans out.
function scatterOffsets(count, seedBase) {
  if (count <= 1) return [[0, 0]];
  const usableRadius = PLOT_RADIUS - 0.55;
  return Array.from({ length: count }, (_, i) => {
    const seed = seedBase + i * 29;
    const angle = (i / count) * Math.PI * 2 + hash(seed) * 0.5;
    const r = usableRadius * (0.4 + hash(seed + 1) * 0.55);
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}

function PersonPlot({ person, position, onVisit }) {
  const [anyHovered, setAnyHovered] = useState(false);
  // A personal accent color (see EditProfileModal) overrides the default
  // name-hash-derived one, once someone's actually set one.
  const treeColor = person.villageColor || avatarColor(person.ownerName).fg;
  const names = person.projectNames ?? [];
  const offsets = useMemo(() => scatterOffsets(Math.max(names.length, 1), names.length + person.ownerName.length), [names.length, person.ownerName]);
  // Smaller per tree the more of them share one plot, so a person with a
  // lot of projects doesn't spill outside their own parcel.
  const scale = Math.max(0.32, 0.58 - names.length * 0.025);

  return (
    <group position={position}>
      <Plot />
      <Html position={[0, 2.1, 0]} center distanceFactor={11} occlude>
        <div
          className={`pointer-events-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity ${
            anyHovered ? 'opacity-100' : 'opacity-90'
          }`}
          style={{ backgroundColor: treeColor }}
        >
          {person.isMine ? 'My Grove' : person.ownerName}
        </div>
      </Html>
      {names.length === 0 ? (
        <mesh position={[0, 0.14, 0]} onClick={() => onVisit(person.ownerEmail)}>
          <coneGeometry args={[0.16, 0.32, 8]} />
          <meshStandardMaterial color="#B8C98A" />
        </mesh>
      ) : (
        names.map((name, i) => (
          <MiniProjectTree
            key={name + i}
            name={name}
            offset={offsets[i]}
            scale={scale}
            color={treeColor}
            onClick={() => onVisit(person.ownerEmail)}
            onHoverChange={setAnyHovered}
          />
        ))
      )}
    </group>
  );
}

function VillageScene({ people, onVisit }) {
  const cols = Math.ceil(Math.sqrt(people.length));
  const offset = ((cols - 1) * SPACING) / 2;
  const groundRadius = Math.max(11, cols * SPACING * 0.75 + 4);

  const positions = people.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return [col * SPACING - offset, 0, row * SPACING - offset];
  });

  return (
    <>
      <hemisphereLight args={['#FDF6EC', '#DDD0A8', 0.65]} />
      <directionalLight position={[6, 12, 5]} intensity={1} color="#FFEBC4" castShadow />
      <fog attach="fog" args={['#F3E9D8', 16, groundRadius * 2.4]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[groundRadius, 48]} />
        <meshStandardMaterial color="#B8C98A" roughness={1} />
      </mesh>

      {people.map((person, i) => (
        <PersonPlot key={person.ownerEmail ?? 'mine'} person={person} position={positions[i]} onVisit={onVisit} />
      ))}

      <OrbitControls
        target={[0, 1, 0]}
        minDistance={6}
        maxDistance={Math.max(28, groundRadius * 1.4)}
        maxPolarAngle={Math.PI / 2.6}
      />
    </>
  );
}

// A single overview of the whole company's Groves at once — real 3D, a
// door into each person's actual detailed Grove rather than a render of
// it. Deliberately still simplified trees (no branches-with-leaf-scatter,
// no GLTF birds/butterflies, no hover popups/bloom system) even though
// there's now one per PROJECT instead of one per person — rendering
// everyone's full detailed Grove simultaneously is the exact
// GPU-contention problem this app already fought to fix elsewhere (see
// the frameloop-pausing work on the main Grove canvas); many cheap
// trunk-plus-a-few-blobs trees stays fine at this scale, full Tree.jsx
// instances multiplied across every project of every teammate would not.
//
// Its own fresh Canvas rather than sharing the main Grove's persistent
// one — this is opened occasionally, not flipped back and forth every few
// seconds the way Grove/Focus mode is, so a small one-time mount cost
// here isn't worth entangling with that canvas's careful
// always-mounted/frameloop logic. Camera is steep/narrow-FOV on purpose —
// an isometric-feeling aerial angle (per the Cities: Skylines / Clash of
// Clans references) rather than the shallower establishing-shot angle the
// main Grove uses.
export default function VillageView({ userName, ownProjectNames, ownVillageColor, territories, onVisit, onClose }) {
  const people = useMemo(
    () => [
      { ownerName: userName, ownerEmail: null, projectNames: ownProjectNames ?? [], villageColor: ownVillageColor, isMine: true },
      ...(territories ?? []),
    ],
    [userName, ownProjectNames, ownVillageColor, territories]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-[#F3E9D8]"
    >
      <Canvas shadows camera={{ position: [0, 14, 8], fov: 38 }}>
        <VillageScene people={people} onVisit={onVisit} />
      </Canvas>

      <div className="pointer-events-none absolute left-6 top-6 right-6 flex items-start justify-between">
        <div className="glass-surface pointer-events-auto rounded-2xl px-4 py-3">
          <h2 className="text-[18px] font-semibold text-stone-800">The Village</h2>
          <p className="mt-0.5 text-[13px] text-stone-600">Drag to look around · click a tree to visit that project's owner</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="glass-surface pointer-events-auto flex h-10 w-10 flex-none items-center justify-center rounded-full text-stone-600 transition-colors hover:text-stone-900"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}
