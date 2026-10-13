import { useState, useEffect } from 'react';
import './index.css';
import { useHashRoute } from './hooks/useHashRoute';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportsIncidents from './pages/ReportsIncidents';
import ReportsFinancial from './pages/ReportsFinancial';
import RequestsFinancial from './pages/RequestsFinancial';
import RequestsIncidents from './pages/RequestsIncidents';
import VerificationsPending from './pages/VerificationsPending';
import VerificationsDocuments from './pages/VerificationsDocuments';
import CommunicationsAnnouncements from './pages/CommunicationsAnnouncements';
import CommunicationsMessages from './pages/CommunicationsMessages';
import SystemUserManagement from './pages/SystemUserManagement';
import AdminAccounts from './pages/AdminAccounts';
import SystemRoles from './pages/SystemRoles';
import SystemDepartments from './pages/SystemDepartments';
import SystemAuditLogs from './pages/SystemAuditLogs';
import Collections from './pages/Collections';
import Settings from './pages/Settings';
import { api } from './api/client';
import { canAccessPath, getStoredUser } from './data/navConfig';

const PAGES = {
  '/dashboard': Dashboard,
  '/reports/incidents': ReportsIncidents,
  '/reports/financial': ReportsFinancial,
  '/users': SystemUserManagement,
  '/collections': Collections,
  '/requests/financial': RequestsFinancial,
  '/requests/incidents': RequestsIncidents,
  '/verifications/pending': VerificationsPending,
  '/verifications/documents': VerificationsDocuments,
  '/communications/announcements': CommunicationsAnnouncements,
  '/communications/messages': CommunicationsMessages,
  '/users/admin-accounts': AdminAccounts,
  '/system/roles': SystemRoles,
  '/system/departments': SystemDepartments,
  '/system/audit-logs': SystemAuditLogs,
  '/settings': Settings,
};

function App() {
  const [route, navigate] = useHashRoute();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setChecking(false);
      return;
    }
    // Refresh the account (name, role and what it may access) from the server.
    api.get('/me')
      .then((me) => {
        localStorage.setItem('user', JSON.stringify(me));
        setUser(me);
        setAuthed(true);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setChecking(false));
  }, []);

  // A Guidance Counselor opening a Treasurer page (or the other way round)
  // is sent back to the dashboard.
  useEffect(() => {
    if (authed && user && !canAccessPath(user, route)) navigate('/dashboard');
  }, [authed, user, route, navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // token may already be invalid/expired — proceed with local cleanup anyway
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthed(false);
  };

  if (checking) {
    return null; // or a loading spinner if you want one
  }

  if (!authed) {
    return (
      <ToastProvider>
        <Login
          onLogin={(loggedInUser) => {
            setUser(loggedInUser);
            setAuthed(true);
            navigate('/dashboard');
          }}
        />
      </ToastProvider>
    );
  }

  const Page = canAccessPath(user, route) ? (PAGES[route] || Dashboard) : Dashboard;

  return (
    <ToastProvider>
      <Layout route={route} navigate={navigate} onLogout={handleLogout} user={user}>
        <Page navigate={navigate} />
      </Layout>
    </ToastProvider>
  );
}

export default App;
