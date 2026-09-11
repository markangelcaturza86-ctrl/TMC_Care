import { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

export default function VerificationsDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    api.get('/documents')
      .then(setDocuments)
      .catch(() => showToast('Failed to load documents.', 'error'))
      .finally(() => setLoading(false));
  }, []);

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
      key: 'actions', header: '', render: (r) => (
        <button className="icon-btn" aria-label="Download" onClick={() => handleDownload(r)}><Download size={17} /></button>
      ),
    },
  ];

  const handleDownload = (doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      showToast('Download link not available for this file.', 'error');
    }
  };

  if (loading) return <div className="page-stack">Loading…</div>;

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