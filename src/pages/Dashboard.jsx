import {
  ClipboardList, TriangleAlert, HandCoins, Clock3, CheckCircle2, BadgeCheck,
  CheckCircle, Upload, FileText,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  dashboardStats, weeklyReportsOverview, requestsByStatus, topRequestTypes,
  pendingVerifications, recentActivities, announcements,
} from '../data/mockData';

const activityIcons = { check: CheckCircle, clock: Clock3, file: FileText, upload: Upload };

export default function Dashboard({ navigate }) {
  const total = requestsByStatus.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" subtitle="Overview of the system and pending actions." />

      <div className="stat-grid">
        <StatCard icon={ClipboardList} iconBg="#E7EEFD" iconColor="#2F6FED"
          label="Total Reports" value={dashboardStats.totalReports}
          delta={dashboardStats.totalReportsDelta} deltaTone="up" />
        <StatCard icon={TriangleAlert} iconBg="#FEE7DC" iconColor="#EA580C"
          label="Incident Reports" value={dashboardStats.incidentReports}
          delta={dashboardStats.incidentReportsDelta} deltaTone="up"
          onClick={() => navigate('/reports/incidents')} />
        <StatCard icon={HandCoins} iconBg="#DCFCE7" iconColor="#16A34A"
          label="Financial Requests" value={dashboardStats.financialRequests}
          delta={dashboardStats.financialRequestsDelta} deltaTone="up"
          onClick={() => navigate('/reports/financial')} />
        <StatCard icon={Clock3} iconBg="#FEF3C7" iconColor="#D97706"
          label="Pending Verifications" value={dashboardStats.pendingVerifications}
          delta="Requires attention" deltaTone="warn"
          onClick={() => navigate('/verifications/pending')} />
        <StatCard icon={BadgeCheck} iconBg="#EDE9FE" iconColor="#7C3AED"
          label="Approved Requests" value={dashboardStats.approvedRequests}
          delta="This month" deltaTone="neutral" />
        <StatCard icon={CheckCircle2} iconBg="#CCFBF1" iconColor="#0F766E"
          label="Assistance Released" value={dashboardStats.assistanceReleased}
          delta="This month" deltaTone="neutral" />
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>Reports Overview</h3>
            <select className="select-filter" defaultValue="This Week">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyReportsOverview} margin={{ top: 10, left: -12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E9F2', fontSize: 13 }} />
              <Line type="monotone" dataKey="incidents" name="Incident Reports" stroke="#2F6FED" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="financial" name="Financial Requests" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="legend-row">
            <span><i className="legend-dot" style={{ background: '#2F6FED' }} /> Incident Reports</span>
            <span><i className="legend-dot" style={{ background: '#16A34A' }} /> Financial Requests</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Requests by Status</h3>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={requestsByStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                  {requestsByStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E9F2', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="donut-legend">
              {requestsByStatus.map((s) => (
                <li key={s.name}>
                  <span>
                    <i className="legend-dot" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <b>{s.value} ({Math.round((s.value / total) * 100)}%)</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>Pending Verifications</h3>
            <button className="link-btn" onClick={() => navigate('/verifications/pending')}>View All</button>
          </div>
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Requested By</th><th>Date Submitted</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.slice(0, 5).map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{v.id}</td>
                    <td>{v.type}</td>
                    <td>{v.requestedBy}</td>
                    <td>{v.dateSubmitted}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Top Request Types (Financial Assistance)</h3>
          </div>
          <div className="bar-list">
            {topRequestTypes.map((r) => {
              const max = Math.max(...topRequestTypes.map((x) => x.count));
              return (
                <div className="bar-row" key={r.type}>
                  <span className="bar-label">{r.type}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span className="bar-value">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>System Announcements</h3>
          </div>
          <div className="announcement-strip">
            <p>{announcements[0].title}</p>
            <span>Posted on {announcements[0].date} &middot; {announcements[0].postedBy}</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent Activities</h3>
          </div>
          <ul className="activity-list">
            {recentActivities.map((a) => {
              const Icon = activityIcons[a.icon];
              return (
                <li key={a.id}>
                  <div className={`activity-icon activity-icon--${a.color}`}>
                    <Icon size={15} />
                  </div>
                  <div className="activity-text">
                    <p>{a.title}</p>
                    <span>{a.detail}</span>
                  </div>
                  <span className="activity-time">{a.time}</span>
                </li>
              );
            })}
          </ul>
          <button className="link-btn" style={{ marginTop: 4 }}>View All</button>
        </div>
      </div>
    </div>
  );
}
