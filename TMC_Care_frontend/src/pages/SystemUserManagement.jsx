import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Eye, Pencil, KeyRound, Trash2, Copy } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const PROGRAMS = ['BS Information Technology', 'BS Criminology', 'BS Elem. Education', 'BS Accountancy', 'BS Hospitality Mgmt', 'BS Nursing', 'BS Civil Engineering', 'BS Psychology'];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const ID_PATTERN = /^\d{2}-\d{6}$/;

// The "role" a person has decides which table they come from and which form fields they get.
const STUDENT_ROLE = 'Student';
const TEACHING_ROLE = 'Teaching Staff';
const NONTEACHING_ROLE = 'Non-teaching Staff';
const STAFF_TYPE_BY_ROLE = { [TEACHING_ROLE]: 'Teaching', [NONTEACHING_ROLE]: 'Non-teaching' };

const kindOfRole = (role) => {
  if (role === STUDENT_ROLE) return 'Student';
  if (STAFF_TYPE_BY_ROLE[role]) return 'Personnel';
  return 'Admin';
};

// Admin ids come back as "ADM-001" but the API route needs the plain number (1).
const adminApiId = (id) => String(id).replace(/^ADM-0*/, '');

const makeEmptyForm = (role, departments) => ({
  role,
  idNumber: '', name: '', email: '', address: '', phone: '',
  program: PROGRAMS[0], year: YEAR_LEVELS[0],
  department: departments[0]?.name ?? '',
  username: '', password: '',
});

