# 🌳 Prelude Workspace

**Prelude Workspace** is Zuper's internal design-review tool — a 3D "living workspace" where every project in review is a tree, every version is a bloom, and every comment is a butterfly pinned to the exact spot it's about.

If that sentence sounds unusual, don't worry — this README explains exactly what that means, how the app is built, and how to run it yourself, assuming you've never seen the codebase before.

**Live app:** https://prelude-workspace.vercel.app/
**Sign-in:** restricted to `@zuper.co` email addresses.

---

## Table of contents

1. [What is Prelude, really?](#what-is-prelude-really)
2. [The nature metaphor, explained](#the-nature-metaphor-explained)
3. [Key features](#key-features)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [How data flows through the app](#how-data-flows-through-the-app)
7. [Running it locally](#running-it-locally)
8. [Environment variables](#environment-variables)
9. [Database setup](#database-setup)
10. [Deploying](#deploying)
11. [Known limitations](#known-limitations)
12. [Credits](#credits)

---

## What is Prelude, really?

Underneath the visuals, Prelude is a completely ordinary design-review app. It stores four kinds of things:

| Plain term | What it is |
|---|---|
| **Project** | A thing being designed — e.g. "Onboarding Redesign" |
| **Version** | A specific draft of that project — e.g. "v1.2", with a prototype attached (an image, a video, or a link to a live site) |
| **Comment** | A piece of feedback left on a version, at a specific x/y point on the prototype |
| **Status** | The state of a comment (Open → Assigned → Reviewed → Resolved) or a version (Draft / In review / Published) |

That's it. No part of the actual data model cares about trees or butterflies — that's purely how it's *drawn on screen*. You could point a completely different UI at the same backend and it would just look like a normal Trello-meets-Figma-comments tool.

There are two different "front doors" onto that same data:

- **Grove** — the 3D forest view. Fun, ambient, good for a first impression or a team demo.
- **Focus** — a flat, conventional list-and-filter dashboard. No 3D, nothing to fly through — just the fastest way to actually get work done.

Switch between them any time with the toggle at the top of the screen. Same data, same account, two different lenses on it.

## The nature metaphor, explained

| In the Grove (3D) | What it actually represents |
|---|---|
| 🌲 A tree | A **project** |
| 🌸 A bloom/flower on the tree | A **version** of that project |
| 🦋 A butterfly pinned on a bloom | A **comment** on that version, at the exact point you clicked |
| Tree growing from a seed | A brand-new project you just created |
| Day/night cycle, birds, ambient butterflies | Pure atmosphere — no data meaning at all |

Clicking anywhere on a version's prototype (an image, a video, or an embedded webpage) drops a comment pin exactly there — like leaving a sticky note on the precise part of the design you're talking about.

## Key features

- **Real accounts, real backend.** Sign-up/sign-in is backed by a real Postgres database, with passwords hashed (bcrypt) and sessions signed with JWT — not a demo shell. Restricted to `@zuper.co` email addresses.
- **Everything persists.** Projects, versions, comments, and notifications are all stored server-side, not in the browser — sign in from any device and it's all there.
- **Collaboration, internal-tool style.** Since this is only ever used inside one company, *any* signed-in account can view and fully edit *any other* account's "territory" (their Grove) via the **Territory switcher** in the header — no invite step, no separate permission levels. A persistent amber banner always reminds you when you're editing someone else's projects, and destructive actions (archive/delete) ask for confirmation first.
- **Real notifications.** Visiting a teammate's territory sends them an actual notification (with an unread-dot badge on the bell icon) — not a simulated one.
- **Comment tooling.** Tag a comment as *Note*, *UI improvement*, or *Improvement*; cycle it through Open → Assigned → Reviewed → Resolved (fully reversible); assign it to anyone at the company.
- **Any kind of prototype asset.** Upload an image or video, or just paste a link to a live website — Prelude will embed it. Clicking anywhere on it drops a comment by default; a toggle button switches to letting you actually scroll/play/interact with the embedded content when you need to.
- **Two ways to browse:** the 3D **Grove**, or the flat **Focus** dashboard with filters (All / Active / Archived / My Projects / Needs Review / Recently Updated) and sorting.
- **Onboarding that doesn't get in the way.** A short, dismissible 2-step tour for brand-new accounts, plus one-time celebration toasts the first time you ever plant a project or publish a version.

## Tech stack

| Layer | What's used | Why |
|---|---|---|
| Frontend framework | [React](https://react.dev/) 18 + [Vite](https://vitejs.dev/) | Fast dev server, standard React |
| 3D rendering | [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [drei](https://github.com/pmndrs/drei) (built on [three.js](https://threejs.org/)) | Lets the Grove be built with React components instead of raw WebGL code |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS, no separate stylesheet per component |
| Animation | [Framer Motion](https://www.framer.com/motion/) + [GSAP](https://gsap.com/) | UI transitions (Framer Motion) and camera flythroughs (GSAP) |
| Backend | [Vercel serverless functions](https://vercel.com/docs/functions) (plain Node.js, no framework) | Each file under `api/` is its own HTTP endpoint |
| Database | [Postgres](https://www.postgresql.org/) via [Neon](https://neon.tech/) (serverless driver) | Real relational database, provisioned through Vercel's storage integrations |
| Auth | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (password hashing) + [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (session cookies) | Standard, well-understood building blocks — no third-party auth service |
| Hosting | [Vercel](https://vercel.com/) | Hosts both the static frontend and the `api/` serverless functions together |

## Project structure

```
prelude-vnext/
├── api/                     # Backend — every file here is a serverless HTTP endpoint
│   ├── auth/
│   │   ├── signup.js        # POST — create an account
│   │   ├── signin.js        # POST — sign in
│   │   ├── signout.js       # POST — clear the session cookie
│   │   └── me.js            # GET  — "who am I currently signed in as"
│   ├── _lib/
│   │   ├── db.js            # Shared Postgres connection helper
│   │   └── session.js       # Reads/writes the signed session cookie
│   ├── projects.js          # GET/PUT — load or save a user's (or a visited territory's) projects
│   ├── territories.js       # GET — list every other account you can visit
│   └── notifications.js     # GET/POST — read or send a real notification
│
├── src/                      # Frontend — everything the browser actually runs
│   ├── App.jsx               # The top-level component; owns almost all app state
│   ├── scenes/                # The 3D Grove: trees, sky/lighting, ambient birds & butterflies, camera
│   ├── components/             # Reusable UI: modals, panels, the sign-in screen, the review overlay, etc.
│   ├── focus/                  # The flat "Focus" dashboard views (dashboard, project view, review view)
│   ├── hooks/                  # Small reusable bits of logic (reduced-motion detection, ambient sound, etc.)
│   ├── utils/                  # Pure helper functions (tree layout math, relative-time formatting, etc.)
│   └── data/                   # Sample/seed project data used by "Load example projects"
│
├── scripts/
│   └── migrate.js            # Creates/updates the database tables — run this once per database
│
├── public/                   # Static files served as-is (audio, 3D model files, etc.)
├── docs/                     # Design notes (wireframes/UX patterns)
├── package.json
└── vite.config.js
```

## How data flows through the app

1. **Sign in / sign up** → `api/auth/signin.js` or `api/auth/signup.js` checks/creates a row in the `users` table and sets a signed session cookie.
2. **On load**, the frontend calls `api/auth/me.js` to check who's signed in, then `api/projects.js` (GET) to load that account's projects.
3. **Every change you make** (add a comment, create a version, archive a project, etc.) updates the app's in-memory state immediately, and a background effect sends the *entire* updated project list to `api/projects.js` (PUT) to save it — one JSON document per account.
4. **Visiting a teammate's territory** re-points that same load/save cycle at `api/projects.js?as=<their-email>` instead of your own account, and fires a real notification to them via `api/notifications.js`.

There's no separate database table per feature — projects/versions/comments for one account are stored together as a single JSON document, which keeps the backend intentionally simple.

## Running it locally

**Prerequisites:** [Node.js](https://nodejs.org/) 18 or newer, and a [Vercel](https://vercel.com/) account (free tier is enough) if you want the backend to work.

```bash
# 1. Clone the repo
git clone git@github.com:rajesh-malick/Prelude-Workspace-V.0.1.git
cd Prelude-Workspace-V.0.1

# 2. Install dependencies
npm install

# 3. Set up environment variables — see "Environment variables" below
#    (easiest path: vercel link, then vercel env pull .env.local)

# 4. Run the database migration once (see "Database setup" below)
node --env-file=.env.local scripts/migrate.js

# 5. Start the dev server
npm run dev
```

By default, `npm run dev` only runs the frontend (Vite) — the `api/` folder needs Vercel's own dev server to actually work locally. If you have the [Vercel CLI](https://vercel.com/docs/cli) installed, run `vercel dev` instead of `npm run dev` to get the frontend *and* the backend running together.

Other useful commands:

```bash
npm run build     # Production build, output to dist/
npm run preview   # Preview the production build locally
```

## Environment variables

These live in a `.env.local` file (never committed — see `.gitignore`) or as Environment Variables in your Vercel project settings.

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | Connection string for your Postgres database |
| `SESSION_SECRET` | A random secret string used to sign session cookies — make up any long random value |

The easiest way to get `DATABASE_URL` is to provision a free **Vercel Postgres (powered by Neon)** database from your Vercel project's **Storage** tab, then run:

```bash
vercel link                                    # connect this folder to your Vercel project
vercel env pull .env.local --environment=development
```

which writes every variable Vercel knows about (including `DATABASE_URL`) straight into `.env.local` for you.

## Database setup

The app expects one table, `users`, with a few JSON columns. Once `DATABASE_URL` is set, create/update it by running:

```bash
node --env-file=.env.local scripts/migrate.js
```

This is safe to run more than once — it only adds tables/columns that don't already exist yet. It sets up:

- `name`, `email`, `password_hash` — basic account info
- `projects_data` — that account's entire projects/versions/comments tree, as one JSON document
- `notifications` — real notifications delivered to that account
- `access_grants` — currently unused (an internal tool doesn't need per-person permissions today), kept in the schema in case that changes later

## Deploying

The live app is deployed on Vercel, connected to this GitHub repository — every push to `main` triggers a new deployment automatically. To set up your own:

```bash
npm install -g vercel   # if you don't already have the CLI
vercel                  # follow the prompts to link/create a project
vercel --prod           # deploy to production
```

Make sure your Vercel project has the same environment variables as your local `.env.local` (Vercel Postgres integrations usually add `DATABASE_URL` automatically — you'll still need to add `SESSION_SECRET` yourself).

## Known limitations

- **Comment pins can drift on embedded external webpages.** If you scroll a pasted-link prototype and then place or revisit a comment, the pin may no longer line up with the content it was meant to annotate. This is a browser security limitation, not a bug: a page from another website (a "cross-origin iframe") never tells the parent page how far it's been scrolled, so there's no way to keep a pin glued to a moving target inside it. Comments on uploaded images/videos are not affected.
- **No permission tiers yet.** Any signed-in account can fully edit any other account's projects. This is a deliberate simplification for a small, trusted internal team — see the amber "Editing X's territory" warning banner for the current guardrail. Worth revisiting if the tool is ever opened up to a much larger group.
- **No self-service profile editing.** There's currently no way to change your display name, email, or password after signing up.

## Credits

- Ground grass model: "Grass Patches - Circle" by brandon_grey, via Sketchfab (CC-BY-4.0)
- Bird and butterfly models: "Simple_Bird" and "BUTTERFLY" (CC-BY-4.0), "Orchard Swallowtail", "Cairn's Birdwing", "Clearwing Swallowtail" and "Ulysses Butterfly" (CC-BY-SA-4.0), all via Sketchfab
- Bird ambience audio: field recording via Freesound Community

---

*This is an internal tool built for Zuper. If you're new to the codebase, start by reading `src/App.jsx` — it's the one file that wires everything else together.*
