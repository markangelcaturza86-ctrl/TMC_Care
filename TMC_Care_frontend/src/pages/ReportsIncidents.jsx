import { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';

export default function ReportsIncidents() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/incident-reports')
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'id', header: 'Report ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'type', header: 'Type' },
    { key: 'reportedBy', header: 'Reported By' },
    { key: 'location', header: 'Location' },
    { key: 'dateSubmitted', header: 'Date Submitted' },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} kind="priority" /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <button className="icon-btn" onClick={() => setSelected(r)} aria-label="View report">
          <Eye size={17} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Incident Reports"
        subtitle="Browse all incident reports submitted across campus."
        actions={<button className="btn btn--outline"><Download size={16} /> Export CSV</button>}
      />

      <div className="panel">
        {loading ? (
          <p style={{ padding: 16 }}>Loading…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={reports}
            searchKeys={['id', 'type', 'reportedBy', 'location']}
            searchPlaceholder="Search by ID, type, reporter, or location..."
            filters={[
              { key: 'status', label: 'Status', options: ['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'] },
              { key: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'] },
            ]}
          />
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.id} width={600}>
        {selected && (
          <div className="detail-grid">
            <div><span>Type</span><b>{selected.type}</b></div>
            <div><span>Status</span><StatusBadge status={selected.status} /></div>
            <div><span>Priority</span><StatusBadge status={selected.priority} kind="priority" /></div>
            <div><span>Reported By</span><b>{selected.reportedBy}</b></div>
            <div><span>Location</span><b>{selected.location || '—'}</b></div>
            <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
            <div><span>Assigned To</span><b>{selected.assignedTo}</b></div>
            <div className="detail-full"><span>Description</span><p>{selected.description || '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}