export default function SystemUserManagement() {
  const [students, setStudents] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [resettingFor, setResettingFor] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [credentials, setCredentials] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/students'),
      api.get('/personnel'),
      api.get('/admin-users'),
      api.get('/departments'),
      api.get('/roles'),
    ])
      .then(([s, p, a, d, r]) => {
        setStudents(s);
        setPersonnel(p);
        setAdminUsers(a);
        setDepartments(d);
        setRoles(r);
      })
      .catch(() => showToast('Failed to load users.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Order in which roles are listed: admin roles first, then staff, then students.
  const adminRoleNames = useMemo(() => roles.filter((r) => r.name !== STUDENT_ROLE).map((r) => r.name), [roles]);
  const roleOrder = useMemo(
    () => [...adminRoleNames, TEACHING_ROLE, NONTEACHING_ROLE, STUDENT_ROLE],
    [adminRoleNames]
  );

  // Merge the three sources into one list of rows, then sort by role, then by name.
  const rows = useMemo(() => {
    const all = [
      ...students.map((s) => ({
        key: `Student:${s.id}`, kind: 'Student', id: s.id, role: STUDENT_ROLE,
        name: s.name, email: s.email || '', username: s.username,
        deptOrProgram: s.program || '—', status: s.status, raw: s,
      })),
      ...personnel.map((p) => ({
        key: `Personnel:${p.id}`, kind: 'Personnel', id: p.id,
        role: p.staffType === 'Teaching' ? TEACHING_ROLE : NONTEACHING_ROLE,
        name: p.name, email: p.email || '', username: p.username,
        deptOrProgram: p.department || '—', status: p.status, raw: p,
      })),
      ...adminUsers.map((u) => ({
        key: `Admin:${u.id}`, kind: 'Admin', id: u.id, role: u.role || 'No role',
        name: u.name, email: u.email || '', username: '',
        deptOrProgram: u.department || '—', status: u.status, raw: u,
      })),
    ];
    const rank = (role) => {
      const i = roleOrder.indexOf(role);
      return i === -1 ? 999 : i;
    };
    return all.sort((a, b) => rank(a.role) - rank(b.role) || a.name.localeCompare(b.name));
  }, [students, personnel, adminUsers, roleOrder]);

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
    { key: 'id', header: 'ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'email', header: 'Email', render: (r) => r.email || '—' },
    { key: 'deptOrProgram', header: 'Department / Program' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => openProfile(r)} aria-label="View profile"><Eye size={17} /></button>
          <button className="icon-btn" onClick={() => openEdit(r)} aria-label="Edit"><Pencil size={16} /></button>
          {r.kind !== 'Admin' && (
            <button className="icon-btn" onClick={() => openResetPassword(r)} aria-label="Reset app password"><KeyRound size={16} /></button>
          )}
          {r.kind === 'Admin' && (
            <button className="icon-btn icon-btn--danger" onClick={() => removeAdmin(r)} aria-label="Remove"><Trash2 size={16} /></button>
          )}
        </div>
      ),
    },
  ];

  /* ---------- View profile ---------- */
  const openProfile = async (row) => {
    setSelected(row);
    setStudentDetail(null);
    if (row.kind === 'Student') {
      try {
        setStudentDetail(await api.get(`/students/${row.id}`));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  /* ---------- Add ---------- */
  const openCreate = () => {
    setForm(makeEmptyForm(STUDENT_ROLE, departments));
    setCreating(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const kind = kindOfRole(form.role);
    try {
      if (kind === 'Student') {
        if (!form.idNumber.trim() || !form.name.trim() || !form.email.trim() || !form.username.trim() || !form.password.trim()) {
          return showToast('School ID, name, email, username, and password are all required.', 'error');
        }
        if (!ID_PATTERN.test(form.idNumber.trim())) {
          return showToast('School ID must be in the format 00-000000 (e.g. 24-123456).', 'error');
        }
        const created = await api.post('/students', {
          student_no: form.idNumber.trim(), name: form.name, email: form.email, address: form.address,
          program: form.program, year: form.year, phone: form.phone, username: form.username, password: form.password,
        });
        setStudents((s) => [created, ...s]);
        setCredentials({ loginLabel: 'Username', login: form.username, password: form.password });
        showToast(`${created.name} added successfully.`, 'success');
      } else if (kind === 'Personnel') {
        const staffType = STAFF_TYPE_BY_ROLE[form.role];
        if (!form.idNumber.trim() || !form.name.trim() || !form.username.trim() || !form.password.trim()) {
          return showToast('ID Number, name, username, and password are all required.', 'error');
        }
        if (!ID_PATTERN.test(form.idNumber.trim())) {
          return showToast('ID Number must be in the format 00-000000 (e.g. 24-123456).', 'error');
        }
        if (staffType === 'Teaching' && !form.department) {
          return showToast('Please select a department for teaching staff.', 'error');
        }
        const created = await api.post('/personnel', {
          id_number: form.idNumber.trim(), name: form.name, address: form.address,
          email: form.email || null, phone: form.phone || null,
          staff_type: staffType, department: staffType === 'Teaching' ? form.department : null,
          username: form.username, password: form.password,
        });
        setPersonnel((p) => [created, ...p]);
        setCredentials({ loginLabel: 'Username', login: form.username, password: form.password });
        showToast(`${created.name} added successfully.`, 'success');
      } else {
        if (!form.name.trim() || !form.email.trim() || form.password.trim().length < 6) {
          return showToast('Name, email, and a password of at least 6 characters are required.', 'error');
        }
        const created = await api.post('/admin-users', {
          name: form.name, email: form.email, role: form.role,
          department: form.department || null, password: form.password,
        });
        setAdminUsers((u) => [created, ...u]);
        setCredentials({ loginLabel: 'Email', login: form.email, password: form.password });
        showToast('Admin account created.', 'success');
      }
      setCreating(false);
      setForm(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

    /* ---------- Edit ---------- */
  // `id` stays the ORIGINAL id (used for the API URL and to find the row);
  // `idNumber` is the editable copy that gets saved.
  const openEdit = (row) => {
    const r = row.raw;
    const base = { kind: row.kind, id: row.id, name: r.name || '', email: r.email || '', status: r.status, newPassword: '' };
    if (row.kind === 'Student') {
      setEditing({ ...base, idNumber: r.id, username: r.username || '', phone: r.phone || '', address: r.address || '', program: r.program || PROGRAMS[0], year: r.year || YEAR_LEVELS[0] });
    } else if (row.kind === 'Personnel') {
      setEditing({ ...base, idNumber: r.id, username: r.username || '', phone: r.phone || '', address: r.address || '', role: row.role, department: r.department || departments[0]?.name || '' });
    } else {
      setEditing({ ...base, role: row.role, department: r.department || '' });
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const newPassword = editing.newPassword.trim();
    if (!editing.name.trim()) {
      return showToast('Name is required.', 'error');
    }
    if (newPassword && newPassword.length < 6) {
      return showToast('New password must be at least 6 characters.', 'error');
    }
    try {
      if (editing.kind === 'Student') {
        if (!ID_PATTERN.test(editing.idNumber.trim())) {
          return showToast('School ID must be in the format 00-000000 (e.g. 24-123456).', 'error');
        }
        if (!editing.username.trim() || !editing.email.trim()) {
          return showToast('Username and email are required.', 'error');
        }
        const payload = {
          student_no: editing.idNumber.trim(), username: editing.username.trim(),
          name: editing.name, email: editing.email,
          phone: editing.phone || null, address: editing.address || null,
          program: editing.program, year: editing.year, status: editing.status,
        };
        if (newPassword) payload.password = newPassword;
        const updated = await api.put(`/students/${editing.id}`, payload);
        setStudents((list) => list.map((s) => (s.id === editing.id ? updated : s)));
      } else if (editing.kind === 'Personnel') {
        const staffType = STAFF_TYPE_BY_ROLE[editing.role];
        if (!ID_PATTERN.test(editing.idNumber.trim())) {
          return showToast('ID Number must be in the format 00-000000 (e.g. 24-123456).', 'error');
        }
        if (!editing.username.trim()) {
          return showToast('Username is required.', 'error');
        }
        if (staffType === 'Teaching' && !editing.department) {
          return showToast('Please select a department for teaching staff.', 'error');
        }
        const payload = {
          id_number: editing.idNumber.trim(), username: editing.username.trim(),
          name: editing.name, email: editing.email || null,
          phone: editing.phone || null, address: editing.address || null,
          staff_type: staffType, department: staffType === 'Teaching' ? editing.department : null,
          status: editing.status,
        };
        if (newPassword) payload.password = newPassword;
        const updated = await api.put(`/personnel/${editing.id}`, payload);
        setPersonnel((list) => list.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        if (!editing.email.trim()) {
          return showToast('Email is required.', 'error');
        }
        const payload = { name: editing.name, email: editing.email, role: editing.role, status: editing.status };
        if (editing.department) payload.department = editing.department;
        if (newPassword) payload.password = newPassword;
        const updated = await api.put(`/admin-users/${adminApiId(editing.id)}`, payload);
        setAdminUsers((list) => list.map((u) => (u.id === editing.id ? updated : u)));
      }
      showToast(newPassword ? 'User updated and password changed.' : 'User updated.', 'success');
      setEditing(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ---------- Remove admin ---------- */
  const removeAdmin = async (row) => {
    if (!window.confirm(`Remove admin account for ${row.name}?`)) return;
    try {
      await api.delete(`/admin-users/${adminApiId(row.id)}`);
      setAdminUsers((u) => u.filter((x) => x.id !== row.id));
      showToast('Admin account removed.', 'error');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /* ---------- Reset password (students + personnel) ---------- */
  const openResetPassword = (row) => {
    setResettingFor(row);
    setResetPasswordValue('');
  };

  const submitResetPassword = async (e) => {
    e.preventDefault();
    const value = resetPasswordValue.trim();
    if (value.length < 6) {
      return showToast('Password must be at least 6 characters.', 'error');
    }
    try {
      const base = resettingFor.kind === 'Student' ? 'students' : 'personnel';
      await api.put(`/${base}/${resettingFor.id}/password`, { password: value });
      showToast('Password reset.', 'success');
      setCredentials({ loginLabel: 'Username', login: resettingFor.username, password: value });
      setResettingFor(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`${credentials.loginLabel}: ${credentials.login}\nPassword: ${credentials.password}`)
      .then(() => showToast('Copied to clipboard.', 'success'))
      .catch(() => showToast('Could not copy — copy manually.', 'error'));
  };

  const setF = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setE = (field) => (e) => setEditing((x) => ({ ...x, [field]: e.target.value }));

  if (loading) return <div className="page-stack">Loading…</div>;

  const formKind = form ? kindOfRole(form.role) : null;
  const isTeachingForm = form?.role === TEACHING_ROLE;

  return (
    <div className="page-stack">
      <PageHeader
        title="Users"
        subtitle="Students, personnel, and admin accounts in one list, sorted by role."
        actions={<button className="btn btn--primary" onClick={openCreate}><UserPlus size={16} /> Add User</button>}
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey="key"
          searchKeys={['name', 'email', 'id', 'username', 'role', 'deptOrProgram']}
          searchPlaceholder="Search by name, email, ID, role, or department..."
          filters={[
            { key: 'role', label: 'Role', options: roleOrder },
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
          ]}
          pageSize={10}
        />
      </div>

      {/* ---------- Profile ---------- */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setStudentDetail(null); }} title="User Profile" width={620}>
        {selected && (
          <>
            <div className="profile-head">
              <div className="avatar avatar--lg" style={{ backgroundColor: '#2F6FED' }}>
                {selected.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="profile-name">{selected.name}</p>
                <p className="profile-sub">{selected.role}{selected.deptOrProgram !== '—' ? ` · ${selected.deptOrProgram}` : ''}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>ID</span><b className="mono">{selected.id}</b></div>
              {selected.kind !== 'Admin' && <div><span>Username</span><b className="mono">{selected.username}</b></div>}
              <div><span>Email</span><b>{selected.email || '—'}</b></div>
              {selected.kind !== 'Admin' && <div><span>Phone</span><b>{selected.raw.phone || '—'}</b></div>}
              {selected.kind !== 'Admin' && <div><span>Address</span><b>{selected.raw.address || '—'}</b></div>}
              {selected.kind === 'Student' && <div><span>Year Level</span><b>{selected.raw.year || '—'}</b></div>}
              {selected.kind !== 'Admin' && <div><span>Date Joined</span><b>{selected.raw.dateJoined || '—'}</b></div>}
              {selected.kind === 'Admin' && <div><span>Last Active</span><b>{selected.raw.lastActive}</b></div>}
            </div>

            {selected.kind === 'Student' && (
              !studentDetail ? (
                <p style={{ marginTop: 16, color: '#6B7280' }}>Loading history…</p>
              ) : (
                <>
                  <div className="profile-section">
                    <p className="profile-section-title">Incident Reports ({studentDetail.incidentReports.length})</p>
                    {studentDetail.incidentReports.length === 0 ? (
                      <p className="muted-text">No incident reports filed.</p>
                    ) : (
                      <ul className="mini-list">
                        {studentDetail.incidentReports.map((r) => (
                          <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="profile-section">
                    <p className="profile-section-title">Financial Requests ({studentDetail.financialRequests.length})</p>
                    {studentDetail.financialRequests.length === 0 ? (
                      <p className="muted-text">No financial requests filed.</p>
                    ) : (
                      <ul className="mini-list">
                        {studentDetail.financialRequests.map((r) => (
                          <li key={r.id}><span className="mono">{r.id}</span> {r.type} <StatusBadge status={r.status} /></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )
            )}
          </>
        )}
      </Modal>

      {/* ---------- Add User ---------- */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add User">
        {form && (
          <form className="modal-form" onSubmit={submitCreate}>
            <label className="field"><span>Role</span>
              <select value={form.role} onChange={(e) => setForm(makeEmptyForm(e.target.value, departments))}>
                {roleOrder.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>

            {formKind !== 'Admin' && (
              <label className="field"><span>{formKind === 'Student' ? 'School ID Number' : 'ID Number'}</span>
                <input value={form.idNumber} onChange={setF('idNumber')} placeholder="00-000000" />
              </label>
            )}

            <label className="field"><span>Full name</span>
              <input value={form.name} onChange={setF('name')} placeholder="e.g. Liza Torres" />
            </label>

            <div className="form-row-2">
              <label className="field"><span>{formKind === 'Personnel' ? 'Email (optional)' : 'Email'}</span>
                <input type="email" value={form.email} onChange={setF('email')} placeholder="name@tmc.edu.ph" />
              </label>
              {formKind !== 'Admin' && (
                <label className="field"><span>Phone (optional)</span>
                  <input value={form.phone} onChange={setF('phone')} placeholder="09XXXXXXXXX" />
                </label>
              )}
            </div>

            {formKind !== 'Admin' && (
              <label className="field"><span>Address</span>
                <input value={form.address} onChange={setF('address')} placeholder="e.g. Barangay, City, Province" />
              </label>
            )}

            {formKind === 'Student' && (
              <div className="form-row-2">
                <label className="field"><span>Program</span>
                  <select value={form.program} onChange={setF('program')}>
                    {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field"><span>Year Level</span>
                  <select value={form.year} onChange={setF('year')}>
                    {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              </div>
            )}

            {(isTeachingForm || formKind === 'Admin') && (
              <label className="field"><span>Department</span>
                <select value={form.department} onChange={setF('department')}>
                  {departments.map((d) => <option key={d.id}>{d.name}</option>)}
                </select>
              </label>
            )}

            {formKind !== 'Admin' ? (
              <div className="form-row-2">
                <label className="field"><span>Username</span>
                  <input value={form.username} onChange={setF('username')} placeholder="e.g. j.delacruz" />
                </label>
                <label className="field"><span>Password</span>
                  <input type="text" value={form.password} onChange={setF('password')} placeholder="min 6 characters" />
                </label>
              </div>
            ) : (
              <label className="field"><span>Temporary password</span>
                <input type="text" value={form.password} onChange={setF('password')} placeholder="min 6 characters" />
              </label>
            )}
            <p className="muted-text" style={{ marginTop: -8 }}>
              {formKind === 'Admin'
                ? 'This person logs into the web dashboard with their email and this password.'
                : 'This person logs into the mobile app with this username and password.'}
            </p>

            <div className="modal-form-actions">
              <button type="button" className="btn btn--outline" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Add User</button>
            </div>
          </form>
        )}
      </Modal>

          {/* ---------- Edit User ---------- */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit User">
        {editing && (
          <form className="modal-form" onSubmit={submitEdit}>
            {editing.kind === 'Admin' ? (
              <label className="field"><span>ID (cannot be changed)</span>
                <input value={editing.id} disabled />
              </label>
            ) : (
              <div className="form-row-2">
                <label className="field"><span>{editing.kind === 'Student' ? 'School ID Number' : 'ID Number'}</span>
                  <input value={editing.idNumber} onChange={setE('idNumber')} placeholder="00-000000" />
                </label>
                <label className="field"><span>Username</span>
                  <input value={editing.username} onChange={setE('username')} />
                </label>
              </div>
            )}

            <label className="field"><span>Full name</span>
              <input value={editing.name} onChange={setE('name')} />
            </label>

            <div className="form-row-2">
              <label className="field"><span>{editing.kind === 'Admin' ? 'Email (used to log in)' : 'Email'}</span>
                <input type="email" value={editing.email} onChange={setE('email')} />
              </label>
              {editing.kind !== 'Admin' && (
                <label className="field"><span>Phone</span>
                  <input value={editing.phone} onChange={setE('phone')} placeholder="09XXXXXXXXX" />
                </label>
              )}
            </div>

            {editing.kind !== 'Admin' && (
              <label className="field"><span>Address</span>
                <input value={editing.address} onChange={setE('address')} />
              </label>
            )}

            {editing.kind === 'Student' && (
              <div className="form-row-2">
                <label className="field"><span>Program</span>
                  <select value={editing.program} onChange={setE('program')}>
                    {PROGRAMS.includes(editing.program) ? null : <option>{editing.program}</option>}
                    {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field"><span>Year Level</span>
                  <select value={editing.year} onChange={setE('year')}>
                    {YEAR_LEVELS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </label>
              </div>
            )}

            {editing.kind === 'Personnel' && (
              <div className="form-row-2">
                <label className="field"><span>Role</span>
                  <select value={editing.role} onChange={setE('role')}>
                    <option>{TEACHING_ROLE}</option>
                    <option>{NONTEACHING_ROLE}</option>
                  </select>
                </label>
                {editing.role === TEACHING_ROLE && (
                  <label className="field"><span>Department</span>
                    <select value={editing.department} onChange={setE('department')}>
                      {departments.map((d) => <option key={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}

            {editing.kind === 'Admin' && (
              <div className="form-row-2">
                <label className="field"><span>Role</span>
                  <select value={editing.role} onChange={setE('role')}>
                    {adminRoleNames.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className="field"><span>Department</span>
                  <select value={editing.department} onChange={setE('department')}>
                    {editing.department ? null : <option value="">—</option>}
                    {departments.map((d) => <option key={d.id}>{d.name}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div className="form-row-2">
              <label className="field"><span>Status</span>
                <select value={editing.status} onChange={setE('status')}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label className="field"><span>New password (optional)</span>
                <input type="text" value={editing.newPassword} onChange={setE('newPassword')} placeholder="Leave blank to keep current" />
              </label>
            </div>
            <p className="muted-text" style={{ marginTop: -8 }}>
              Passwords are stored encrypted, so the current one can't be shown. Type a new one only if you want to change it.
            </p>

            <div className="modal-form-actions">
              <button type="button" className="btn btn--outline" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
      {/* ---------- Reset password ---------- */}
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

      {/* ---------- Credentials ---------- */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Login Credentials"
        footer={(
          <>
            <button className="btn btn--outline" onClick={copyCredentials}><Copy size={15} /> Copy</button>
            <button className="btn btn--primary" onClick={() => setCredentials(null)}>Done</button>
          </>
        )}
      >
        {credentials && (
          <div>
            <p className="muted-text">Give these to the user so they can log in.</p>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div><span>{credentials.loginLabel}</span><b className="mono">{credentials.login}</b></div>
              <div><span>Password</span><b className="mono">{credentials.password}</b></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}