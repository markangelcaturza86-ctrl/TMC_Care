import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Check, X, ImageOff } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { api, openProtectedFile, fetchProtectedBlobUrl } from '../api/client';
import { useToast } from '../components/Toast';

export default function VerificationsDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);          // the document shown in the picture window
  const [previewUrl, setPreviewUrl] = useState(null);    // blob: url of its picture
  const [previewFailed, setPreviewFailed] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    api.get('/documents')
      .then(setDocuments)
      .catch(() => showToast('Failed to load documents.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Load the picture (it sits behind the login, so it is fetched with the token).
  useEffect(() => {
    if (!preview?.isImage) return undefined;

    let cancelled = false;
    let created = null;
    fetchProtectedBlobUrl(`/documents/${preview.id}/download`)
      .then((url) => {
        if (cancelled) URL.revokeObjectURL(url);
        else { created = url; setPreviewUrl(url); }
      })
      .catch(() => { if (!cancelled) setPreviewFailed(true); });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [preview?.id, preview?.isImage]);

  // PDFs / other files open in a new tab (or download).
  const handleOpen = async (doc) => {
    try {
      await openProtectedFile(`/documents/${doc.id}/download`, doc.name);
    } catch (err) {
      showToast(err.message || 'Could not open the file.', 'error');
    }
  };

  // Pictures open in a window right here on the page; other files use handleOpen.
  const handleView = (doc) => {
    if (doc.isImage) {
      setPreviewUrl(null);
      setPreviewFailed(false);
      setPreview(doc);
    } else {
      handleOpen(doc);
    }
  };

  const setStatus = async (doc, status) => {
    setBusyId(doc.id);
    try {
      const updated = await api.put(`/documents/${doc.id}`, { status });
      setDocuments((ds) => ds.map((d) => (d.id === doc.id ? updated : d)));
      setPreview((p) => (p && p.id === doc.id ? updated : p));
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
          <button className="icon-btn" aria-label="View" title="View" onClick={() => handleView(r)}><Eye size={17} /></button>
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

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        width={760}
        footer={preview && (
          <>
            {previewUrl && (
              <a className="btn btn--outline" href={previewUrl} download={preview.name}>Download</a>
            )}
            {preview.status !== 'Rejected' && (
              <button className="btn btn--outline" disabled={busyId === preview.id} onClick={() => setStatus(preview, 'Rejected')}>Reject</button>
            )}
            {preview.status !== 'Verified' && (
              <button className="btn btn--primary" disabled={busyId === preview.id} onClick={() => setStatus(preview, 'Verified')}>Mark Verified</button>
            )}
          </>
        )}
      >
        {preview && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160, marginBottom: 16 }}>
              {previewFailed ? (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280' }}>
                  <ImageOff size={18} /> This picture could not be loaded.
                </p>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={preview.name}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }}
                />
              ) : (
                <p style={{ color: '#6B7280' }}>Loading picture…</p>
              )}
            </div>
            <div className="detail-grid">
              <div><span>Owner</span><b>{preview.owner}</b></div>
              <div><span>Linked To</span><b className="mono">{preview.linkedTo}</b></div>
              <div><span>Uploaded</span><b>{preview.uploaded}</b></div>
              <div><span>Size</span><b>{preview.size}</b></div>
              <div><span>Status</span><StatusBadge status={preview.status} /></div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
