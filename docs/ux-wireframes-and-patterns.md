# Prelude Vnext UX blueprint

## Product intent
Prelude Vnext is a spatial, collaborative review experience where people move through a living grove of projects, enter a project, inspect versions, and leave feedback without losing orientation. The UI should feel calm, directional, and low-friction while preserving the sense of exploration that makes the 3D canvas compelling.

## Design principles
- Keep orientation obvious: every view should make it clear where the user is and how to leave it.
- Reduce clicks: the most common actions (search, create, review, return home) should be one step away.
- Make feedback visible: success, errors, and new activity should appear close to the action that triggered them.
- Respect accessibility: keyboard support, strong contrast, and reduced-motion support are non-negotiable.
- Preserve motion, but not at the expense of control: animations should guide without overwhelming.

## Primary user flows

### 1. First-time visitor
1. Land on the Grove view with an empty or lightly seeded state.
2. See a clear call to action to create a project or load examples.
3. Understand the canvas by hovering or selecting a tree, then moving into a project.
4. Create a first version and leave an initial comment.

### 2. Returning collaborator
1. Open the app and immediately see recent projects or a search field.
2. Jump to a specific project via search or notifications.
3. Open a review for a specific version and see comments or new activity.
4. Return to the Grove or focus mode without confusion.

### 3. Review-driven collaboration
1. Open a project.
2. Select a version bloom.
3. Read the review summary, comments, and history.
4. Add feedback, create the next version, or return to the project overview.

## Proposed screen map

### Grove view (default experience)
```text
+--------------------------------------------------------------+
| Prelude Vnext            [Search] [Notifications] [Settings] |
|--------------------------------------------------------------|
| [Explore] [Focus] [Create]                | 3D Grove canvas   |
|                                              |  (project trees) |
|                                              |  [Selected tree] |
|                                              |  [Quick actions] |
+--------------------------------------------------------------+
```

### Project overview
```text
+--------------------------------------------------------------+
| ← Grove                      Project Name    [Create version] |
|--------------------------------------------------------------|
| Summary / context        | Versions / timeline              |
| Recent activity          | Comments / decisions             |
| [Open review] [Back]    | [Add comment]                   |
+--------------------------------------------------------------+
```

### Review detail
```text
+--------------------------------------------------------------+
| ← Project                     Version v1.2    [Share] [Add] |
|--------------------------------------------------------------|
| Version summary          | Comment thread                 |
| Visual context           | Decisions / action items       |
| Review metadata         | Next steps                     |
+--------------------------------------------------------------+
```

### Focus mode
```text
+--------------------------------------------------------------+
| Prelude Vnext         [Back to project] [Go home] [Search]  |
|--------------------------------------------------------------|
| Left rail: project areas | Main workspace / details        |
|                           | [Focused artifact]            |
|                           | [Highlights / notes]         |
+--------------------------------------------------------------+
```

## Interaction patterns

### Navigation pattern
- Use a persistent header for global actions (search, notifications, settings).
- Keep back/home actions visible and consistent in every overlay.
- Use motion to connect views, but allow an instant skip when the user wants to move faster.

### Creation pattern
- Every creation action should open a lightweight modal or panel with a clear title, primary action, and cancel path.
- Show a live preview or generated suggestion when possible (for example, suggested version labels).
- Use inline validation rather than blocking the user after submission.

### Feedback pattern
- Surface success and failure states near the action that caused them.
- Use toast or inline banners for transient updates; reserve modal dialogs for destructive or high-risk actions.
- Keep error copy plain, specific, and actionable.

### Empty-state pattern
- Empty states should explain what the user can do next, not just say there is nothing here.
- Offer two or three concrete next steps: create, import, or explore examples.

## Accessibility requirements
- All primary actions must be reachable by keyboard and display a visible focus ring.
- Text contrast should remain strong against the glass surfaces and background gradients.
- Interactive targets should be large enough for touch and mouse use (minimum 44px).
- Respect the reduced-motion preference by minimizing or removing non-essential animation.
- Provide names for icon-only buttons and screen-reader-friendly labels for dialogs and forms.

## Visual language
- Use a warm neutral canvas with deep espresso text to maintain readability.
- Keep surfaces soft and translucent, but ensure depth comes from contrast and shadow rather than only blur.
- Reserve the accent color for primary CTAs, selected states, and important indicators.
- Use spacing and alignment consistently: a simple 8px system should govern padding, gaps, and component rhythm.

## Implementation notes for the current app
The current app structure already aligns well with these patterns:
- Header actions map to the existing top bar.
- The Grove view can remain the default spatial entry point.
- Project overlay, review overlay, focus mode, search, notifications, and settings should preserve shared navigation affordances.
- The shared glass styling and focus states should be reused across all surfaces.
