import { Building2, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { departments } from '../data/mockData';

export default function SystemDepartments() {
  return (
    <div className="page-stack">
      <PageHeader title="Departments" subtitle="Offices involved in handling student reports and requests." />

      <div className="dept-grid">
        {departments.map((d) => (
          <div className="dept-card" key={d.id}>
            <div className="dept-icon"><Building2 size={18} /></div>
            <p className="dept-name">{d.name}</p>
            <p className="dept-desc">{d.description}</p>
            <div className="dept-foot">
              <span><User size={13} /> {d.head}</span>
              <span className="dept-staff">{d.staff} staff</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
