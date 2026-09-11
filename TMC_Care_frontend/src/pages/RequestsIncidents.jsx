import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const STATUS_FLOW = ['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'];
const STAFF = ['Unassigned', 'Bartolome Reyes', 'Ivy Tan-Ocampo', 'Admin User'];

export default function RequestsIncidents() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    api.get('/incident-reports')
      .then(setReports)
      .catch(() => showToast('Failed to load reports.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const applyChange = async (id, patch) => {
    // convert camelCase keys to snake_case for the backend
    const body = {};
    if ('assignedTo' in patch) body.assigned_to = patch.assignedTo;
    if ('status' in patch) body.status = patch.status;
    if ('priority' in patch) body.priority = patch.priority;

    try {
      const updated = await api.put(`/incident-reports/${id}`, body);
      setReports((rs) => rs.map((r) => (r.id === id ? updated : r)));
      setSelected((s) => (s && s.id === id ? updated : s));
      return updated;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const columns = [
    { key: 'id', header: 'Report ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'type', header: 'Type' },
    { key: 'reportedBy', header: 'Reported By' },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} kind="priority" /> },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <button className="icon-btn" onClick={() => setSelected(r)} aria-label="Manage report">
          <Eye size={17} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Incident Report Requests"
        subtitle="Assign case officers and update the status of active incident reports."
      />

      <div className="panel">
        {loading ? (
          <p style={{ padding: 16 }}>Loading…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={reports}
            searchKeys={['id', 'type', 'reportedBy']}
            searchPlaceholder="Search by ID, type, or reporter..."
            filters={[
              { key: 'status', label: 'Status', options: STATUS_FLOW },
              { key: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'] },
            ]}
          />
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.id} width={620}>
        {selected && (
          <>
            <div className="detail-grid">
              <div><span>Type</span><b>{selected.type}</b></div>
              <div><span>Reported By</span><b>{selected.reportedBy}</b></div>
              <div><span>Location</span><b>{selected.location || '—'}</b></div>
              <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
              <div><span>Priority</span><StatusBadge status={selected.priority} kind="priority" /></div>
              <div className="detail-full"><span>Description</span><p>{selected.description || '—'}</p></div>
            </div>

            <div className="form-row-2" style={{ marginTop: 18 }}>
              <label className="field">
                <span>Assign to</span>
                <select
                  value={selected.assignedTo}
                  onChange={async (e) => {
                    const value = e.target.value;
                    try {
                      await applyChange(selected.id, { assignedTo: value });
                      showToast(`${selected.id} assigned to ${value}.`, 'info');
                    } catch { /* already toasted */ }
                  }}
                >
                  {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={selected.status}
                  onChange={async (e) => {
                    const value = e.target.value;
                    try {
                      await applyChange(selected.id, { status: value });
                      showToast(`${selected.id} marked as ${value}.`, 'success');
                    } catch { /* already toasted */ }
                  }}
                >
                  {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}