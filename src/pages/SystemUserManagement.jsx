import { useState } from 'react';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { adminUsers as seed, roles, departments } from '../data/mockData';
import { useToast } from '../components/Toast';

export default function SystemUserManagement() {
  const [users, setUsers] = useState(seed);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: roles[1].name, department: departments[0].name });
  const showToast = useToast();

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastActive', header: 'Last Active' },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={16} /></button>
          <button className="icon-btn icon-btn--danger" onClick={() => remove(r.id)} aria-label="Remove"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  const remove = (id) => {
    setUsers((u) => u.filter((x) => x.id !== id));
    showToast('Admin account removed.', 'error');
  };

  const submitCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setUsers((u) => [
      { id: `ADM-${(u.length + 1).toString().padStart(3, '0')}`, ...form, status: 'Active', lastActive: 'Just now' },
      ...u,
    ]);
    setForm({ name: '', email: '', role: roles[1].name, department: departments[0].name });
    setCreating(false);
    showToast('Admin account created.', 'success');
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setUsers((u) => u.map((x) => (x.id === editing.id ? editing : x)));
    setEditing(null);
    showToast('Admin account updated.', 'success');
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="User Management"
        subtitle="Manage staff and administrator accounts with system access."
        actions={<button className="btn btn--primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Add Admin</button>}
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={users}
          searchKeys={['name', 'email', 'department']}
          searchPlaceholder="Search by name, email, or department..."
          filters={[
            { key: 'role', label: 'Role', options: roles.map((r) => r.name) },
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
          ]}
        />
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add Admin Account">
        <form className="modal-form" onSubmit={submitCreate}>
          <label className="field"><span>Full name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Liza Torres" />
          </label>
          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@tmc.edu.ph" />
          </label>
          <div className="form-row-2">
            <label className="field"><span>Role</span>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {roles.filter((r) => r.name !== 'Student').map((r) => <option key={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Department</span>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                {departments.map((d) => <option key={d.id}>{d.name}</option>)}
              </select>
            </label>
          </div>
          <div className="modal-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Create Account</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Admin Account">
        {editing && (
          <form className="modal-form" onSubmit={submitEdit}>
            <label className="field"><span>Full name</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="field"><span>Email</span>
              <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <div className="form-row-2">
              <label className="field"><span>Role</span>
                <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  {roles.filter((r) => r.name !== 'Student').map((r) => <option key={r.id}>{r.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Status</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
            <div className="modal-form-actions">
              <button type="button" className="btn btn--outline" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn--primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
