import { OrbitControls } from '@react-three/drei';
import Tree from '../components/Tree';
import EmptySeed from '../components/EmptySeed';
import ForestFloor from './ForestFloor';
import AmbientLife from './AmbientLife';
import SkyLighting from './SkyLighting';

export default function GroveScene({
  projects,
  hoveredId,
  focusedProjectId,
  onHoverStart,
  onHoverEnd,
  onSelect,
  onOpenReview,
  onLoadExamples,
  justPlantedId,
  allowOrbit,
  reducedMotion,
  showNameTags = true,
  elevation,
  sky,
}) {
  return (
    <>
      <SkyLighting elevation={elevation} sky={sky} />

      {/* Ground — extends well past the clearing so there's real ground
          under the background tree line (see ForestFloor) instead of a
          visible edge-of-the-world seam */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial color="#DDD0A8" roughness={1} />
      </mesh>

      {/* Forest ambience — grass, leaf litter, stones and undergrowth
          across the clearing, ringed by a wall of background trees so the
          Grove reads as a clearing IN a forest, not a lot on its own */}
      <ForestFloor />
      <AmbientLife reducedMotion={reducedMotion} />

      {projects.length === 0 ? (
        <EmptySeed onLoadExamples={onLoadExamples} />
      ) : (
        projects.map((project) => (
          <Tree
            key={project.id}
            project={project}
            isHovered={hoveredId === project.id}
            isFocused={focusedProjectId === project.id}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            onSelect={onSelect}
            onOpenReview={onOpenReview}
            justPlanted={project.id === justPlantedId}
            reducedMotion={reducedMotion}
            showNameTag={showNameTags}
          />
        ))
      )}

      {/* Dev-only camera control, Grove overview only — a focused project is
          scripted-camera-only (see CameraRig), no free orbiting into geometry */}
      {allowOrbit && (
        <OrbitControls
          target={[0, 1.2, 0]}
          enablePan={false}
          minDistance={7}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.35}
        />
      )}
    </>
  );
}
