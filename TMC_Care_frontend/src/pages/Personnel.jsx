import { useState, useEffect } from 'react';
import { UserPlus, Eye, KeyRound, Copy } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const STAFF_TYPES = ['Teaching', 'Non-teaching'];
const ID_PATTERN = /^\d{2}-\d{6}$/;

const emptyForm = {
  idNumber: '', name: '', address: '', email: '', phone: '',
  staffType: STAFF_TYPES[0], department: '', username: '', password: '',
};

export default function Personnel() {
  const [personnel, setPersonnel] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [credentials, setCredentials] = useState(null);
  const [resettingFor, setResettingFor] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const showToast = useToast();

  useEffect(() => {
    Promise.all([api.get('/personnel'), api.get('/departments')])
      .then(([personnelData, deptsData]) => {
        setPersonnel(personnelData);
        setDepartments(deptsData);
        setForm((f) => ({ ...f, department: deptsData[0]?.name ?? '' }));
      })
      .catch(() => showToast('Failed to load personnel.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'ID Number', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'staffType', header: 'Type' },
    { key: 'department', header: 'Department', render: (r) => r.department || '—' },
    { key: 'username', header: 'Username', render: (r) => <span className="mono">{r.username}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => setSelected(r)} aria-label="View profile"><Eye size={17} /></button>
        </div>
      ),
    },
  ];

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.idNumber.trim() || !form.name.trim() || !form.username.trim() || !form.password.trim()) {
      showToast('ID Number, name, username, and password are all required.', 'error');
      return;
    }
    if (!ID_PATTERN.test(form.idNumber.trim())) {
      showToast('ID Number must be in the format 00-000000 (e.g. 24-123456).', 'error');
      return;
    }
    if (form.staffType === 'Teaching' && !form.department) {
      showToast('Please select a department for teaching staff.', 'error');
      return;
    }
    try {
      const payload = {
        id_number: form.idNumber.trim(),
        name: form.name,
        address: form.address,
        email: form.email || null,
        phone: form.phone || null,
        staff_type: form.staffType,
        department: form.staffType === 'Teaching' ? form.department : null,
        username: form.username,
        password: form.password,
      };
      const created = await api.post('/personnel', payload);
      setPersonnel((p) => [created, ...p]);
      showToast(`${created.name} added successfully.`, 'success');
      setCredentials({ username: form.username, password: form.password });
      setForm({ ...emptyForm, department: departments[0]?.name ?? '' });
      setCreating(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openResetPassword = (p) => {
    setResettingFor(p);
    setResetPasswordValue('');
  };

  const submitResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordValue.trim() || resetPasswordValue.trim().length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    try {
      await api.put(`/personnel/${resettingFor.id}/password`, { password: resetPasswordValue.trim() });
      showToast('Password reset.', 'success');
      setCredentials({ username: resettingFor.username, password: resetPasswordValue.trim() });
      setResettingFor(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`)
      .then(() => showToast('Copied to clipboard.', 'success'))
      .catch(() => showToast('Could not copy — copy manually.', 'error'));
  };

  if (loading) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader
        title="Personnel"
        subtitle="Teaching and non-teaching staff with access to the TMC-Care mobile app."
        actions={<button className="btn btn--primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Add Personnel</button>}
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={personnel}
          searchKeys={['name', 'id', 'username', 'department']}
          searchPlaceholder="Search by name, ID Number, or department..."
          filters={[
            { key: 'staffType', label: 'Type', options: STAFF_TYPES },
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
          ]}
          pageSize={9}
        />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Personnel Profile" width={620}>
        {selected && (
          <>
            <div className="profile-head">
              <div className="avatar avatar--lg" style={{ backgroundColor: '#2F6FED' }}>
                {selected.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="profile-name">{selected.name}</p>
                <p className="profile-sub">{selected.staffType}{selected.department ? ` · ${selected.department}` : ''}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>ID Number</span><b className="mono">{selected.id}</b></div>
              <div><span>Username</span><b className="mono">{selected.username}</b></div>
              <div><span>Email</span><b>{selected.email || '—'}</b></div>
              <div><span>Phone</span><b>{selected.phone || '—'}</b></div>
              <div><span>Address</span><b>{selected.address || '—'}</b></div>
              <div><span>Date Joined</span><b>{selected.dateJoined}</b></div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn--outline" onClick={() => openResetPassword(selected)}>
                <KeyRound size={15} /> Reset App Password
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add Personnel">
        <form className="modal-form" onSubmit={submitCreate}>
          <label className="field"><span>ID Number</span>
            <input
              value={form.idNumber}
              onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
              placeholder="00-000000"
            />
          </label>
          <label className="field"><span>Full name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan Dela Cruz" />
          </label>
          <label className="field"><span>Address</span>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="e.g. Barangay, City, Province" />
          </label>
          <div className="form-row-2">
            <label className="field"><span>Email (optional)</span>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@tmc.edu.ph" />
            </label>
            <label className="field"><span>Phone (optional)</span>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09XXXXXXXXX" />
            </label>
          </div>

          <div className="form-row-2">
            <label className="field"><span>Staff Type</span>
              <select value={form.staffType} onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))}>
                {STAFF_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            {form.staffType === 'Teaching' && (
              <label className="field"><span>Department</span>
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                  {departments.map((d) => <option key={d.id}>{d.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="form-row-2">
            <label className="field"><span>Username</span>
              <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. j.delacruz" />
            </label>
            <label className="field"><span>Password</span>
              <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="min 6 characters" />
            </label>
          </div>
          <p className="muted-text" style={{ marginTop: -8 }}>
            This staff member uses this username and password to log into the mobile app.
          </p>

          <div className="modal-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Add Personnel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resettingFor} onClose={() => setResettingFor(null)} title="Reset App Password">
        {resettingFor && (
          <form className="modal-form" onSubmit={submitResetPassword}>
            <p className="muted-text">
              Set a new app password for <b>{resettingFor.name}</b> ({resettingFor.username}).
            </p>
            <label className="field"><span>New password</span>
              <input
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="min 6 characters"
                autoFocus
              />
            </label>
            <div className="modal-form-actions">
              <button type="button" className="btn btn--outline" onClick={() => setResettingFor(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save New Password</button>
            </div>
          </form>
        )}
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
              Give these to the staff member so they can log into the TMC-Care mobile app.
            </p>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>Username</span><b className="mono">{credentials.username}</b></div>
              <div><span>Password</span><b className="mono">{credentials.password}</b></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}