import { useState, useEffect } from 'react';
import { KeyRound, Users2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { api } from '../api/client';

export default function SystemRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/roles')
      .then(setRoles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can see and do inside TMC-Care." />

      {loading ? (
        <p>Loading…</p>
      ) : roles.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No roles yet.</p>
      ) : (
        <div className="role-grid">
          {roles.map((r) => (
            <div className="role-card" key={r.id}>
              <div className="role-card-head">
                <div className="role-icon"><KeyRound size={17} /></div>
                <div>
                  <p className="role-name">{r.name}</p>
                  <p className="role-users"><Users2 size={13} /> {r.users.toLocaleString()} user{r.users === 1 ? '' : 's'}</p>
                </div>
              </div>
              <p className="role-desc">{r.description || '—'}</p>
              <div className="role-permissions">
                {r.permissions.length === 0
                  ? <span style={{ color: '#6B7280', fontSize: 13 }}>No permissions assigned.</span>
                  : r.permissions.map((p) => (
                      <span className="permission-chip" key={p}>{p}</span>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}