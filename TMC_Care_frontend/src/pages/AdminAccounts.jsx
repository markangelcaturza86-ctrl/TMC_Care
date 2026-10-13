import SystemUserManagement from './SystemUserManagement';

// Admin / treasurer accounts, kept apart from the students and personnel list.
export default function AdminAccounts() {
  return <SystemUserManagement mode="admins" />;
}
