import { useState, useEffect } from 'react';
import './index.css';
import { useHashRoute } from './hooks/useHashRoute';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportsIncidents from './pages/ReportsIncidents';
import ReportsFinancial from './pages/ReportsFinancial';
import Users from './pages/Users';
import RequestsFinancial from './pages/RequestsFinancial';
import RequestsIncidents from './pages/RequestsIncidents';
import VerificationsPending from './pages/VerificationsPending';
import VerificationsDocuments from './pages/VerificationsDocuments';
import CommunicationsAnnouncements from './pages/CommunicationsAnnouncements';
import CommunicationsMessages from './pages/CommunicationsMessages';
import SystemUserManagement from './pages/SystemUserManagement';
import SystemRoles from './pages/SystemRoles';
import SystemDepartments from './pages/SystemDepartments';
import SystemAuditLogs from './pages/SystemAuditLogs';
import Settings from './pages/Settings';
import { api } from './api/client';

const PAGES = {
  '/dashboard': Dashboard,
  '/reports/incidents': ReportsIncidents,
  '/reports/financial': ReportsFinancial,
  '/users': Users,
  '/requests/financial': RequestsFinancial,
  '/requests/incidents': RequestsIncidents,
  '/verifications/pending': VerificationsPending,
  '/verifications/documents': VerificationsDocuments,
  '/communications/announcements': CommunicationsAnnouncements,
  '/communications/messages': CommunicationsMessages,
  '/system/users': SystemUserManagement,
  '/system/roles': SystemRoles,
  '/system/departments': SystemDepartments,
  '/system/audit-logs': SystemAuditLogs,
  '/settings': Settings,
};

function App() {
  const [route, navigate] = useHashRoute();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setChecking(false);
      return;
    }
    api.get('/me')
      .then(() => setAuthed(true))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // token may already be invalid/expired — proceed with local cleanup anyway
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthed(false);
  };

  if (checking) {
    return null; // or a loading spinner if you want one
  }

  if (!authed) {
    return (
      <ToastProvider>
        <Login onLogin={() => { setAuthed(true); navigate('/dashboard'); }} />
      </ToastProvider>
    );
  }

  const Page = PAGES[route] || Dashboard;

  return (
    <ToastProvider>
      <Layout route={route} navigate={navigate} onLogout={handleLogout}>
        <Page navigate={navigate} />
      </Layout>
    </ToastProvider>
  );
}

export default App;