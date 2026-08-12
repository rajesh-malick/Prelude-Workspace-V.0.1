import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

// The Grove's resting camera framing — must match the initial camera prop
// on <Canvas> and the OrbitControls `target` in GroveScene, so control can
// hand off to/from the scripted tween with no visible snap.
export const OVERVIEW_POS = { x: 0, y: 4.2, z: 10 };
export const OVERVIEW_LOOKAT = { x: 0, y: 1.2, z: 0 };

// No page transitions — every navigation (Grove <-> Project <-> Review) is
// entirely camera movement, scripted with GSAP.
//
// `focus` shapes:
//   null                                       -> Grove overview
//   { kind: 'project', project }                -> parked in front of a tree
//   { kind: 'bloom', project, version, position } -> zoomed into one bloom
//
// Exposes `skip()` via ref so the UI can let an impatient user jump straight
// to the destination instead of waiting out the tween.
const CameraRig = forwardRef(function CameraRig({ focus, onSettled, reducedMotion }, ref) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(OVERVIEW_LOOKAT.x, OVERVIEW_LOOKAT.y, OVERVIEW_LOOKAT.z));
  const tweenRef = useRef(null);
  const isFirstRun = useRef(true);

  useImperativeHandle(ref, () => ({
    skip: () => {
      tweenRef.current?.progress(1);
    },
  }));

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    tweenRef.current?.kill();

    let destPos;
    let destLook;
    let duration;

    if (focus?.kind === 'project') {
      const [px, , pz] = focus.project.position;
      // Bias the look-at right of the tree's true center so the whole
      // canopy (branches scatter unpredictably) renders left-of-frame,
      // keeping it clear of the right-docked ProjectOverlay panel.
      destPos = { x: px * 0.55, y: 2.1, z: pz + 3.6 };
      destLook = { x: px + 1.1, y: 1.5, z: pz };
      duration = 1.05;
    } else if (focus?.kind === 'bloom') {
      const [bx, by, bz] = focus.position;
      destPos = { x: bx + 0.55, y: by + 0.25, z: bz + 0.9 };
      destLook = { x: bx, y: by, z: bz };
      duration = 0.8;
    } else {
      destPos = OVERVIEW_POS;
      destLook = OVERVIEW_LOOKAT;
      duration = 0.95;
    }

    // Reduced motion (or an instant/repeat-visit jump — see `focus.instant`
    // below) means "cut, don't fly": the destination is reached in a single
    // frame instead of a ~1s flythrough, but `onSettled` still fires so
    // overlays gate open exactly the same way.
    const tl = gsap.timeline({ onComplete: () => onSettled?.() });
    const d = reducedMotion || focus?.instant ? 0.001 : duration;
    tl.to(camera.position, { ...destPos, duration: d, ease: 'power2.inOut' }, 0);
    tl.to(
      lookAt.current,
      { ...destLook, duration: d, ease: 'power2.inOut', onUpdate: () => camera.lookAt(lookAt.current) },
      0
    );
    tweenRef.current = tl;

    return () => tweenRef.current?.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return null;
});

export default CameraRig;
