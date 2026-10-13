import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api, openProtectedFile } from '../api/client';
import { useToast } from '../components/Toast';

export default function VerificationsPending() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [resolving, setResolving] = useState(false);
  const showToast = useToast();

  // First load when the page opens.
  useEffect(() => {
    api.get('/verifications/pending')
      .then(setItems)
      .catch((err) => showToast(err.message || 'Failed to load pending verifications.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Reload after an error (the list may be stale). Returns the fresh list, or null on failure.
  const reloadItems = async () => {
    try {
      const data = await api.get('/verifications/pending');
      setItems(data);
      return data;
    } catch (err) {
      showToast(err.message || 'Failed to refresh the list.', 'error');
      return null;
    }
  };

  const openReview = (item) => {
    setRemarks('');
    setSelected(item);
  };

  const closeReview = () => {
    if (!resolving) setSelected(null);
  };

  const openDocument = async (doc) => {
    try {
      await openProtectedFile(`/documents/${doc.id}/download`, doc.name);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resolve = async (status) => {
    if (!selected) return;
    if (status === 'Rejected' && !window.confirm(`Reject ${selected.id}? The requester will see it as declined.`)) {
      return;
    }

    const target = selected;
    setResolving(true);
    try {
      await api.post(`/verifications/${target.id}/resolve`, {
        status,
        remarks: remarks.trim() || undefined,
      });
      setItems((list) => list.filter((i) => i.id !== target.id));
      setSelected(null);
      showToast(
        `${target.id} was ${status === 'Verified' ? 'verified' : 'rejected'}.`,
        status === 'Verified' ? 'success' : 'error',
      );
    } catch (err) {
      showToast(err.message, 'error');
      // The list may be out of date (e.g. another admin already handled it).
      const fresh = await reloadItems();
      if (fresh && !fresh.some((i) => i.id === target.id)) setSelected(null);
    } finally {
      setResolving(false);
    }
  };

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'type', header: 'Type' },
    { key: 'requestedBy', header: 'Requested By' },
    { key: 'dateSubmitted', header: 'Date Submitted' },
    {
      key: 'documents', header: 'Documents',
      render: (r) => {
        const n = r.documents?.length ?? 0;
        return `${n} ${n === 1 ? 'file' : 'files'}`;
      },
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions', render: (r) => (
        <button className="link-btn" onClick={() => openReview(r)}>Review</button>
      ),
    },
  ];

  if (loading) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader
        title="Pending Verifications"
        subtitle="Review the details and supporting documents of new incident reports and financial requests, then verify or reject them."
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
        onClose={closeReview}
        title={selected ? `Review ${selected.id}` : ''}
        width={640}
        footer={selected && (
          <>
            <button className="btn btn--outline" disabled={resolving} onClick={() => resolve('Rejected')}>Reject</button>
            <button className="btn btn--primary" disabled={resolving} onClick={() => resolve('Verified')}>
              {resolving ? 'Saving…' : 'Mark Verified'}
            </button>
          </>
        )}
      >
        {selected && (
          <div className="detail-grid">
            <div><span>Type</span><b>{selected.type}</b></div>
            <div><span>Requested By</span><b>{selected.requestedBy}</b></div>
            <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
            <div><span>Status</span><StatusBadge status={selected.status} /></div>

            {(selected.fields ?? []).map((f) => {
              const value = String(f.value ?? '—');
              const long = value.length > 40 || value.includes('\n');
              return (
                <div key={f.label} className={long ? 'detail-full' : undefined}>
                  <span>{f.label}</span>
                  {long ? <p style={{ whiteSpace: 'pre-line' }}>{value}</p> : <b>{value}</b>}
                </div>
              );
            })}

            <div className="detail-full">
              <span>Documents to Review ({(selected.documents ?? []).length})</span>
              {(selected.documents ?? []).length === 0 ? (
                <p>No documents were attached to this request.</p>
              ) : (
                <ul className="doc-list doc-list--files">
                  {(selected.documents ?? []).map((d) => (
                    <li key={d.id} style={{ justifyContent: 'space-between' }}>
                      <button type="button" className="link-btn" onClick={() => openDocument(d)} title="Open this file">
                        <FileText size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                        {d.name}
                      </button>
                      <span style={{ color: '#6B7280', fontSize: 12 }}>{d.size}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="field detail-full">
              <span>Remarks (optional, saved in the audit log)</span>
              <textarea
                rows={2}
                maxLength={150}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Receipt is clear and matches the amount requested"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}