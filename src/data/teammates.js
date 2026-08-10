// Mock teammates, each with their own small Grove ("territory"). There's
// no backend, so these are static — browsing into one is a read-only
// simulation of what visiting a real teammate's territory would feel
// like, not a real multi-user connection.
export const TEAMMATES = [
  { id: 'andy', name: 'Andy', color: '#4E9A5C' },
  { id: 'sara', name: 'Sara', color: '#3E7FB0' },
  { id: 'ragavan', name: 'Ragavan', color: '#C98A2E' },
  { id: 'priya', name: 'Priya', color: '#8B6FB0' },
];

export const TEAMMATE_PROJECTS = {
  andy: [
    {
      id: 'andy-onboarding',
      name: 'Onboarding Revamp',
      status: 'active',
      color: '#4E9A5C',
      position: [-2.2, 0, 2],
      versionCount: 1,
      versions: [
        {
          id: 'andy-v1',
          label: 'v1.0',
          status: 'in review',
          owner: 'Andy',
          createdAt: '2d ago',
          description: 'First pass at the new signup flow.',
          comments: [],
        },
      ],
    },
  ],
  sara: [
    {
      id: 'sara-billing',
      name: 'Billing Dashboard',
      status: 'review pending',
      color: '#3E7FB0',
      position: [2.2, 0, -2],
      versionCount: 1,
      versions: [
        {
          id: 'sara-v1',
          label: 'v0.3',
          status: 'draft',
          owner: 'Sara',
          createdAt: '5h ago',
          comments: [],
        },
      ],
    },
  ],
  ragavan: [
    {
      id: 'ragavan-api',
      name: 'API Gateway Docs',
      status: 'blocked',
      color: '#C98A2E',
      position: [-3, 0, -1.2],
      versionCount: 1,
      versions: [
        {
          id: 'ragavan-v1',
          label: 'v2.0',
          status: 'blocked',
          owner: 'Ragavan',
          createdAt: '1d ago',
          comments: [],
        },
      ],
    },
  ],
  priya: [
    {
      id: 'priya-search',
      name: 'Search Redesign',
      status: 'active',
      color: '#8B6FB0',
      position: [3, 0, 1.2],
      versionCount: 1,
      versions: [
        {
          id: 'priya-v1',
          label: 'v1.4',
          status: 'approved',
          owner: 'Priya',
          createdAt: '3d ago',
          comments: [],
        },
      ],
    },
  ],
};
