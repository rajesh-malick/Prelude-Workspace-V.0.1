import { Stars } from '@react-three/drei';
import { lerpHex } from '../utils/colorLerp';
import Fireflies from './Fireflies';
import WeatherEffects from './WeatherEffects';

const SUN_DAY = '#FFEBC4';
const SUN_HORIZON = '#FF9A5C';
const MOON = '#7FA8D9';

// Sun mostly hidden behind cloud (overcast/rain/snow) reads as flatter,
// dimmer light and a nearer fog wall — haze scatters light instead of
// blocking it, so it dims less but pulls fog in the most.
const LIGHT_DAMPEN = { overcast: 0.65, rain: 0.5, snow: 0.7, haze: 0.85 };
const FOG_RANGE = {
  clear: [8, 22],
  overcast: [7, 18],
  rain: [6, 15],
  snow: [7, 17],
  haze: [4, 14],
};

// Sun by day, moon by night — one directional light, continuously
// recolored/repositioned/re-intensified by `elevation` instead of two
// separate lights swapped at a hard cutoff. `weather` (see getSkyColors)
// layers a mood — dimmer/flatter light and closer fog for anything short
// of a clear sky — on top of that.
export default function SkyLighting({ elevation, sky, weather = 'clear' }) {
  const dayAmount = (elevation + 1) / 2;
  const warmth = Math.max(0, 1 - Math.abs(elevation) / 0.35);
  const isNight = elevation < 0.05;
  const dampen = LIGHT_DAMPEN[weather] ?? 1;

  const lightColor = lerpHex(lerpHex(MOON, SUN_DAY, dayAmount), SUN_HORIZON, warmth * 0.7);
  const lightIntensity = (0.35 + dayAmount * 0.85) * dampen;
  const lightY = Math.max(1.5, 4 + elevation * 6);
  const hemiIntensity = (0.4 + dayAmount * 0.35) * dampen;
  const [fogNear, fogFar] = FOG_RANGE[weather] ?? FOG_RANGE.clear;

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
      <fog attach="fog" args={[sky.fog, fogNear, fogFar]} />

      <WeatherEffects weather={weather} />

      {isNight && (
        <>
          <Stars radius={60} depth={30} count={2500} factor={2.5} saturation={0} fade speed={0.4} />
          <Fireflies />
        </>
      )}
    </>
  );
}
