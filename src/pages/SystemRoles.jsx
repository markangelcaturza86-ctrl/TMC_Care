import { KeyRound, Users2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { roles } from '../data/mockData';

export default function SystemRoles() {
  return (
    <div className="page-stack">
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can see and do inside TMC-Care." />

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
            <p className="role-desc">{r.description}</p>
            <div className="role-permissions">
              {r.permissions.map((p) => (
                <span className="permission-chip" key={p}>{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
