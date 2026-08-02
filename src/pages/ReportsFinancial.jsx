import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { financialRequests } from '../data/mockData';

function peso(n) {
  return n == null ? '\u2014' : `\u20b1${n.toLocaleString()}`;
}

export default function ReportsFinancial() {
  const [selected, setSelected] = useState(null);

  const columns = [
    { key: 'id', header: 'Request ID', render: (r) => <span className="mono">{r.id}</span> },
    { key: 'student', header: 'Student' },
    { key: 'type', header: 'Assistance Type' },
    { key: 'amountRequested', header: 'Requested', render: (r) => peso(r.amountRequested) },
    { key: 'amountApproved', header: 'Approved', render: (r) => peso(r.amountApproved) },
    { key: 'dateSubmitted', header: 'Date Submitted' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: (r) => (
        <button className="icon-btn" onClick={() => setSelected(r)} aria-label="View request">
          <Eye size={17} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Financial Requests"
        subtitle="Browse all financial assistance requests submitted by students."
        actions={<button className="btn btn--outline"><Download size={16} /> Export CSV</button>}
      />

      <div className="panel">
        <DataTable
          columns={columns}
          rows={financialRequests}
          searchKeys={['id', 'student', 'type']}
          searchPlaceholder="Search by ID, student, or assistance type..."
          filters={[
            { key: 'status', label: 'Status', options: ['Submitted', 'Under Verification', 'Additional Documents', 'Approved', 'Partially Approved', 'Declined', 'Assistance Released'] },
            { key: 'type', label: 'Type', options: ['Hospital / Medical Bills', 'Medicine Expenses', 'Transportation', 'Food & Daily Needs', 'School-related Expenses', 'Other Expenses'] },
          ]}
          pageSize={9}
        />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.id} width={600}>
        {selected && (
          <div className="detail-grid">
            <div><span>Student</span><b>{selected.student}</b></div>
            <div><span>Student ID</span><b className="mono">{selected.studentId}</b></div>
            <div><span>Program</span><b>{selected.program}</b></div>
            <div><span>Assistance Type</span><b>{selected.type}</b></div>
            <div><span>Amount Requested</span><b>{peso(selected.amountRequested)}</b></div>
            <div><span>Amount Approved</span><b>{peso(selected.amountApproved)}</b></div>
            <div><span>Date Submitted</span><b>{selected.dateSubmitted}</b></div>
            <div><span>Status</span><StatusBadge status={selected.status} /></div>
            <div className="detail-full"><span>Reason</span><p>{selected.reason}</p></div>
            <div className="detail-full">
              <span>Attached Documents</span>
              <ul className="doc-list">
                {selected.documents.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
