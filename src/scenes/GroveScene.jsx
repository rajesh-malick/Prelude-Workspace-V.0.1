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
  showEmptyCard = true,
  justPlantedId,
  allowOrbit,
  reducedMotion,
  showNameTags = true,
  elevation,
  sky,
  isNight,
  weather,
}) {
  // How hard everything that sways/blows should move — windy is the purest
  // case, thunderstorm and blizzard carry real wind too but a bit less of
  // the visual budget since rain/snow and (for thunderstorm) lightning are
  // already doing most of the "this is severe" work.
  const windStrength = weather === 'windy' ? 1 : weather === 'thunderstorm' ? 0.6 : weather === 'blizzard' ? 0.8 : 0;

  return (
    <>
      <SkyLighting elevation={elevation} sky={sky} weather={weather} />

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
      <ForestFloor windStrength={windStrength} />
      <AmbientLife reducedMotion={reducedMotion} isNight={isNight} />

      {projects.length === 0 ? (
        <EmptySeed onLoadExamples={onLoadExamples} showCard={showEmptyCard} />
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
            windStrength={windStrength}
          />
        ))
      )}

      {/* Dev-only camera control, Grove overview only — a focused project is
          scripted-camera-only (see CameraRig), no free orbiting into geometry */}
      {allowOrbit && (
        <OrbitControls
          target={[0, 0.6, 0]}
          enablePan={false}
          minDistance={7}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={false}
        />
      )}
    </>
  );
}
