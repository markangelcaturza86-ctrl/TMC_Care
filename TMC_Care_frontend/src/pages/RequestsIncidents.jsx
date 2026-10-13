import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import IncidentAttachments from '../components/IncidentAttachments';
import IncidentConversation from '../components/IncidentConversation';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

const STATUS_FLOW = ['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'];
// Names offered in the "Assign to" list. Add your new case officers here.
const STAFF = ['Unassigned', 'Admin User'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

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

  // Opening a report: the first person to open an unassigned one becomes its
  // assigned officer, and an "Under Review" report moves to "Investigating"
  // when its assigned officer opens it. The server does both and returns the result.
  const openReport = async (report) => {
    setSelected(report);
    try {
      const updated = await api.post(`/incident-reports/${report.id}/open`);
      setReports((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      setSelected((s) => (s && s.id === updated.id ? updated : s));
    } catch {
      // viewing still works even if the auto-assign call fails
    }
  };

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

  const setStatusManually = async (status, label) => {
    try {
      await applyChange(selected.id, { status });
      showToast(`${selected.id} ${label}.`, 'success');
    } catch { /* already toasted */ }
  };

  const columns = [
    { key: 'id', header: 'Report ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'type', header: 'Type' },
    { key: 'reportedBy', header: 'Reported By' },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} kind="priority" /> },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'attachments', header: 'Photos', render: (r) => (r.attachments?.length ?? 0) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <button className="icon-btn" onClick={() => openReport(r)} aria-label="Manage report">
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.id} width={700}>
        {selected && (
          <>
            <div className="detail-grid">
              <div><span>Type</span><b>{selected.type}</b></div>
              <div><span>Reported By</span><b>{selected.reportedBy}</b></div>
              <div><span>Location</span><b>{selected.location || '—'}</b></div>
              <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
              <div><span>Priority (auto-set)</span><StatusBadge status={selected.priority} kind="priority" /></div>
              <div className="detail-full"><span>Description</span><p>{selected.description || '—'}</p></div>
              <div className="detail-full"><span>People Involved</span><p>{selected.peopleInvolved || '—'}</p></div>
            </div>

            <IncidentAttachments key={selected.id} files={selected.attachments ?? []} />

            <IncidentConversation
              key={`convo-${selected.id}`}
              reportId={selected.id}
              canMessage={selected.canMessage !== false}
            />

            <div className="form-row-2" style={{ marginTop: 18 }}>
              <label className="field">
                <span>Assigned to (whoever opened it first)</span>
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
                  {(STAFF.includes(selected.assignedTo) ? STAFF : [...STAFF, selected.assignedTo])
                    .map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Priority (auto-set, you can adjust)</span>
                <select
                  value={selected.priority}
                  onChange={async (e) => {
                    const value = e.target.value;
                    try {
                      await applyChange(selected.id, { priority: value });
                      showToast(`${selected.id} priority set to ${value}.`, 'info');
                    } catch { /* already toasted */ }
                  }}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <span>Status (updates automatically — only Resolved is set by you)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <StatusBadge status={selected.status} />
                {selected.status === 'Resolved' ? (
                  <button className="btn btn--outline" onClick={() => setStatusManually('Investigating', 'reopened')}>
                    Reopen case
                  </button>
                ) : selected.status !== 'Dismissed' && (
                  <button
                    className="btn btn--primary"
                    disabled={selected.status === 'Submitted'}
                    title={selected.status === 'Submitted' ? 'Verify this report first in Pending Verifications' : undefined}
                    onClick={() => setStatusManually('Resolved', 'marked as Resolved')}
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
              <small style={{ color: '#6B7280', marginTop: 6, display: 'block' }}>
                Submitted → Under Review when verified → Investigating when the assigned officer opens it or messages the reporter.
              </small>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}