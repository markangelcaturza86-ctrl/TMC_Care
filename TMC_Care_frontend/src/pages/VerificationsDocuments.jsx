import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Check, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { api, openProtectedFile } from '../api/client';
import { useToast } from '../components/Toast';

export default function VerificationsDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    api.get('/documents')
      .then(setDocuments)
      .catch(() => showToast('Failed to load documents.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // The file sits behind the login, so it is fetched with the token and then
  // opened (PDF / images) or saved (other types).
  const handleOpen = async (doc) => {
    try {
      await openProtectedFile(`/documents/${doc.id}/download`, doc.name);
    } catch (err) {
      showToast(err.message || 'Could not open the file.', 'error');
    }
  };

  const setStatus = async (doc, status) => {
    setBusyId(doc.id);
    try {
      const updated = await api.put(`/documents/${doc.id}`, { status });
      setDocuments((ds) => ds.map((d) => (d.id === doc.id ? updated : d)));
      showToast(`${doc.name} marked as ${status}.`, status === 'Verified' ? 'success' : 'info');
    } catch (err) {
      showToast(err.message || 'Could not update the document.', 'error');
    } finally {
      setBusyId(null);
    }
  };

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
        <div className="drive-row-actions">
          <button className="icon-btn" aria-label="Open" title="Open" onClick={() => handleOpen(r)}><Eye size={17} /></button>
          <button className="icon-btn" aria-label="Download" title="Download" onClick={() => handleOpen(r)}><Download size={17} /></button>
          {r.status !== 'Verified' && (
            <button className="icon-btn icon-btn--success" aria-label="Verify" title="Mark as verified"
              disabled={busyId === r.id} onClick={() => setStatus(r, 'Verified')}><Check size={17} /></button>
          )}
          {r.status !== 'Rejected' && (
            <button className="icon-btn icon-btn--danger" aria-label="Reject" title="Reject"
              disabled={busyId === r.id} onClick={() => setStatus(r, 'Rejected')}><X size={17} /></button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader
        title="Documents"
        subtitle="Supporting files sent with incident reports and financial requests. Open a file, then verify or reject it."
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
