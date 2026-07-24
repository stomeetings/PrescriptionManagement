// Single source of truth for the sidebar menu and breadcrumb labels. Each item may
// optionally carry a `children` array for future nested menus - SidebarMenu already
// renders these recursively, even though nothing populates one yet.
export const NAVIGATION = [
  { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
  { label: 'Patients', path: '/patients', icon: 'bi-people' },
  { label: 'Prescriptions', path: '/prescriptions', icon: 'bi-file-earmark-medical' },
  { label: 'Medicines', path: '/medicines', icon: 'bi-capsule' },
  { label: 'User Management', path: '/user-management', icon: 'bi-person-gear', adminOnly: true },
  { label: 'Reports', path: '/reports', icon: 'bi-bar-chart-line' },
  { label: 'Settings', path: '/settings', icon: 'bi-gear', adminOnly: true },
];
