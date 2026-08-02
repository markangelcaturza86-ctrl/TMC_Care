import {
  LayoutDashboard, TriangleAlert, Users, FolderKanban, ShieldCheck,
  MessagesSquare, Settings2, FileText, HandCoins, ClipboardList,
  UserCog, KeyRound, Building2, ScrollText, Megaphone, Mail,
} from 'lucide-react';

export const navSections = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Reports',
    icon: TriangleAlert,
    items: [
      { path: '/reports/incidents', label: 'Incident Reports', icon: FileText },
      { path: '/reports/financial', label: 'Financial Requests', icon: HandCoins },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { path: '/users', label: 'All Users', icon: Users },
    ],
  },
  {
    label: 'Requests',
    icon: FolderKanban,
    items: [
      { path: '/requests/financial', label: 'Financial Assistance', icon: HandCoins },
      { path: '/requests/incidents', label: 'Incident Reports', icon: ClipboardList },
    ],
  },
  {
    label: 'Verifications',
    icon: ShieldCheck,
    items: [
      { path: '/verifications/pending', label: 'Pending Verifications', icon: ShieldCheck },
      { path: '/verifications/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Communications',
    icon: MessagesSquare,
    items: [
      { path: '/communications/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/communications/messages', label: 'Messages', icon: Mail },
    ],
  },
  {
    label: 'System Management',
    icon: Settings2,
    items: [
      { path: '/system/users', label: 'User Management', icon: UserCog },
      { path: '/system/roles', label: 'Roles & Permissions', icon: KeyRound },
      { path: '/system/departments', label: 'Departments', icon: Building2 },
      { path: '/system/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  },
];

export const settingsItem = { path: '/settings', label: 'Settings', icon: Settings2 };

export function findNavLabel(path) {
  for (const section of navSections) {
    for (const item of section.items) {
      if (item.path === path) return item.label;
    }
  }
  if (path === settingsItem.path) return settingsItem.label;
  return 'Dashboard';
}
