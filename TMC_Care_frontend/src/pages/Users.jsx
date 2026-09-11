import { useState, useEffect } from 'react';
import { UserPlus, Eye, Mail, KeyRound, Copy } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const PROGRAMS = ['BS Information Technology', 'BS Criminology', 'BS Elem. Education', 'BS Accountancy', 'BS Hospitality Mgmt', 'BS Nursing', 'BS Civil Engineering', 'BS Psychology'];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const emptyForm = { name: '', email: '', program: PROGRAMS[0], year: YEAR_LEVELS[0], phone: '', password: '' };

export default function Users() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [credentials, setCredentials] = useState(null);
  const [resetting, setResetting] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    api.get('/students')
      .then(setStudents)
      .catch(() => showToast('Failed to load students.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'Student ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'program', header: 'Program' },
    { key: 'year', header: 'Year Level' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => openProfile(r)} aria-label="View profile"><Eye size={17} /></button>
          <button className="icon-btn" aria-label="Email student"><Mail size={17} /></button>
        </div>
      ),
    },
  ];

  const openProfile = async (student) => {
    setSelected(student);
    setSelectedDetail(null); // reset while loading fresh detail
    try {
      const detail = await api.get(`/students/${student.id}`);
      setSelectedDetail(detail);
    } catch (err) {
      showToast(err.message, 'error');
      setSelected(null);
    }
  };

    const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Please fill in at least name and email.', 'error');
      return;
    }
    try {
      const payload = { ...form, password: form.password.trim() || undefined };
      const created = await api.post('/students', payload);
      const { generatedPassword, ...student } = created;
      setStudents((s) => [student, ...s]);
      setForm(emptyForm);
      setCreating(false);
      showToast(`${student.name} added successfully.`, 'success');
      setCredentials({ id: student.id, name: student.name, password: generatedPassword });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resetPassword = async (student) => {
    setResetting(true);
    try {
      const result = await api.put(`/students/${student.id}/password`);
      setCredentials({ id: student.id, name: student.name, password: result.generatedPassword });
      showToast('Password reset.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Student ID: ${credentials.id}\nPassword: ${credentials.password}`)
      .then(() => showToast('Copied to clipboard.', 'success'))
      .catch(() => showToast('Could not copy — copy manually.', 'error'));
  };

  if (loading) return <div className="page-stack">Loading…</div>;

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

      <Modal open={!!selected} onClose={() => { setSelected(null); setSelectedDetail(null); }} title="Student Profile" width={620}>
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
              <div><span>Phone</span><b>{selected.phone || '—'}</b></div>
              <div><span>Date Joined</span><b>{selected.dateJoined}</b></div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn--outline" disabled={resetting} onClick={() => resetPassword(selected)}>
                <KeyRound size={15} /> Reset App Password
              </button>
            </div>

            {!selectedDetail ? (
              <p style={{ marginTop: 16, color: '#6B7280' }}>Loading history…</p>
            ) : (
              <>
                <div className="profile-section">
                  <p className="profile-section-title">Incident Reports ({selectedDetail.incidentReports.length})</p>
                  {selectedDetail.incidentReports.length === 0 ? (
                    <p className="muted-text">No incident reports filed.</p>
                  ) : (
                    <ul className="mini-list">
                      {selectedDetail.incidentReports.map((r) => (
                        <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="profile-section">
                  <p className="profile-section-title">Financial Requests ({selectedDetail.financialRequests.length})</p>
                  {selectedDetail.financialRequests.length === 0 ? (
                    <p className="muted-text">No financial requests filed.</p>
                  ) : (
                    <ul className="mini-list">
                      {selectedDetail.financialRequests.map((r) => (
                        <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
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
          <label className="field"><span>App password (optional)</span>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Leave blank to auto-generate"
            />
          </label>
          <p className="muted-text" style={{ marginTop: -8 }}>
            This is what the student uses to log into the mobile app with their Student ID.
          </p>
          <div className="modal-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Add Student</button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="App Login Credentials"
        footer={(
          <>
            <button className="btn btn--outline" onClick={copyCredentials}><Copy size={15} /> Copy</button>
            <button className="btn btn--primary" onClick={() => setCredentials(null)}>Done</button>
          </>
        )}
      >
        {credentials && (
          <div>
            <p className="muted-text">
              Give these to <b>{credentials.name}</b> so they can log into the TMC-Care mobile app.
              This password is shown only once — it can't be viewed again after you close this window,
              only reset.
            </p>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>Student ID</span><b className="mono">{credentials.id}</b></div>
              <div><span>Password</span><b className="mono">{credentials.password}</b></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}