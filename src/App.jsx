import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ChevronsRight } from 'lucide-react';
import GroveScene from './scenes/GroveScene';
import CameraRig, { OVERVIEW_POS } from './scenes/CameraRig';
import useReducedMotion from './hooks/useReducedMotion';
import useAmbientChirps from './hooks/useAmbientChirps';
import useTimeOfDay from './hooks/useTimeOfDay';
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
import NotificationsPanel from './components/NotificationsPanel';
import SettingsPanel from './components/SettingsPanel';
import FocusDashboard from './focus/FocusDashboard';
import FocusProjectView from './focus/FocusProjectView';
import FocusReviewView from './focus/FocusReviewView';
import { projects as seedProjects } from './data/projects';
import { TEAMMATE_PROJECTS, TEAMMATES } from './data/teammates';
import { getBloomWorldPosition } from './utils/treeGeometry';

let nextId = 1000;
const genId = (prefix) => `${prefix}-${nextId++}`;

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
async function fetchProjects() {
  const res = await fetch('/api/projects', { credentials: 'include' });
  if (res.status === 401) return { projects: [], sessionInvalid: true };
  if (!res.ok) return { projects: [], sessionInvalid: false };
  const data = await res.json();
  // A project with zero versions shouldn't exist — filtered here too
  // (not just at delete-time) so any such record from an older save
  // cleans itself up the next time the Grove loads.
  const projects = Array.isArray(data.projects) ? data.projects.filter((p) => p.versions.length > 0) : [];
  return { projects, sessionInvalid: false };
}

async function saveProjects(projects) {
  const res = await fetch('/api/projects', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects }),
  });
  return { sessionInvalid: res.status === 401 };
}

// Mock "invited" teammates for the Collaboration settings section — local
// only, no email is ever actually sent.
const COLLAB_KEY = 'prelude-collaborators';

