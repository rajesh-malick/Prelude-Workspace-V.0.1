import { Component, Suspense } from 'react';
import Spline from '@splinetool/react-spline';

// Paste the exported scene link here once the "growing tree" remix
// (https://app.spline.design/community/file/93d3e353-7e8a-4b85-8e5a-e56efd69bf03)
// is forked into your own workspace and its trigger is switched from
// "Scroll" to something that plays on its own (e.g. "Start"/on mount).
// Spline's export panel calls this the "scene link" — looks like
// https://prod.spline.design/XXXXXXXXXXXXXXXX/scene.splinecode
// Leaving this empty keeps the original procedural seed-pop animation.
export const GERMINATION_SCENE_URL = '';

// How long the authored animation actually plays, in seconds. This gates
// when the real (colored, clickable) low-poly tree underneath is revealed
// and when the "New version" form is allowed to open — set it to match
// however long the remix's autoplay sequence actually runs.
export const GERMINATION_SCENE_DURATION = 2.5;

// A network-loaded third-party scene can fail (bad URL, offline, Spline
// CDN hiccup) — an error boundary here means that failure quietly falls
// back to nothing rendered (Tree.jsx's own procedural seed takes over)
// instead of taking down the whole Grove.
class SplineBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(_, prevState) {
    if (this.state.failed && !prevState.failed) this.props.onError?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function GerminationSpline({ onError }) {
  if (!GERMINATION_SCENE_URL) return null;

  return (
    <SplineBoundary onError={onError}>
      <Suspense fallback={null}>
        <Spline scene={GERMINATION_SCENE_URL} style={{ width: 240, height: 280, background: 'transparent' }} />
      </Suspense>
    </SplineBoundary>
  );
}
