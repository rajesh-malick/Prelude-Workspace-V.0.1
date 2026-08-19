import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ChevronsRight } from 'lucide-react';
import GroveScene from './scenes/GroveScene';
import CameraRig, { OVERVIEW_POS } from './scenes/CameraRig';
import useReducedMotion from './hooks/useReducedMotion';
import useAmbientChirps from './hooks/useAmbientChirps';
import useTimeOfDay from './hooks/useTimeOfDay';
import { getPhase } from './utils/timeOfDay';
import { GERMINATION_SCENE_URL, GERMINATION_SCENE_DURATION } from './components/GerminationSpline';
import Header from './components/Header';
import NavDock from './components/NavDock';
import GroveAccessibleNav from './components/GroveAccessibleNav';
import ProjectOverlay from './components/ProjectOverlay';
import ReviewOverlay from './components/ReviewOverlay';
import SearchOverlay from './components/SearchOverlay';
import CreateVersionModal from './components/CreateVersionModal';
import CreateProjectModal from './components/CreateProjectModal';
import SignInScreen from './components/SignInScreen';
import WelcomeToast from './components/WelcomeToast';
import CelebrationToast from './components/CelebrationToast';
import NotificationsPanel from './components/NotificationsPanel';
import SettingsPanel from './components/SettingsPanel';
import FocusDashboard from './focus/FocusDashboard';
import FocusProjectView from './focus/FocusProjectView';
import FocusReviewView from './focus/FocusReviewView';
import { projects as seedProjects } from './data/projects';
import { playNotificationChime } from './utils/notificationSound';
import { getBloomWorldPosition } from './utils/treeGeometry';

let nextId = 1000;
const genId = (prefix) => `${prefix}-${nextId++}`;

// Threaded replies can go arbitrarily deep — `path` is the chain of reply
// ids from the comment's top-level replies down to whichever reply is
// being replied to (empty path = replying directly to the comment itself).
// Walks that chain and appends the new reply at the bottom of it.
function addReplyAtPath(replies, path, newReply) {
  if (path.length === 0) return [...replies, newReply];
  const [headId, ...rest] = path;
  return replies.map((r) => (r.id === headId ? { ...r, replies: addReplyAtPath(r.replies ?? [], rest, newReply) } : r));
}

// Same path convention as above — walks down to whichever node is being
// replied to and returns its author, so a reply-to-a-reply notifies that
// specific person rather than always the top-level comment's author.
function findReplyTargetAuthor(comment, path) {
  let node = comment;
  for (const id of path) {
    const next = (node.replies ?? []).find((r) => r.id === id);
    if (!next) break;
    node = next;
  }
  return node.author;
}

// One-time celebration flags (first project ever planted, first version
// ever published) — deliberately client-side-only, not a backend field:
// this is cosmetic flavor, not data worth a schema change for, and the
// worst case of losing the flag (a new browser/device) is just seeing a
// nice toast a second time, not a real problem.
function hasCelebrated(email, key) {
  try {
    return localStorage.getItem(`prelude-celebrated-${key}:${email}`) === '1';
  } catch {
    return true;
  }
}
function markCelebrated(email, key) {
  try {
    localStorage.setItem(`prelude-celebrated-${key}:${email}`, '1');
  } catch {
    // ignore
  }
}

// Projects/versions/comments are now real, backend-persisted data — one
// JSON document per account, read/written via /api/projects, tied to the
// signed-in session cookie rather than anything client-side. This also
// fixes a real bug the old shared-localStorage version had: a brand-new
// account on a browser that had already been used for another account
// used to inherit that account's projects instead of starting empty —
// now every account's data genuinely lives only under its own row.
// A 401 here specifically means "the session cookie is a validly-signed
// JWT, but the account it names doesn't exist anymore" (see api/projects.js)
// — genuinely different from "this account has zero projects", and the
// caller needs to tell them apart to sign a stale session out instead of
// quietly showing an empty Grove under a name that isn't really signed in.
// `asEmail` reads/writes someone ELSE's territory instead of your own (see
// api/projects.js) — this is an internal tool, so any signed-in teammate
// can already view and edit anyone else's territory, no separate grant.
function projectsUrl(asEmail) {
  return asEmail ? `/api/projects?as=${encodeURIComponent(asEmail)}` : '/api/projects';
}

async function fetchProjects(asEmail) {
  const res = await fetch(projectsUrl(asEmail), { credentials: 'include' });
  if (res.status === 401) return { projects: [], sessionInvalid: true };
  if (!res.ok) return { projects: [], sessionInvalid: false };
  const data = await res.json();
  // A project with zero versions shouldn't exist — filtered here too
  // (not just at delete-time) so any such record from an older save
  // cleans itself up the next time the Grove loads.
  const projects = Array.isArray(data.projects) ? data.projects.filter((p) => p.versions.length > 0) : [];
  return { projects, sessionInvalid: false };
}

async function saveProjects(projects, asEmail) {
  const res = await fetch(projectsUrl(asEmail), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  });
  return { sessionInvalid: res.status === 401 };
}

async function fetchTerritories() {
  const res = await fetch('/api/territories', { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.territories) ? data.territories : [];
}

async function fetchNotifications() {
  const res = await fetch('/api/notifications', { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.notifications) ? data.notifications : [];
}

// Fire-and-forget — a failed delivery (network hiccup, recipient deleted
// their account) shouldn't block or error out the visit itself.
function notify(toEmail, text) {
  fetch('/api/notifications', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toEmail, text }),
  }).catch(() => {});
}

