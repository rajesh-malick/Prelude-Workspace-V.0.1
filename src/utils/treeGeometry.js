// Shared tree-shape math — used by Tree.jsx (to actually draw the tree) and
// by CameraRig (to know exactly where a given bloom sits in world space so
// it can zoom the camera to it). Keeping this in one place means the camera
// target can never drift out of sync with what's actually on screen.

const TRUNK_BASE_HEIGHT = 1.3;
const TRUNK_HEIGHT_PER_VERSION = 0.22;
// Branch angle used to divide the circle by the CURRENT branch count, which
// itself grows with version count — meaning every existing branch's angle
// shifted to a new compass direction each time a new version added a branch,
// not just the new one appearing. Dividing by a fixed max instead gives
// every branch index a permanent angular slot, so growth only ever adds a
// branch — it never swings the ones already there.
const MAX_BRANCHES = 6;

// Deterministic pseudo-random in [0,1) — stable across re-renders.
export function hash(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function idSeedOf(project) {
  return project.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function getTreeGeometry(project) {
  const idSeed = idSeedOf(project);
  const versionCount = project.versions ? project.versions.length : project.versionCount;
  const trunkHeight = TRUNK_BASE_HEIGHT + versionCount * TRUNK_HEIGHT_PER_VERSION;
  const branchCount = Math.min(3 + Math.ceil(versionCount / 2), MAX_BRANCHES);

  const branches = [];
  for (let i = 0; i < branchCount; i++) {
    const seed = idSeed + i * 13;
    const angle = (i / MAX_BRANCHES) * Math.PI * 2 + hash(seed) * 0.6;
    const tilt = 0.55 + hash(seed + 1) * 0.35;
    const originY = trunkHeight * (0.5 + hash(seed + 2) * 0.3);
    const length = trunkHeight * (0.45 + hash(seed + 3) * 0.25);
    const tipX = Math.cos(angle) * Math.sin(tilt) * length;
    const tipZ = Math.sin(angle) * Math.sin(tilt) * length;
    const tipY = originY + Math.cos(tilt) * length;
    branches.push({ originY, tip: [tipX, tipY, tipZ] });
  }

  // Local-space (relative to the tree's own origin) bloom positions, one
  // per version. Radius is deliberately BEYOND the leaf-scatter radius
  // (see LEAF_MAX_RADIUS in Tree.jsx, ~0.6) so every bloom pokes out past
  // the canopy instead of being buried inside it — both for visual clarity
  // (a flower you can actually see) and so pointer raycasts reliably hit
  // the bloom instead of a leaf sitting in front of it.
  const bloomLocalPositions = [];
  for (let i = 0; i < versionCount; i++) {
    const b = branches[i % branches.length];
    const seed = idSeed + i * 53;
    const r = 0.62 + hash(seed) * 0.28;
    const theta = hash(seed + 1) * Math.PI * 2;
    bloomLocalPositions.push([
      b.tip[0] + r * Math.cos(theta),
      b.tip[1] + 0.16 + hash(seed + 2) * 0.15,
      b.tip[2] + r * Math.sin(theta),
    ]);
  }

  return { idSeed, trunkHeight, branches, bloomLocalPositions };
}

// Absolute world position of the Nth bloom (version) on a project's tree.
export function getBloomWorldPosition(project, versionIndex) {
  const { bloomLocalPositions } = getTreeGeometry(project);
  const local = bloomLocalPositions[versionIndex] ?? [0, 0, 0];
  const [px, py, pz] = project.position;
  return [px + local[0], py + local[1], pz + local[2]];
}
