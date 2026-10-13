import {
  LayoutDashboard, Users, FolderKanban, ShieldCheck,
  MessagesSquare, Settings2, FileText, HandCoins, ClipboardList,
  KeyRound, Building2, ScrollText, Megaphone, Mail, Wallet, UserCog,
} from 'lucide-react';

// `access` is one of the abilities the backend sends in `user.access`
// (see App\Models\User::accessMap): incidents, financial, records, users,
// system, audit, communications. No `access` = every signed-in account.
export const navSections = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { path: '/users', label: 'Users', icon: Users, access: 'users' },
      { path: '/users/admin-accounts', label: 'Admin Accounts', icon: UserCog, access: 'users' },
    ],
  },
  {
    label: 'Requests',
    icon: FolderKanban,
    items: [
      { path: '/requests/financial', label: 'Financial Assistance', icon: HandCoins, access: 'financial' },
      { path: '/requests/incidents', label: 'Incident Reports', icon: ClipboardList, access: 'incidents' },
    ],
  },
  {
    label: 'Collections',
    icon: Wallet,
    items: [
      { path: '/collections', label: 'Collections', icon: Wallet, access: 'collections' },
    ],
  },
  {
    label: 'Verifications',
    icon: ShieldCheck,
    items: [
      { path: '/verifications/pending', label: 'Pending Verifications', icon: ShieldCheck, access: 'records' },
      { path: '/verifications/documents', label: 'Documents', icon: FileText, access: 'records' },
    ],
  },
  {
    label: 'Communications',
    icon: MessagesSquare,
    items: [
      { path: '/communications/announcements', label: 'Announcements', icon: Megaphone, access: 'communications' },
      { path: '/communications/messages', label: 'Messages', icon: Mail, access: 'communications' },
    ],
  },
  {
    label: 'System Management',
    icon: Settings2,
    items: [
      { path: '/system/roles', label: 'Roles & Permissions', icon: KeyRound, access: 'system' },
      { path: '/system/departments', label: 'Departments', icon: Building2, access: 'system' },
      { path: '/system/audit-logs', label: 'Audit Logs', icon: ScrollText, access: 'audit' },
    ],
  },
];

export const settingsItem = { path: '/settings', label: 'Settings', icon: Settings2 };

// Pages that are reachable from buttons but are not in the sidebar.
const HIDDEN_ROUTE_ACCESS = {
  '/reports/incidents': 'incidents',
  '/reports/financial': 'financial',
};

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function hasAccess(user, ability) {
  if (!ability) return true;
  return !!user?.access?.[ability];
}

/** Sidebar sections with only the links this account may open. */
export function getVisibleSections(user) {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(user, item.access)),
    }))
    .filter((section) => section.items.length > 0);
}

export function canAccessPath(user, path) {
  if (path === '/dashboard' || path === settingsItem.path) return true;
  if (HIDDEN_ROUTE_ACCESS[path]) return hasAccess(user, HIDDEN_ROUTE_ACCESS[path]);
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.path === path) return hasAccess(user, item.access);
    }
  }
  return true; // unknown path -> App falls back to the Dashboard
}

export function findNavLabel(path) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.path === path) return item.label;
    }
  }
  if (path === settingsItem.path) return settingsItem.label;
  return 'Dashboard';
}
