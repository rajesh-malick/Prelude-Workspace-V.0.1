// Mock data. Field names stay literal product terms — "project" / "version"
// / "comment" / "status" — the nature metaphor (tree/bloom/firefly) is a
// VISUAL treatment applied by components, never part of the data shape.

export const projects = [
  {
    id: 'world-of-chaos',
    name: 'World of Chaos',
    status: 'active',
    versionCount: 3,
    color: '#4E9A5C', // green
    position: [-3.6, 0, 1],
    versions: [
      {
        id: 'v1',
        label: 'v1.0',
        status: 'approved',
        owner: 'Rajesh',
        createdAt: '3d ago',
        comments: [{ id: 'c1', author: 'Andy', text: 'Looks solid, ship it.', resolved: true }],
      },
      {
        id: 'v2',
        label: 'v1.1',
        status: 'in review',
        owner: 'Andy',
        createdAt: '1d ago',
        comments: [
          { id: 'c2', author: 'Sara', text: 'Spacing feels tight on mobile.', resolved: false },
          { id: 'c3', author: 'Rajesh', text: 'Can we brighten the CTA?', resolved: false },
        ],
      },
      {
        id: 'v3',
        label: 'v1.2',
        status: 'draft',
        owner: 'Rajesh',
        createdAt: '2h ago',
        comments: [],
      },
    ],
  },
  {
    id: 'the-error',
    name: 'The Error',
    status: 'blocked',
    versionCount: 1,
    color: '#C98A2E', // amber
    position: [-1.5, 0, -2],
    versions: [
      {
        id: 'v1',
        label: 'v0.1',
        status: 'blocked',
        owner: 'Ragavan',
        createdAt: '4d ago',
        comments: [{ id: 'c4', author: 'Ragavan', text: "Blocked on the API contract — don't build further yet.", resolved: false }],
      },
    ],
  },
  {
    id: 'insta-esti',
    name: 'Insta Esti',
    status: 'review pending',
    versionCount: 1,
    color: '#C98A2E', // amber
    position: [2, 0, 1.5],
    versions: [
      {
        id: 'v1',
        label: 'v0.1',
        status: 'in review',
        owner: 'Sara',
        createdAt: '6h ago',
        comments: [{ id: 'c5', author: 'Rajesh', text: 'Reviewing this today.', resolved: false }],
      },
    ],
  },
  {
    id: 'internal-tool-login',
    name: 'Internal Tool Login',
    status: 'active',
    versionCount: 5,
    color: '#3E7FB0', // blue
    position: [3.6, 0, -1],
    versions: [
      { id: 'v1', label: 'v0.1', status: 'approved', owner: 'Rajesh', createdAt: '12d ago', comments: [] },
      { id: 'v2', label: 'v0.2', status: 'approved', owner: 'Rajesh', createdAt: '9d ago', comments: [] },
      {
        id: 'v3',
        label: 'v0.3',
        status: 'approved',
        owner: 'Andy',
        createdAt: '6d ago',
        comments: [{ id: 'c6', author: 'Sara', text: 'SSO redirect works now, confirmed.', resolved: true }],
      },
      {
        id: 'v4',
        label: 'v0.4',
        status: 'in review',
        owner: 'Andy',
        createdAt: '2d ago',
        comments: [{ id: 'c7', author: 'Rajesh', text: 'Error state copy needs a pass.', resolved: false }],
      },
      { id: 'v5', label: 'v0.5', status: 'draft', owner: 'Rajesh', createdAt: '4h ago', comments: [] },
    ],
  },
];
