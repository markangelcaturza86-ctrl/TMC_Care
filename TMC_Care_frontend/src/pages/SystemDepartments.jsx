import { useState, useEffect } from 'react';
import { Building2, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { api } from '../api/client';

export default function SystemDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/departments')
      .then(setDepartments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader title="Departments" subtitle="Offices involved in handling student reports and requests." />

      {loading ? (
        <p>Loading…</p>
      ) : departments.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No departments yet.</p>
      ) : (
        <div className="dept-grid">
          {departments.map((d) => (
            <div className="dept-card" key={d.id}>
              <div className="dept-icon"><Building2 size={18} /></div>
              <p className="dept-name">{d.name}</p>
              <p className="dept-desc">{d.description || '—'}</p>
              <div className="dept-foot">
                <span><User size={13} /> {d.head || 'Unassigned'}</span>
                <span className="dept-staff">{d.staff ?? 0} staff</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}