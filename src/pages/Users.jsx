import { useState } from 'react';
import { UserPlus, Eye, Mail } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { students as seedStudents, incidentReports, financialRequests } from '../data/mockData';
import { useToast } from '../components/Toast';

const PROGRAMS = ['BS Information Technology', 'BS Criminology', 'BS Elem. Education', 'BS Accountancy', 'BS Hospitality Mgmt', 'BS Nursing', 'BS Civil Engineering', 'BS Psychology'];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const emptyForm = { name: '', email: '', program: PROGRAMS[0], year: YEAR_LEVELS[0], phone: '' };

export default function Users() {
  const [students, setStudents] = useState(seedStudents);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const showToast = useToast();

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'Student ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'program', header: 'Program' },
    { key: 'year', header: 'Year Level' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => setSelected(r)} aria-label="View profile"><Eye size={17} /></button>
          <button className="icon-btn" aria-label="Email student"><Mail size={17} /></button>
        </div>
      ),
    },
  ];

  const relatedIncidents = selected ? incidentReports.filter((r) => r.studentId === selected.id) : [];
  const relatedRequests = selected ? financialRequests.filter((r) => r.studentId === selected.id) : [];

  const submitCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Please fill in at least name and email.', 'error');
      return;
    }
    const newStudent = {
      id: `2024-${(10000 + students.length).toString()}`,
      name: form.name,
      email: form.email,
      program: form.program,
      year: form.year,
      status: 'Active',
      dateJoined: new Date().toISOString().slice(0, 10),
      phone: form.phone || '—',
    };
    setStudents((s) => [newStudent, ...s]);
    setForm(emptyForm);
    setCreating(false);
    showToast(`${newStudent.name} added successfully.`, 'success');
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Users"
        subtitle="All registered students with access to the TMC-Care portal."
        actions={<button className="btn btn--primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Add Student</button>}
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={students}
          searchKeys={['name', 'id', 'program', 'email']}
          searchPlaceholder="Search by name, ID, or program..."
          filters={[
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
            { key: 'year', label: 'Year', options: YEAR_LEVELS },
          ]}
          pageSize={9}
        />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Student Profile" width={620}>
        {selected && (
          <>
            <div className="profile-head">
              <div className="avatar avatar--lg" style={{ backgroundColor: '#2F6FED' }}>
                {selected.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="profile-name">{selected.name}</p>
                <p className="profile-sub">{selected.program} · {selected.year}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>Student ID</span><b className="mono">{selected.id}</b></div>
              <div><span>Email</span><b>{selected.email}</b></div>
              <div><span>Phone</span><b>{selected.phone}</b></div>
              <div><span>Date Joined</span><b>{selected.dateJoined}</b></div>
            </div>

            <div className="profile-section">
              <p className="profile-section-title">Incident Reports ({relatedIncidents.length})</p>
              {relatedIncidents.length === 0 ? (
                <p className="muted-text">No incident reports filed.</p>
              ) : (
                <ul className="mini-list">
                  {relatedIncidents.map((r) => (
                    <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="profile-section">
              <p className="profile-section-title">Financial Requests ({relatedRequests.length})</p>
              {relatedRequests.length === 0 ? (
                <p className="muted-text">No financial requests filed.</p>
              ) : (
                <ul className="mini-list">
                  {relatedRequests.map((r) => (
                    <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add Student">
        <form className="modal-form" onSubmit={submitCreate}>
          <label className="field"><span>Full name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Liza Torres" />
          </label>
          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@students.tmc.edu.ph" />
          </label>
          <div className="form-row-2">
            <label className="field"><span>Program</span>
              <select value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))}>
                {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field"><span>Year Level</span>
              <select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
                {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Phone (optional)</span>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09XXXXXXXXX" />
          </label>
          <div className="modal-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Add Student</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}