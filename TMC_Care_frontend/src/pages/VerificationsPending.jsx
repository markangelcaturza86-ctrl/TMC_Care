import { useState, useEffect } from 'react';
import { Check, X, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

export default function VerificationsPending() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    api.get('/verifications/pending')
      .then(setItems)
      .catch(() => showToast('Failed to load pending verifications.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id, status) => {
    setResolving(true);
    try {
      await api.put(`/verifications/${id}`, { status });
      setItems((list) => list.filter((i) => i.id !== id));
      setSelected(null);
      showToast(`${id} marked as ${status}.`, status === 'Verified' ? 'success' : 'error');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResolving(false);
    }
  };

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'type', header: 'Type' },
    { key: 'requestedBy', header: 'Requested By' },
    { key: 'dateSubmitted', header: 'Date Submitted' },
    { key: 'documents', header: 'Documents', render: (r) => `${r.documents.length} file${r.documents.length > 1 ? 's' : ''}` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => setSelected(r)} aria-label="Review"><FileText size={17} /></button>
          <button className="icon-btn icon-btn--success" onClick={() => resolve(r.id, 'Verified')} aria-label="Verify"><Check size={17} /></button>
          <button className="icon-btn icon-btn--danger" onClick={() => resolve(r.id, 'Rejected')} aria-label="Reject"><X size={17} /></button>
        </div>
      ),
    },
  ];

  if (loading) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader
        title="Pending Verifications"
        subtitle="Verify supporting documents attached to incident reports and financial requests."
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={items}
          searchKeys={['id', 'requestedBy']}
          searchPlaceholder="Search by ID or requester..."
          filters={[{ key: 'type', label: 'Type', options: ['Financial', 'Incident'] }]}
          emptyMessage="All caught up — no pending verifications."
        />
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id}
        footer={selected && (
          <>
            <button className="btn btn--outline" disabled={resolving} onClick={() => resolve(selected.id, 'Rejected')}>Reject</button>
            <button className="btn btn--primary" disabled={resolving} onClick={() => resolve(selected.id, 'Verified')}>Mark Verified</button>
          </>
        )}
      >
        {selected && (
          <div className="detail-grid">
            <div><span>Type</span><b>{selected.type}</b></div>
            <div><span>Requested By</span><b>{selected.requestedBy}</b></div>
            <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
            <div><span>Status</span><StatusBadge status={selected.status} /></div>
            <div className="detail-full">
              <span>Documents to Review</span>
              <ul className="doc-list doc-list--files">
                {selected.documents.map((d) => (
                  <li key={d}><FileText size={15} /> {d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}