import { useState, useEffect } from 'react';
import { Eye, Check, X, Banknote } from 'lucide-react';
import DonationDrivePanel from '../components/DonationDrivePanel';
import { peso } from '../utils/money';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

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

  // Called by the donation drive panel after approving / recording / releasing.
  const applyUpdated = (updated) => {
    setRequests((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur));
  };

  const handleDecline = async (r) => {
    try {
      await updateStatus(r.id, 'Declined');
      showToast(`${r.id} was declined.`, 'error');
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
              <button className="icon-btn icon-btn--success" onClick={() => setSelected(r)} aria-label="Review and approve"><Check size={17} /></button>
              <button className="icon-btn icon-btn--danger" onClick={() => handleDecline(r)} aria-label="Decline"><X size={17} /></button>
            </>
          )}
          {r.status === 'Approved' && (
            <button className="icon-btn icon-btn--info" onClick={() => setSelected(r)} aria-label="Open donation drive"><Banknote size={17} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Financial Assistance Requests"
        subtitle="Approve requests to open a school donation drive, record the donations collected, then release them."
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
        width={680}
        footer={selected && (selected.status === 'Submitted' || selected.status === 'Under Verification') && (
          <button className="btn btn--outline" onClick={() => handleDecline(selected)}>Decline</button>
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
            <div><span>Requester</span><b>{selected.requesterName || '—'}</b></div>
            <div><span>Relationship</span><b>{selected.relationship || '—'}</b></div>
            <div className="detail-full"><span>Contact</span><b>{selected.contactInfo || '—'}</b></div>
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
        {selected && (
          <DonationDrivePanel
            key={`${selected.id}-${selected.status}`}
            request={selected}
            onChange={applyUpdated}
          />
        )}
      </Modal>
    </div>
  );
}