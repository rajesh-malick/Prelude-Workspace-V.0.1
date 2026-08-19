import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { avatarColor } from '../utils/avatarColor';
import { getTreeGeometry } from '../utils/treeGeometry';

// One simplified tree per PERSON, not one full detailed tree per PROJECT —
// rendering everyone's actual Grove (every project, every branch, every
// leaf, the GLTF birds/butterflies) simultaneously in one scene is exactly
// the GPU-contention problem this app already fought hard to fix elsewhere
// (see the frameloop-pausing work on the main Grove canvas). A trunk plus
// a handful of canopy blobs per person keeps the real cost at "one cheap
// tree per teammate" regardless of how many projects they each have —
// getTreeGeometry still drives the shape/scale from their real project
// count, just reused as a stylized marker instead of the full render.
function VillageTree({ person, position, onVisit }) {
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(
    () => getTreeGeometry({ id: person.ownerEmail ?? 'mine', versions: Array.from({ length: Math.max(person.projectCount, 1) }) }),
    [person]
  );
  const color = avatarColor(person.ownerName);

  return (
    <group
      position={position}
      scale={hovered ? 1.08 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onVisit(person.ownerEmail);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, geometry.trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, geometry.trunkHeight, 6]} />
        <meshStandardMaterial color="#7A5C3E" />
      </mesh>
      {geometry.branches.map((b, i) => (
        <mesh key={i} position={b.tip} castShadow>
          <icosahedronGeometry args={[0.32 + (i % 3) * 0.04, 0]} />
          <meshStandardMaterial color={color.fg} />
        </mesh>
      ))}
      <Html position={[0, geometry.trunkHeight + 1.1, 0]} center distanceFactor={11} occlude>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-stone-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
          {person.isMine ? 'My Grove' : person.ownerName}
          <span className="ml-1 text-stone-300">
            · {person.projectCount} {person.projectCount === 1 ? 'project' : 'projects'}
          </span>
        </div>
      </Html>
    </group>
  );
}

function VillageScene({ people, onVisit }) {
  const cols = Math.ceil(Math.sqrt(people.length));
  const spacing = 3.4;
  const groundRadius = Math.max(10, cols * spacing * 0.75 + 4);

  return (
    <>
      <hemisphereLight args={['#FDF6EC', '#DDD0A8', 0.65]} />
      <directionalLight position={[6, 10, 4]} intensity={1} color="#FFEBC4" castShadow />
      <fog attach="fog" args={['#F3E9D8', 14, groundRadius * 2.2]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[groundRadius, 48]} />
        <meshStandardMaterial color="#DDD0A8" roughness={1} />
      </mesh>

      {people.map((person, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const offset = ((cols - 1) * spacing) / 2;
        return (
          <VillageTree
            key={person.ownerEmail ?? 'mine'}
            person={person}
            position={[col * spacing - offset, 0, row * spacing - offset]}
            onVisit={onVisit}
          />
        );
      })}

      <OrbitControls
        target={[0, 1, 0]}
        minDistance={6}
        maxDistance={Math.max(24, groundRadius * 1.4)}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

// A single overview of the whole company's Groves at once — real 3D (see
// VillageTree above for why it stays cheap), a door into each person's
// actual detailed Grove rather than a render of it. Its own fresh Canvas
// rather than sharing the main Grove's persistent one — this is opened
// occasionally, not flipped back and forth every few seconds the way
// Grove/Focus mode is, so a small one-time mount cost here isn't worth
// entangling with that canvas's careful always-mounted/frameloop logic.
export default function VillageView({ userName, ownProjectCount, territories, onVisit, onClose }) {
  const people = useMemo(
    () => [{ ownerName: userName, ownerEmail: null, projectCount: ownProjectCount, isMine: true }, ...(territories ?? [])],
    [userName, ownProjectCount, territories]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-[#F3E9D8]"
    >
      <Canvas shadows camera={{ position: [0, 9, 12], fov: 45 }}>
        <VillageScene people={people} onVisit={onVisit} />
      </Canvas>

      <div className="pointer-events-none absolute left-6 top-6 right-6 flex items-start justify-between">
        <div className="glass-surface pointer-events-auto rounded-2xl px-4 py-3">
          <h2 className="text-[18px] font-semibold text-stone-800">The Village</h2>
          <p className="mt-0.5 text-[13px] text-stone-600">Drag to look around · click a tree to visit</p>
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
