import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { auditLogs } from '../data/mockData';

export default function SystemAuditLogs() {
  const columns = [
    { key: 'date', header: 'Timestamp' },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action' },
    { key: 'target', header: 'Target', render: (r) => <span className="mono">{r.target}</span> },
    { key: 'ip', header: 'IP Address', render: (r) => <span className="mono">{r.ip}</span> },
  ];

  return (
    <div className="page-stack">
      <PageHeader title="Audit Logs" subtitle="A record of administrative actions taken within the system." />
      <div className="panel">
        <DataTable
          columns={columns}
          rows={auditLogs}
          searchKeys={['actor', 'action', 'target']}
          searchPlaceholder="Search by actor, action, or target..."
        />
      </div>
    </div>
  );
}
