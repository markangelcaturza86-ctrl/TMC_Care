import { FileText, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { documents } from '../data/mockData';

export default function VerificationsDocuments() {
  const columns = [
    {
      key: 'name', header: 'File', render: (r) => (
        <span className="file-cell"><FileText size={16} /> {r.name}</span>
      ),
    },
    { key: 'owner', header: 'Owner' },
    { key: 'linkedTo', header: 'Linked To', render: (r) => <span className="mono">{r.linkedTo}</span> },
    { key: 'uploaded', header: 'Uploaded' },
    { key: 'size', header: 'Size' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: () => (
        <button className="icon-btn" aria-label="Download"><Download size={17} /></button>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Documents"
        subtitle="All supporting files uploaded by students across incident reports and financial requests."
      />
      <div className="panel">
        <DataTable
          columns={columns}
          rows={documents}
          searchKeys={['name', 'owner', 'linkedTo']}
          searchPlaceholder="Search by file name, owner, or linked ID..."
          filters={[{ key: 'status', label: 'Status', options: ['Verified', 'Pending', 'Rejected'] }]}
        />
      </div>
    </div>
  );
}