// genId() ids embed a counter (e.g. "c-1003") — after hydrating from
// storage, resume counting past whatever's already saved so new ids can
// never collide with restored ones.
function highestGenId(projects) {
  let max = 999;
  const scan = (id) => {
    const n = Number(String(id).split('-').pop());
    if (Number.isFinite(n) && n > max) max = n;
  };
  projects.forEach((p) => {
    scan(p.id);
    p.versions.forEach((v) => {
      scan(v.id);
      v.comments.forEach((c) => scan(c.id));
    });
  });
  return max;
}

function suggestNextLabel(project) {
  if (project.versions.length === 0) return 'v1.0';
  const last = project.versions[project.versions.length - 1];
  const match = last?.label.match(/^v(\d+)\.(\d+)$/);
  return match ? `v${match[1]}.${Number(match[2]) + 1}` : `v${project.versions.length + 1}`;
}

// New trees spiral outward from the Grove's center so they never overlap
// an existing tree, however many get planted.
function nextProjectPosition(existingCount) {
  const angle = existingCount * 2.4;
  const radius = 4.5 + existingCount * 0.9;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

// No page transitions — Grove <-> Project <-> Review is entirely camera
// movement (see CameraRig). `destination` is the thing we're navigating
// TO (set the instant the user acts); `arrived` flips false the moment a
// destination changes and true again once CameraRig's tween completes —
// overlays only ever show once `arrived` is true, so they never appear
// mid-flight. Focus Mode reuses `destination` for its own drill-down but
// ignores `arrived` entirely — there's no camera to wait for there.
export default function App() {
  // Real auth now — the session lives in an httpOnly cookie set by the
  // /api/auth/* routes, not localStorage. `sessionChecked` gates the first
  // render so a signed-in user doesn't flash the sign-in screen while the
  // /api/auth/me check is still in flight.
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const userName = session?.name ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSession(data.user);
      })
      .catch(() => {
        // Network hiccup or API unreachable — treat as signed out rather
        // than getting stuck on a blank screen forever.
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showWelcome, setShowWelcome] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [mode, setMode] = useState('grove');
  const [projects, setProjects] = useState([]);
  // Tracks which account's data is actually loaded into `projects` right
  // now — lets the save effect below tell "haven't loaded this account's
  // data yet" apart from "this account genuinely has zero projects", so it
  // never fires with a stale/empty array and overwrites real saved data.
  const [projectsLoadedFor, setProjectsLoadedFor] = useState(null);

  useEffect(() => {
    if (!session?.email || projectsLoadedFor === session.email) return;
    let cancelled = false;
    fetchProjects().then(({ projects: loaded, sessionInvalid }) => {
      if (cancelled) return;
      if (sessionInvalid) {
        // The cookie is a validly-signed JWT for an account that no longer
        // exists — treat it exactly like a sign-out rather than letting the
        // save effect below run next and overwrite nothing under a name
        // that isn't really signed in.
        setSession(null);
        setProjects([]);
        setProjectsLoadedFor(null);
        setDestination(null);
        setArrived(true);
        setMode('grove');
        return;
      }
      nextId = highestGenId(loaded) + 1;
      setProjects(loaded);
      setProjectsLoadedFor(session.email);
    });
    return () => {
      cancelled = true;
    };
  }, [session, projectsLoadedFor]);

  useEffect(() => {
    if (!session?.email || projectsLoadedFor !== session.email) return;
    saveProjects(projects)
      .then(({ sessionInvalid }) => {
        if (!sessionInvalid) return;
        setSession(null);
        setProjects([]);
        setProjectsLoadedFor(null);
        setDestination(null);
        setArrived(true);
        setMode('grove');
      })
      .catch(() => {
        // Network hiccup — the in-memory state stays correct for the rest of
        // this session, it just won't have made it to the backend this time.
      });
  }, [projects, session, projectsLoadedFor]);

  const [destination, setDestination] = useState(null);
  const [arrived, setArrived] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [creatingVersionFor, setCreatingVersionFor] = useState(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [justPlantedId, setJustPlantedId] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  // An email, or null for "my own Grove" — every other account at the
  // company is a real, browsable territory (see /api/territories), not a
  // handful of hardcoded mock teammates.
  const [viewingTerritory, setViewingTerritory] = useState(null);
  const [territoryNotices, setTerritoryNotices] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [territoriesLoadedFor, setTerritoriesLoadedFor] = useState(null);
  // The territory being visited has its OWN loaded/saved projects, entirely
  // separate from your own `projects` state above — switching back to "My
  // Grove" doesn't touch either.
  const [territoryProjects, setTerritoryProjects] = useState([]);
  const [territoryLoadedFor, setTerritoryLoadedFor] = useState(null);
  // Real notifications delivered TO this account (e.g. "X visited your
  // territory") — persisted server-side, not just a session-local toast.
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoadedFor, setNotificationsLoadedFor] = useState(null);
  // Not persisted server-side (no per-notification "read" flag, see
  // api/notifications.js) — just "have I opened the panel since these
  // arrived", reset to 0 each session so anything waiting from before
  // still shows as unread once.
  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(0);
  const cameraRigRef = useRef(null);
  const germinationTimeoutRef = useRef(null);
  const { hour, elevation, sky } = useTimeOfDay();
  const isNight = getPhase(hour) === 'night';

  // Real birds go quiet and out of sight after dark — chirping (and the
  // birds themselves, see GroveScene/AmbientLife below) pause overnight
  // instead of playing on a loop regardless of the Grove's own lighting.
  useAmbientChirps(soundOn && mode === 'grove' && !isNight);

  useEffect(() => {
    if (!session?.email || territoriesLoadedFor === session.email) return;
    let cancelled = false;
    fetchTerritories().then((loaded) => {
      if (cancelled) return;
      setTerritories(loaded);
      setTerritoriesLoadedFor(session.email);
    });
    return () => {
      cancelled = true;
    };
  }, [session, territoriesLoadedFor]);

  useEffect(() => {
    if (!session?.email || notificationsLoadedFor === session.email) return;
    let cancelled = false;
    fetchNotifications().then((loaded) => {
      if (cancelled) return;
      // Session just started, so lastSeenNotificationCount is still its
      // reset-to-0 default — anything at all waiting counts as "new" this
      // once, matching the unread dot's own logic below.
      if (soundOn && loaded.length > 0) playNotificationChime();
      setNotifications(loaded);
      setNotificationsLoadedFor(session.email);
    });
    return () => {
      cancelled = true;
    };
  }, [session, notificationsLoadedFor]);

  // No websocket/live-push server exists (Vercel serverless functions
  // can't hold a persistent connection open) — polling the same endpoint
  // every 20s is the practical stand-in. Skips the fetch while the tab
  // isn't visible so a backgrounded tab doesn't keep hitting the API for
  // no one to see. Deliberately doesn't touch lastSeenNotificationCount —
  // that's "confirmed seen by opening the panel", not "the app happened
  // to refresh in the background".
  useEffect(() => {
    if (!session?.email) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchNotifications().then((loaded) => {
        if (soundOn && loaded.length > lastSeenNotificationCount) playNotificationChime();
        setNotifications(loaded);
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [session, soundOn, lastSeenNotificationCount]);

  useEffect(() => {
    if (!viewingTerritory || territoryLoadedFor === viewingTerritory) return;
    let cancelled = false;
    fetchProjects(viewingTerritory).then(({ projects: loaded }) => {
      if (cancelled) return;
      // Ids minted while visiting a territory (a new comment, a new
      // version) must not collide with ids already in ITS data, which the
      // load effect for your own account has no way to know about.
      nextId = Math.max(nextId, highestGenId(loaded) + 1);
      setTerritoryProjects(loaded);
      setTerritoryLoadedFor(viewingTerritory);
    });
    return () => {
      cancelled = true;
    };
  }, [viewingTerritory, territoryLoadedFor]);

  useEffect(() => {
    if (!viewingTerritory || territoryLoadedFor !== viewingTerritory) return;
    saveProjects(territoryProjects, viewingTerritory).catch(() => {
      // Network hiccup — same tradeoff as the own-account save effect below.
    });
  }, [territoryProjects, viewingTerritory, territoryLoadedFor]);

  // Visiting a teammate's territory swaps which project set the Grove/Focus
  // views render and edit — your own data underneath is untouched and
  // comes right back when you switch back to "My Grove". Creating a brand
  // new project or loading samples still only ever applies to your own
  // account (see the Header's "New project" button and the Grove's
  // "Load example projects" wiring below) — everything else (comments,
  // versions, status, archive, delete) is fully editable either way.
  const isVisitingOther = Boolean(viewingTerritory);
  const displayedProjects = isVisitingOther ? territoryProjects : projects;
  const visitingOwnerName = isVisitingOther
    ? territories.find((t) => t.ownerEmail === viewingTerritory)?.ownerName ?? viewingTerritory
    : null;

  const updateProjects = useCallback(
    (updater) => {
      if (isVisitingOther) {
        setTerritoryProjects((prev) => updater(prev));
      } else {
        setProjects((prev) => updater(prev));
      }
    },
    [isVisitingOther]
  );

  const focusedProject = destination ? displayedProjects.find((p) => p.id === destination.projectId) ?? null : null;
  const focusedVersion =
    destination?.kind === 'bloom' && focusedProject
      ? focusedProject.versions.find((v) => v.id === destination.versionId) ?? null
      : null;

  // The Grove canvas is invisible whenever Review is fully open (a
  // full-screen opaque overlay covers it) or Focus mode is showing
  // instead — in both cases it used to keep rendering anyway, burning
  // GPU for nothing and holding a WebGL context that can collide with
  // whatever an embedded website's own page does with WebGL (a live
  // site losing its own context can take the Grove's down with it under
  // the browser's shared per-tab context limit). It stays mounted
  // (rather than fully unmounting on every mode switch) specifically so
  // switching back to Grove doesn't pay the cost of recreating the WebGL
  // context and reloading the whole scene from scratch every time —
  // frameloop + visibility just pause and hide it instead.
  const groveHidden = mode !== 'grove' || (arrived && destination?.kind === 'bloom');

  const focus = useMemo(() => {
    if (!destination) return null;
    const project = displayedProjects.find((p) => p.id === destination.projectId);
    if (!project) return null;
    if (destination.kind === 'project') return { kind: 'project', project, instant: destination.instant };
    if (destination.kind === 'bloom') {
      const version = project.versions.find((v) => v.id === destination.versionId);
      if (!version) return null;
      const idx = project.versions.findIndex((v) => v.id === version.id);
      return { kind: 'bloom', project, version, position: getBloomWorldPosition(project, idx) };
    }
    return null;
  }, [destination, displayedProjects]);

  // The camera flight IS the navigation, but that's a purely visual cue —
  // a screen-reader user gets no signal that anything happened otherwise.
  // Waits for `arrived` in Grove mode so it announces once, on settle, not
  // mid-flight; Focus mode has no flight to wait for.
  const announcement = useMemo(() => {
    if (mode === 'grove' && !arrived) return '';
    if (!focus) return 'Grove overview';
    if (focus.kind === 'project') return `Opened project ${focus.project.name}`;
    if (focus.kind === 'bloom') return `Viewing version ${focus.version.label} of ${focus.project.name}`;
    return '';
  }, [mode, arrived, focus]);

  const reducedMotion = useReducedMotion();

  // One-time nudge pointing at the Cursor/Comment mode toggle, the first
  // time anyone on this account ever sees it — same one-time-flag pattern
  // as the celebration toasts above, just not a celebration.
  const [modeHintDismissed, setModeHintDismissed] = useState(false);
  const showCommentModeHint =
    !modeHintDismissed && Boolean(session?.email) && !hasCelebrated(session.email, 'comment-mode-hint');
  const dismissCommentModeHint = useCallback(() => {
    setModeHintDismissed(true);
    if (session?.email) markCelebrated(session.email, 'comment-mode-hint');
  }, [session]);

  // The API call already set the session cookie — this just updates local
  // state to match. The welcome popup is reserved for brand-new signups,
  // not every ordinary sign-in.
  const handleSignIn = useCallback((user, isNewUser) => {
    setSession(user);
    if (isNewUser) setShowWelcome(true);
  }, []);

  const handleSignOut = useCallback(() => {
    fetch('/api/auth/signout', { method: 'POST', credentials: 'include' }).catch(() => {
      // Best-effort — clearing local state below signs the user out of
      // this tab regardless of whether the request lands.
    });
    setSession(null);
    setProjects([]);
    setProjectsLoadedFor(null);
    setDestination(null);
    setArrived(true);
    setMode('grove');
  }, []);

  const handleResetGrove = useCallback(() => {
    setProjects([]);
    setDestination(null);
    setArrived(true);
  }, []);

  // Switching modes never leaves a camera flight half-finished waiting on
  // an `arrived` that'll never come, since Focus Mode never sets it.
  const handleChangeMode = useCallback((m) => {
    setArrived(true);
    setMode(m);
  }, []);

  const handleHoverStart = useCallback(
    (id) => {
      if (destination) return;
      setHoveredId(id);
    },
    [destination]
  );
  const handleHoverEnd = useCallback((id) => setHoveredId((cur) => (cur === id ? null : cur)), []);

  const handleSelect = useCallback(
    // `instant` is the shift-click fast path for a returning visitor who
    // already knows this tree and doesn't want to sit through the flight
    // again — the camera cuts straight there instead of tweening.
    (id, { instant } = {}) => {
      if (destination) return;
      setHoveredId(null);
      setArrived(false);
      setDestination({ kind: 'project', projectId: id, instant });
    },
    [destination]
  );

  const handleOpenReview = useCallback(
    (projectId, versionId, commentId) => {
      if (!arrived || destination?.kind !== 'project' || destination.projectId !== projectId) return;
      setArrived(false);
      setDestination({ kind: 'bloom', projectId, versionId, focusCommentId: commentId ?? null });
      // The NavDock that opens these is hidden on the Review surface (see
      // its render below) — closing them on the way in avoids a panel
      // being left stranded open there with no dock icon left to close it.
      setSettingsOpen(false);
      setNotificationsOpen(false);
      setSearchOpen(false);
    },
    [arrived, destination]
  );

  const handleBackToProject = useCallback(() => {
    if (!arrived || destination?.kind !== 'bloom') return;
    setArrived(false);
    setDestination({ kind: 'project', projectId: destination.projectId });
  }, [arrived, destination]);

  const handleGoHome = useCallback(() => {
    if (!arrived || !destination) return;
    setArrived(false);
    setDestination(null);
  }, [arrived, destination]);

  // Focus Mode's own navigation — plain state changes, no camera to wait
  // on, so none of the Grove handlers' `arrived`/`destination` guards apply.
  const handleFocusSelect = useCallback((id) => {
    setDestination({ kind: 'project', projectId: id });
  }, []);
  const handleFocusOpenReview = useCallback((projectId, versionId) => {
    setDestination({ kind: 'bloom', projectId, versionId });
    setSettingsOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
  }, []);
  const handleFocusBackToProject = useCallback(() => {
    setDestination((d) => (d?.kind === 'bloom' ? { kind: 'project', projectId: d.projectId } : d));
  }, []);
  const handleFocusGoHome = useCallback(() => {
    setDestination(null);
  }, []);

  // Search and notifications bypass the "already navigating" guards on
  // purpose — jumping straight there should work no matter where you
  // currently are, in either mode.
  const handleSearchSelect = useCallback((projectId) => {
    setSearchOpen(false);
    setHoveredId(null);
    setArrived(false);
    setDestination({ kind: 'project', projectId });
  }, []);

  const handleOpenFromNotification = useCallback((projectId, versionId) => {
    setHoveredId(null);
    setArrived(false);
    setDestination({ kind: 'bloom', projectId, versionId });
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setSettingsOpen(false);
    setNotificationsOpen((v) => {
      const next = !v;
      if (next) {
        // Opening the panel is also the moment to check for anything new
        // — there's no live push, so this is the freshest a "real-time"
        // feel gets without a websocket — and to clear the unread dot.
        // A chime here plays exactly when more turned up than were last
        // confirmed seen, same comparison the unread dot itself uses.
        fetchNotifications().then((loaded) => {
          if (soundOn && loaded.length > lastSeenNotificationCount) playNotificationChime();
          setNotifications(loaded);
          setLastSeenNotificationCount(loaded.length);
        });
      }
      return next;
    });
  }, [soundOn, lastSeenNotificationCount]);
  const handleToggleSettings = useCallback(() => {
    setNotificationsOpen(false);
    setSettingsOpen((v) => !v);
  }, []);
  const handleToggleSound = useCallback(() => setSoundOn((v) => !v), []);

  // Switching territory resets the previously-loaded territory data so the
  // load effect above fetches fresh for whoever's next — otherwise a quick
  // switch could briefly show the last-visited teammate's projects under
  // the new one's name. "You entered X's territory" is just local flavor
  // for the visitor; the owner gets a REAL, persisted notification (see
  // api/notifications.js) — they'll see it was you next time they check,
  // not a simulated "noticed you" that nobody on the other end ever saw.
  const handleChangeTerritory = useCallback(
    (ownerEmail) => {
      setDestination(null);
      setArrived(true);
      setHoveredId(null);
      setViewingTerritory(ownerEmail);
      setTerritoryProjects([]);
      setTerritoryLoadedFor(null);
      if (ownerEmail) {
        const owner = territories.find((t) => t.ownerEmail === ownerEmail);
        const ownerName = owner?.ownerName ?? ownerEmail;
        setTerritoryNotices((prev) => [
          { id: genId('notice'), text: `You entered ${ownerName}'s territory.`, createdAt: new Date().toISOString() },
          ...prev,
        ]);
        notify(ownerEmail, `${userName} visited your territory.`);
      }
    },
    [territories, userName]
  );

  // Lets an impatient user finish the current camera flight — or the
  // seed-germinating-into-a-tree animation right after planting — instantly
  // instead of waiting it out. The "living workspace" feel stays for anyone
  // who doesn't mind it, but nobody's stuck watching it.
  const handleSkip = useCallback(() => {
    cameraRigRef.current?.skip();
    if (germinationTimeoutRef.current) {
      clearTimeout(germinationTimeoutRef.current);
      germinationTimeoutRef.current = null;
      setJustPlantedId((cur) => {
        if (cur) setCreatingVersionFor(cur);
        return null;
      });
    }
  }, []);

  // Real, local-session mutations — no backend yet, so state lives here and
  // resets on reload, but adding a comment or a version genuinely updates
  // the data (new butterfly/bloom render immediately) rather than mocking it.
  const handleAddComment = useCallback(
    (projectId, versionId, { text, tag, x, y }) => {
      updateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              const comment = { id: genId('c'), author: userName, text, resolved: false, replies: [] };
              if (tag) comment.tag = tag;
              if (x != null) {
                comment.x = x;
                comment.y = y;
              }
              return { ...v, comments: [...v.comments, comment] };
            }),
          };
        })
      );
      // Only when it's actually someone else's project — commenting on
      // your own Grove has no one to notify, same as the territory-visit
      // notice above only firing when visiting someone else's.
      if (isVisitingOther && viewingTerritory) {
        const project = displayedProjects.find((p) => p.id === projectId);
        const version = project?.versions.find((v) => v.id === versionId);
        const where = version ? `${project.name} - ${version.label}` : project?.name ?? 'your project';
        notify(viewingTerritory, `${userName} commented on "${where}".`);
      }
    },
    [userName, updateProjects, isVisitingOther, viewingTerritory, displayedProjects]
  );

  // Resolved is a plain boolean now, not a staged workflow — the old
  // open/assigned/reviewed states never really got used as a workflow, and
  // replies (see handleAddReply below) carry whatever nuance those stages
  // were trying to capture. `resolvedBy` records who last resolved it, for
  // the same reason `statusBy` used to; it clears on reopen since a stale
  // "resolved by X" would be misleading once it's open again.
  const handleResolveComment = useCallback(
    (projectId, versionId, commentId, resolved) => {
      updateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              return {
                ...v,
                comments: v.comments.map((c) =>
                  c.id !== commentId ? c : { ...c, resolved, resolvedBy: resolved ? userName : undefined }
                ),
              };
            }),
          };
        })
      );
    },
    [userName, updateProjects]
  );

  // Replies replace the old formal "assignee" field — "@Aravindan can you
  // take this" as a reply does the same delegation job without a separate,
  // redundant control, and doubles as the actual back-and-forth a bare
  // assignee name never captured.
  const handleAddReply = useCallback(
    (projectId, versionId, commentId, text, parentReplyPath = []) => {
      const newReply = { id: genId('r'), author: userName, text, replies: [] };
      updateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              return {
                ...v,
                comments: v.comments.map((c) =>
                  c.id !== commentId ? c : { ...c, replies: addReplyAtPath(c.replies ?? [], parentReplyPath, newReply) }
                ),
              };
            }),
          };
        })
      );

      // Notify whoever left the specific comment/reply this one is
      // actually replying to — not always the top-level comment's author,
      // since a reply can itself be replied to.
      const project = displayedProjects.find((p) => p.id === projectId);
      const version = project?.versions.find((v) => v.id === versionId);
      const comment = version?.comments.find((c) => c.id === commentId);
      if (comment) {
        const targetAuthor = findReplyTargetAuthor(comment, parentReplyPath);
        const targetEmail = territories.find((t) => t.ownerName === targetAuthor)?.ownerEmail;
        if (targetAuthor !== userName && targetEmail) {
          notify(targetEmail, `${userName} replied to your comment on "${project.name}".`);
        }
      }
    },
    [userName, updateProjects, displayedProjects, territories]
  );

  const handleCreateVersion = useCallback(
    (projectId, payload) => {
      updateProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const version = {
            id: genId('v'),
            label: payload.label,
            status: payload.status,
            owner: userName,
            createdAt: 'Just now',
            // Real, sortable timestamp — `createdAt` above stays a fixed
            // display string (existing behavior for versions already
            // shown elsewhere), but "how long ago" for staleness/withering
            // needs actual math to do, not a frozen label.
            createdAtISO: new Date().toISOString(),
            comments: [],
          };
          if (payload.description) version.description = payload.description;
          if (payload.changelog) version.changelog = payload.changelog;
          if (payload.assetUrl) {
            version.assetUrl = payload.assetUrl;
            version.assetName = payload.assetName;
            version.assetType = payload.assetType;
          }
          const versions = [...p.versions, version];
          return { ...p, versions, versionCount: versions.length };
        })
      );
      setCreatingVersionFor(null);
      if (!isVisitingOther && session?.email && !hasCelebrated(session.email, 'first-version')) {
        markCelebrated(session.email, 'first-version');
        setCelebration({
          title: 'Your first version is live!',
          text: 'A bloom just opened on the tree — click it any time to see this version again, or leave a comment right on it.',
        });
      }
    },
    [userName, updateProjects, isVisitingOther, session]
  );

  // Removing a version also backs out of it if it's the one currently
  // open in Review (Grove or Focus — both key off the same `destination`).
  // A project can't stand with zero versions — deleting the last one
  // removes the project itself, and its tree vanishes from the Grove.
  const handleDeleteVersion = useCallback(
    (projectId, versionId) => {
      const project = displayedProjects.find((p) => p.id === projectId);
      const isLastVersion = (project?.versions.length ?? 0) <= 1;

      updateProjects((prev) =>
        prev.flatMap((p) => {
          if (p.id !== projectId) return [p];
          const versions = p.versions.filter((v) => v.id !== versionId);
          if (versions.length === 0) return [];
          return [{ ...p, versions, versionCount: versions.length }];
        })
      );

      setDestination((d) => {
        if (!d || d.projectId !== projectId) return d;
        if (isLastVersion) return null;
        if (d.kind === 'bloom' && d.versionId === versionId) return { kind: 'project', projectId };
        return d;
      });
      if (isLastVersion) setArrived(false);
    },
    [displayedProjects, updateProjects]
  );

  // A direct way to remove a whole project in one step — deleting every
  // version one at a time (the only option before) worked but was tedious.
  const handleDeleteProject = useCallback(
    (projectId) => {
      updateProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDestination((d) => (d?.projectId === projectId ? null : d));
      setArrived(true);
    },
    [updateProjects]
  );

  // Archived is an organizational status, not a lock — an archived project
  // still opens, still takes new versions/comments, it just drops out of
  // Focus mode's default project list (see FocusDashboard's "Archived"
  // filter) until restored. Grove's 3D view is unaffected on purpose —
  // archiving is a Focus-mode list concept, not "delete the tree."
  const handleToggleArchive = useCallback(
    (projectId) => {
      updateProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, archived: !p.archived } : p)));
    },
    [updateProjects]
  );

  const creatingVersionProject = creatingVersionFor
    ? displayedProjects.find((p) => p.id === creatingVersionFor) ?? null
    : null;

  // A convenience for seeing a populated Grove without planting anything
  // by hand — only offered while the Grove is actually empty. Tagged
  // `isSample` so a new user who's done poking around can clear them out
  // in one action instead of hunting for a per-version delete button.
  const handleLoadExamples = useCallback(() => {
    setProjects(seedProjects.map((p) => ({ ...p, isSample: true })));
  }, []);

  const handleRemoveSampleProjects = useCallback(() => {
    setProjects((prev) => prev.filter((p) => !p.isSample));
    setDestination((d) => {
      if (!d) return d;
      const stillExists = projects.find((p) => p.id === d.projectId && !p.isSample);
      return stillExists ? d : null;
    });
  }, [projects]);

  // A new tree in the Grove — starts with one draft version so it renders
  // and behaves like every other project immediately, then jumps to it
  // (camera flight in Grove mode, instant switch in Focus mode).
  // A new tree starts with NO version — an auto-generated placeholder
  // draft had nothing real in it (no name, no description, nothing to
  // click into) and no way to edit it after the fact. Instead, the "New
  // version" form — which already asks for name/description/what
  // changed/status/file — opens immediately so the user's first version
  // is real from the start.
  const handleCreateProject = useCallback(
    ({ name, status, color }) => {
      const id = genId('project');
      setProjects((prev) => [
        ...prev,
        {
          id,
          name,
          status,
          color,
          versionCount: 0,
          position: nextProjectPosition(prev.length),
          versions: [],
        },
      ]);
      setCreatingProject(false);
      setHoveredId(null);
      setArrived(false);
      setDestination({ kind: 'project', projectId: id });
      if (session?.email && !hasCelebrated(session.email, 'first-project')) {
        markCelebrated(session.email, 'first-project');
        setCelebration({
          title: 'Your first project is planted!',
          text: 'A new tree just took root in your Grove. Add a version next to give it something to show.',
        });
      }
      // Reduced motion skips the seed animation outright — the "New version"
      // form (which is where a project's first real content comes from) can
      // open immediately. Otherwise it waits for the seed-into-tree sequence
      // to actually be watched, not buried under a modal the instant it starts.
      if (reducedMotion) {
        setCreatingVersionFor(id);
        return;
      }
      setJustPlantedId(id);
      const seedDurationMs = (GERMINATION_SCENE_URL ? GERMINATION_SCENE_DURATION : 2.5) * 1000;
      germinationTimeoutRef.current = setTimeout(() => {
        germinationTimeoutRef.current = null;
        setJustPlantedId((cur) => (cur === id ? null : cur));
        setCreatingVersionFor(id);
      }, seedDurationMs);
    },
    [reducedMotion, session]
  );

  // Blank while the /api/auth/me check is in flight — avoids flashing the
  // sign-in screen for someone who's already got a valid session cookie.
  if (!sessionChecked) {
    return <div className="h-full w-full" style={{ background: 'linear-gradient(to bottom, #FDF6EC 0%, #F3E9D8 100%)' }} />;
  }

  if (!userName) {
    return <SignInScreen onSignIn={handleSignIn} />;
  }

  // No panel/modal is covering the Grove and no tree is still mid-germination
  // — the moment either is true, the persistent name plates would otherwise
  // float on top of it (drei's Html portals ignore normal CSS stacking).
  const showNameTags = !destination && !creatingProject && !creatingVersionFor && !justPlantedId;

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="relative h-full w-full"
      style={{ background: `linear-gradient(to bottom, ${sky.top} 0%, ${sky.bottom} 100%)` }}
    >
      {/* Announces navigation changes for screen-reader users — the camera
          flight that signals this visually has no equivalent otherwise. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <Header
        name={userName}
        hour={hour}
        mode={mode}
        onChangeMode={handleChangeMode}
        onCreateProject={() => setCreatingProject(true)}
        territories={territories}
        viewingTerritory={viewingTerritory}
        onChangeTerritory={handleChangeTerritory}
      />

      {/* The canvas is decorative as far as assistive tech is concerned —
          it's WebGL pixels with no accessibility tree, and every action it
          offers (select a project) has a real keyboard/AT equivalent in
          GroveAccessibleNav below. Hiding it here stops screen readers
          from trying (and failing) to describe it.
          Always mounted (not just while mode === 'grove') and toggled via
          `invisible` + a paused frame loop instead — switching modes used
          to fully tear down and recreate the whole WebGL scene every time,
          which is exactly the ~1s stall switching Focus -> Grove: rebuilding
          geometry/shadows/the GL context from nothing. Keeping it alive
          and just hiding it makes every mode switch after the first one
          instant. */}
      <div aria-hidden="true" className={`absolute inset-0 ${groveHidden ? 'invisible' : ''}`}>
        <Canvas
          shadows
          camera={{ position: [OVERVIEW_POS.x, OVERVIEW_POS.y, OVERVIEW_POS.z], fov: 42 }}
          gl={{ alpha: true, antialias: true }}
          frameloop={groveHidden ? 'never' : 'always'}
        >
          <GroveScene
            projects={displayedProjects}
            hoveredId={hoveredId}
            focusedProjectId={destination?.projectId ?? null}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            onSelect={handleSelect}
            onOpenReview={handleOpenReview}
            onLoadExamples={isVisitingOther ? undefined : handleLoadExamples}
            showEmptyCard={!showWelcome}
            justPlantedId={justPlantedId}
            allowOrbit={mode === 'grove' && !destination}
            reducedMotion={reducedMotion}
            showNameTags={showNameTags}
            elevation={elevation}
            sky={sky}
            isNight={isNight}
          />
          <CameraRig
            ref={cameraRigRef}
            focus={focus}
            onSettled={() => setArrived(true)}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>

      {mode === 'grove' ? (
        <>
          {!destination && <GroveAccessibleNav projects={displayedProjects} onSelect={handleSelect} />}

          <AnimatePresence mode="wait">
            {arrived && destination?.kind === 'project' && focusedProject && (
              <ProjectOverlay
                key="project"
                project={focusedProject}
                onBack={handleGoHome}
                onOpenVersion={(versionId) => handleOpenReview(focusedProject.id, versionId)}
                onOpenComment={(versionId, commentId) => handleOpenReview(focusedProject.id, versionId, commentId)}
                onRequestNewVersion={() => setCreatingVersionFor(focusedProject.id)}
                onDeleteVersion={(versionId) => handleDeleteVersion(focusedProject.id, versionId)}
                onDeleteProject={handleDeleteProject}
                visitingOwnerName={visitingOwnerName}
              />
            )}
            {arrived && destination?.kind === 'bloom' && focusedProject && focusedVersion && (
              <ReviewOverlay
                key="review"
                project={focusedProject}
                version={focusedVersion}
                onBack={handleBackToProject}
                onAddComment={(payload) => handleAddComment(focusedProject.id, focusedVersion.id, payload)}
                onResolveComment={(commentId, resolved) =>
                  handleResolveComment(focusedProject.id, focusedVersion.id, commentId, resolved)
                }
                onAddReply={(commentId, text, path) =>
                  handleAddReply(focusedProject.id, focusedVersion.id, commentId, text, path)
                }
                readOnly={false}
                visitingOwnerName={visitingOwnerName}
                initialFocusCommentId={destination.focusCommentId}
                showModeHint={showCommentModeHint}
                onDismissModeHint={dismissCommentModeHint}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(!arrived || justPlantedId) && (
              <motion.button
                type="button"
                onClick={handleSkip}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="glass-surface fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium text-stone-600 transition-colors hover:text-stone-900"
              >
                Skip <ChevronsRight size={13} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      ) : (
        // The root document never scrolls (see index.css) — the Grove relies
        // on that to keep the 3D view pinned, but Focus mode's content is a
        // normal flowing page that can run taller than the viewport (e.g. a
        // review with several comments), so it needs its own scroll container
        // or the bottom of the page — including the "Add a comment" box —
        // ends up clipped behind the fixed NavDock with no way to reach it.
        <div className="absolute inset-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!destination && (
              <FocusDashboard
                key="dashboard"
                projects={displayedProjects}
                userName={userName}
                onOpenProject={handleFocusSelect}
                onRemoveSamples={isVisitingOther ? undefined : handleRemoveSampleProjects}
              />
            )}
            {destination?.kind === 'project' && focusedProject && (
              <FocusProjectView
                key="project"
                project={focusedProject}
                onBack={handleFocusGoHome}
                onOpenVersion={(versionId) => handleFocusOpenReview(focusedProject.id, versionId)}
                onRequestNewVersion={() => setCreatingVersionFor(focusedProject.id)}
                onDeleteVersion={(versionId) => handleDeleteVersion(focusedProject.id, versionId)}
                onDeleteProject={handleDeleteProject}
                onToggleArchive={handleToggleArchive}
                visitingOwnerName={visitingOwnerName}
              />
            )}
            {destination?.kind === 'bloom' && focusedProject && focusedVersion && (
              <FocusReviewView
                key="review"
                project={focusedProject}
                version={focusedVersion}
                onBack={handleFocusBackToProject}
                onAddComment={(payload) => handleAddComment(focusedProject.id, focusedVersion.id, payload)}
                onResolveComment={(commentId, resolved) =>
                  handleResolveComment(focusedProject.id, focusedVersion.id, commentId, resolved)
                }
                onAddReply={(commentId, text, path) =>
                  handleAddReply(focusedProject.id, focusedVersion.id, commentId, text, path)
                }
                readOnly={false}
                visitingOwnerName={visitingOwnerName}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            projects={displayedProjects}
            onSelect={handleSearchSelect}
            onClose={() => setSearchOpen(false)}
            anchorLeft={destination?.kind === 'bloom'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatingVersionProject && (
          <CreateVersionModal
            suggestedLabel={suggestNextLabel(creatingVersionProject)}
            onCreate={(payload) => handleCreateVersion(creatingVersionProject.id, payload)}
            onClose={() => setCreatingVersionFor(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatingProject && (
          <CreateProjectModal onCreate={handleCreateProject} onClose={() => setCreatingProject(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notificationsOpen && (
          <NotificationsPanel
            projects={projects}
            territoryNotices={territoryNotices}
            notifications={notifications}
            onOpen={handleOpenFromNotification}
            onClose={() => setNotificationsOpen(false)}
            anchorLeft={destination?.kind === 'bloom'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel
            userName={userName}
            onSignOut={handleSignOut}
            onResetGrove={handleResetGrove}
            onClose={() => setSettingsOpen(false)}
            anchorLeft={destination?.kind === 'bloom'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{showWelcome && <WelcomeToast name={userName} onDismiss={() => setShowWelcome(false)} />}</AnimatePresence>

      <AnimatePresence>
        {celebration && (
          <CelebrationToast
            title={celebration.title}
            text={celebration.text}
            onDismiss={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>

      {/* Hidden on the Review surface (destination.kind === 'bloom') on
          product-design advice — Home/Search/Settings/Sound/Notifications
          are all global-app concerns that don't belong on a focused
          annotation canvas, and the dock's bottom-center position was a
          real click target collision with pins dropped near the bottom
          of an asset. Getting back out is already covered by the Review
          surface's own back arrow. */}
      {destination?.kind !== 'bloom' && (
        <NavDock
          onHome={mode === 'grove' ? handleGoHome : handleFocusGoHome}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenNotifications={handleToggleNotifications}
          onOpenSettings={handleToggleSettings}
          hasUnreadNotifications={notifications.length > lastSeenNotificationCount}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
        />
      )}
    </div>
    </MotionConfig>
  );
}