function loadCollaborators() {
  try {
    const raw = localStorage.getItem(COLLAB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
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
  const [viewingTerritory, setViewingTerritory] = useState(null);
  const [territoryNotices, setTerritoryNotices] = useState([]);
  const [collaborators, setCollaborators] = useState(() => loadCollaborators());
  const cameraRigRef = useRef(null);
  const germinationTimeoutRef = useRef(null);
  const { hour, elevation, sky } = useTimeOfDay();

  useAmbientChirps(soundOn && mode === 'grove');

  useEffect(() => {
    try {
      localStorage.setItem(COLLAB_KEY, JSON.stringify(collaborators));
    } catch {
      // ignore
    }
  }, [collaborators]);

  // Browsing a teammate's territory is read-only and swaps which project
  // set the Grove/Focus views render — your own data underneath is
  // untouched and comes right back when you switch back to "My Grove".
  const readOnly = Boolean(viewingTerritory);
  const displayedProjects = viewingTerritory ? TEAMMATE_PROJECTS[viewingTerritory] ?? [] : projects;

  const focusedProject = destination ? displayedProjects.find((p) => p.id === destination.projectId) ?? null : null;
  const focusedVersion =
    destination?.kind === 'bloom' && focusedProject
      ? focusedProject.versions.find((v) => v.id === destination.versionId) ?? null
      : null;

  const focus = useMemo(() => {
    if (!destination) return null;
    const project = displayedProjects.find((p) => p.id === destination.projectId);
    if (!project) return null;
    if (destination.kind === 'project') return { kind: 'project', project };
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
    (id) => {
      if (destination) return;
      setHoveredId(null);
      setArrived(false);
      setDestination({ kind: 'project', projectId: id });
    },
    [destination]
  );

  const handleOpenReview = useCallback(
    (projectId, versionId) => {
      if (!arrived || destination?.kind !== 'project' || destination.projectId !== projectId) return;
      setArrived(false);
      setDestination({ kind: 'bloom', projectId, versionId });
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
    setNotificationsOpen((v) => !v);
  }, []);
  const handleToggleSettings = useCallback(() => {
    setNotificationsOpen(false);
    setSettingsOpen((v) => !v);
  }, []);
  const handleToggleSound = useCallback(() => setSoundOn((v) => !v), []);

  // Simulates the "vice versa" notification a real teammate would get if
  // they had a real account — there's nobody real on the other end, so
  // this just fakes both halves of the exchange for you to see the idea.
  const handleChangeTerritory = useCallback((teammateId) => {
    setDestination(null);
    setArrived(true);
    setHoveredId(null);
    setViewingTerritory(teammateId);
    if (teammateId) {
      const teammate = TEAMMATES.find((t) => t.id === teammateId);
      const enterId = genId('notice');
      setTerritoryNotices((prev) => [{ id: enterId, text: `You entered ${teammate.name}'s territory.` }, ...prev]);
      setTimeout(() => {
        setTerritoryNotices((prev) => [
          { id: genId('notice'), text: `${teammate.name} noticed you exploring their grove.` },
          ...prev,
        ]);
      }, 3000);
    }
  }, []);

  const handleInviteCollaborator = useCallback((email) => {
    setCollaborators((prev) => (prev.includes(email) ? prev : [...prev, email]));
  }, []);
  const handleRemoveCollaborator = useCallback((email) => {
    setCollaborators((prev) => prev.filter((c) => c !== email));
  }, []);

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
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              const comment = { id: genId('c'), author: userName, text, status: 'open' };
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
    },
    [userName]
  );

  // Cycles a comment through open -> assigned -> reviewed -> resolved.
  // Every transition records who made it (`statusBy`) so the trail is
  // visible — "Reviewed by X", "Resolved by X". Who it's assigned TO is a
  // separate decision — see handleAssignComment below.
  const handleCycleCommentStatus = useCallback(
    (projectId, versionId, commentId, newStatus) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              return {
                ...v,
                comments: v.comments.map((c) =>
                  c.id !== commentId
                    ? c
                    : { ...c, status: newStatus, resolved: newStatus === 'resolved', statusBy: userName }
                ),
              };
            }),
          };
        })
      );
    },
    [userName]
  );

  // Assigning a COMMENT to a teammate (not a whole version — a version is
  // owned by whoever created it, but any individual piece of feedback on
  // it can be handed to someone specific to act on). Picking a real name
  // also nudges the comment to "assigned" if it was still sitting "open";
  // picking "Unassigned" clears it without touching status otherwise.
  const handleAssignComment = useCallback(
    (projectId, versionId, commentId, assigneeName) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            versions: p.versions.map((v) => {
              if (v.id !== versionId) return v;
              return {
                ...v,
                comments: v.comments.map((c) => {
                  if (c.id !== commentId) return c;
                  if (!assigneeName) {
                    const { assignee, assignedBy, ...rest } = c;
                    return rest;
                  }
                  return {
                    ...c,
                    assignee: assigneeName,
                    assignedBy: userName,
                    status: c.status === 'open' || !c.status ? 'assigned' : c.status,
                  };
                }),
              };
            }),
          };
        })
      );
    },
    [userName]
  );

  const handleCreateVersion = useCallback(
    (projectId, payload) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const version = {
            id: genId('v'),
            label: payload.label,
            status: payload.status,
            owner: userName,
            createdAt: 'Just now',
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
    },
    [userName]
  );

  // Removing a version also backs out of it if it's the one currently
  // open in Review (Grove or Focus — both key off the same `destination`).
  // A project can't stand with zero versions — deleting the last one
  // removes the project itself, and its tree vanishes from the Grove.
  const handleDeleteVersion = useCallback(
    (projectId, versionId) => {
      const project = projects.find((p) => p.id === projectId);
      const isLastVersion = (project?.versions.length ?? 0) <= 1;

      setProjects((prev) =>
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
    [projects]
  );

  // A direct way to remove a whole project in one step — deleting every
  // version one at a time (the only option before) worked but was tedious.
  const handleDeleteProject = useCallback((projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setDestination((d) => (d?.projectId === projectId ? null : d));
    setArrived(true);
  }, []);

  // Archived is an organizational status, not a lock — an archived project
  // still opens, still takes new versions/comments, it just drops out of
  // Focus mode's default project list (see FocusDashboard's "Archived"
  // filter) until restored. Grove's 3D view is unaffected on purpose —
  // archiving is a Focus-mode list concept, not "delete the tree."
  const handleToggleArchive = useCallback((projectId) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, archived: !p.archived } : p)));
  }, []);

  const creatingVersionProject = creatingVersionFor ? projects.find((p) => p.id === creatingVersionFor) ?? null : null;

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
    [reducedMotion]
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
        viewingTerritory={viewingTerritory}
        onChangeTerritory={handleChangeTerritory}
      />

      {mode === 'grove' ? (
        <>
          {/* The canvas is decorative as far as assistive tech is concerned
              — it's WebGL pixels with no accessibility tree, and every
              action it offers (select a project) has a real keyboard/AT
              equivalent in GroveAccessibleNav below. Hiding it here stops
              screen readers from trying (and failing) to describe it. */}
          <div aria-hidden="true" className="absolute inset-0">
            <Canvas
              shadows
              camera={{ position: [OVERVIEW_POS.x, OVERVIEW_POS.y, OVERVIEW_POS.z], fov: 42 }}
              gl={{ alpha: true, antialias: true }}
            >
              <GroveScene
                projects={displayedProjects}
                hoveredId={hoveredId}
                focusedProjectId={destination?.projectId ?? null}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
                onSelect={handleSelect}
                onOpenReview={handleOpenReview}
                onLoadExamples={readOnly ? undefined : handleLoadExamples}
                justPlantedId={justPlantedId}
                allowOrbit={!destination}
                reducedMotion={reducedMotion}
                showNameTags={showNameTags}
                elevation={elevation}
                sky={sky}
              />
              <CameraRig
                ref={cameraRigRef}
                focus={focus}
                onSettled={() => setArrived(true)}
                reducedMotion={reducedMotion}
              />
            </Canvas>
          </div>

          {!destination && <GroveAccessibleNav projects={displayedProjects} onSelect={handleSelect} />}

          <AnimatePresence mode="wait">
            {arrived && destination?.kind === 'project' && focusedProject && (
              <ProjectOverlay
                key="project"
                project={focusedProject}
                onBack={handleGoHome}
                onOpenVersion={(versionId) => handleOpenReview(focusedProject.id, versionId)}
                onRequestNewVersion={() => setCreatingVersionFor(focusedProject.id)}
                onDeleteVersion={(versionId) => handleDeleteVersion(focusedProject.id, versionId)}
                onDeleteProject={readOnly ? undefined : handleDeleteProject}
                readOnly={readOnly}
              />
            )}
            {arrived && destination?.kind === 'bloom' && focusedProject && focusedVersion && (
              <ReviewOverlay
                key="review"
                project={focusedProject}
                version={focusedVersion}
                onBack={handleBackToProject}
                onAddComment={(payload) => handleAddComment(focusedProject.id, focusedVersion.id, payload)}
                onCycleCommentStatus={(commentId, newStatus) =>
                  handleCycleCommentStatus(focusedProject.id, focusedVersion.id, commentId, newStatus)
                }
                onAssignComment={(commentId, assigneeName) =>
                  handleAssignComment(focusedProject.id, focusedVersion.id, commentId, assigneeName)
                }
                readOnly={readOnly}
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
                transition={{ duration: 0.2, delay: 0.3 }}
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
                onRemoveSamples={readOnly ? undefined : handleRemoveSampleProjects}
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
                onDeleteProject={readOnly ? undefined : handleDeleteProject}
                onToggleArchive={readOnly ? undefined : handleToggleArchive}
                readOnly={readOnly}
              />
            )}
            {destination?.kind === 'bloom' && focusedProject && focusedVersion && (
              <FocusReviewView
                key="review"
                project={focusedProject}
                version={focusedVersion}
                onBack={handleFocusBackToProject}
                onAddComment={(payload) => handleAddComment(focusedProject.id, focusedVersion.id, payload)}
                onCycleCommentStatus={(commentId, newStatus) =>
                  handleCycleCommentStatus(focusedProject.id, focusedVersion.id, commentId, newStatus)
                }
                onAssignComment={(commentId, assigneeName) =>
                  handleAssignComment(focusedProject.id, focusedVersion.id, commentId, assigneeName)
                }
                readOnly={readOnly}
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
            collaborators={collaborators}
            onInvite={handleInviteCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
            anchorLeft={destination?.kind === 'bloom'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{showWelcome && <WelcomeToast name={userName} onDismiss={() => setShowWelcome(false)} />}</AnimatePresence>

      <NavDock
        onHome={mode === 'grove' ? handleGoHome : handleFocusGoHome}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenNotifications={handleToggleNotifications}
        onOpenSettings={handleToggleSettings}
        soundOn={soundOn}
        onToggleSound={handleToggleSound}
        asideForReview={destination?.kind === 'bloom'}
      />
    </div>
    </MotionConfig>
  );
}
