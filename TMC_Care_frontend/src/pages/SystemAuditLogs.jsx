import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { api } from '../api/client';

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs')
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'date', header: 'Timestamp' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action' },
    { key: 'target', header: 'Target', render: (r) => <span className="mono">{r.target || '—'}</span> },
    { key: 'ip', header: 'IP Address', render: (r) => <span className="mono">{r.ip || '—'}</span> },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Audit Logs" subtitle="A record of administrative actions taken within the system." />
      <div className="panel">
        {loading ? (
          <p style={{ padding: 16 }}>Loading…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={logs}
            searchKeys={['actor', 'action', 'target']}
            searchPlaceholder="Search by actor, action, or target..."
          />
        )}
      </div>
    </div>
  );
}