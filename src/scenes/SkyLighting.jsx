import { Stars } from '@react-three/drei';
import { lerpHex } from '../utils/colorLerp';
import Fireflies from './Fireflies';

const SUN_DAY = '#FFEBC4';
const SUN_HORIZON = '#FF9A5C';
const MOON = '#7FA8D9';

// Sun by day, moon by night — one directional light, continuously
// recolored/repositioned/re-intensified by `elevation` instead of two
// separate lights swapped at a hard cutoff.
export default function SkyLighting({ elevation, sky }) {
  const dayAmount = (elevation + 1) / 2;
  const warmth = Math.max(0, 1 - Math.abs(elevation) / 0.35);
  const isNight = elevation < 0.05;

  const lightColor = lerpHex(lerpHex(MOON, SUN_DAY, dayAmount), SUN_HORIZON, warmth * 0.7);
  const lightIntensity = 0.35 + dayAmount * 0.85;
  const lightY = Math.max(1.5, 4 + elevation * 6);
  const hemiIntensity = 0.4 + dayAmount * 0.35;

  return (
    <>
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, hemiIntensity]} />
      <directionalLight
        position={[6, lightY, 4]}
        intensity={lightIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />

      {/* Depth fade toward the horizon, matching the sky-mid tone */}
      <fog attach="fog" args={[sky.fog, 8, 22]} />

      {isNight && (
        <>
          <Stars radius={60} depth={30} count={2500} factor={2.5} saturation={0} fade speed={0.4} />
          <Fireflies />
        </>
      )}
    </>
  );
}
