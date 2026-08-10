import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Clone } from '@react-three/drei';

// CC-BY-4.0 asset — credited in SettingsPanel's "About" section:
// "Grass Patches - Circle" by brandon_grey (via Sketchfab). Loaded glTF
// scenes come in arbitrary author units — this normalizes to a target
// world height and sits it on the ground regardless of where its own
// pivot/bounding box happens to sit.
export default function RealisticGrassPatches({ items, targetHeight = 1.0 }) {
  const { scene } = useGLTF('/models/grass-patch/scene.gltf');

  const { scale, groundOffsetPerUnitScale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const height = box.max.y - box.min.y || 1;
    return { scale: targetHeight / height, groundOffsetPerUnitScale: -box.min.y };
  }, [scene, targetHeight]);

  return (
    <Suspense fallback={null}>
      {items.map((it, i) => {
        const finalScale = scale * it.scaleVariance;
        return (
          <Clone
            key={i}
            object={scene}
            position={[it.position[0], groundOffsetPerUnitScale * finalScale, it.position[2]]}
            rotation={[0, it.rotation, 0]}
            scale={finalScale}
          />
        );
      })}
    </Suspense>
  );
}
