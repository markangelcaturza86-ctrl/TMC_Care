import { useState, useEffect } from 'react';
import { Eye, Check, X, Banknote } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

function peso(n) {
  return n == null ? '—' : `₱${n.toLocaleString()}`;
}

export default function RequestsFinancial() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    api.get('/financial-requests')
      .then(setRequests)
      .catch(() => showToast('Failed to load requests.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status, amountApproved) => {
    try {
      const body = { status };
      if (amountApproved !== undefined) body.amount_approved = amountApproved;
      const updated = await api.put(`/financial-requests/${id}`, body);
      setRequests((rs) => rs.map((r) => (r.id === id ? updated : r)));
      setSelected(null);
      return updated;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleApprove = async (r) => {
    try {
      await updateStatus(r.id, 'Approved', r.amountRequested);
      showToast(`${r.id} approved for ${peso(r.amountRequested)}.`, 'success');
    } catch { /* already toasted in updateStatus */ }
  };

  const handleDecline = async (r) => {
    try {
      await updateStatus(r.id, 'Declined');
      showToast(`${r.id} was declined.`, 'error');
    } catch { /* already toasted in updateStatus */ }
  };

  const handleRelease = async (r) => {
    try {
      await updateStatus(r.id, 'Assistance Released');
      showToast(`Assistance released for ${r.id}.`, 'success');
    } catch { /* already toasted in updateStatus */ }
  };

  const columns = [
    { key: 'id', header: 'Request ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'student', header: 'Student' },
    { key: 'type', header: 'Type' },
    { key: 'amountRequested', header: 'Amount', render: (r) => peso(r.amountRequested) },
    { key: 'dateSubmitted', header: 'Submitted' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions', render: (r) => (
        <div className="row-actions">
          <button className="icon-btn" onClick={() => setSelected(r)} aria-label="View"><Eye size={17} /></button>
          {(r.status === 'Submitted' || r.status === 'Under Verification') && (
            <>
              <button className="icon-btn icon-btn--success" onClick={() => handleApprove(r)} aria-label="Approve"><Check size={17} /></button>
              <button className="icon-btn icon-btn--danger" onClick={() => handleDecline(r)} aria-label="Decline"><X size={17} /></button>
            </>
          )}
          {r.status === 'Approved' && (
            <button className="icon-btn icon-btn--info" onClick={() => handleRelease(r)} aria-label="Release funds"><Banknote size={17} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Financial Assistance Requests"
        subtitle="Review, approve, decline, or release student financial assistance."
      />

      <div className="panel">
        {loading ? (
          <p style={{ padding: 16 }}>Loading…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={requests}
            searchKeys={['id', 'student', 'type']}
            searchPlaceholder="Search by ID, student, or type..."
            filters={[
              { key: 'status', label: 'Status', options: ['Submitted', 'Under Verification', 'Additional Documents', 'Approved', 'Partially Approved', 'Declined', 'Assistance Released'] },
            ]}
            pageSize={9}
          />
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id}
        width={600}
        footer={selected && (selected.status === 'Submitted' || selected.status === 'Under Verification') && (
          <>
            <button className="btn btn--outline" onClick={() => handleDecline(selected)}>Decline</button>
            <button className="btn btn--primary" onClick={() => handleApprove(selected)}>Approve Request</button>
          </>
        )}
      >
        {selected && (
          <div className="detail-grid">
            <div><span>Student</span><b>{selected.student}</b></div>
            <div><span>Program</span><b>{selected.program}</b></div>
            <div><span>Assistance Type</span><b>{selected.type}</b></div>
            <div><span>Amount Requested</span><b>{peso(selected.amountRequested)}</b></div>
            <div><span>Status</span><StatusBadge status={selected.status} /></div>
            <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
            <div className="detail-full"><span>Reason</span><p>{selected.reason || '—'}</p></div>
            <div className="detail-full">
              <span>Attached Documents</span>
              <ul className="doc-list">
                {selected.documents.length === 0
                  ? <li style={{ color: '#6B7280' }}>No documents attached.</li>
                  : selected.documents.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}