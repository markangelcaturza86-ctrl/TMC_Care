import {
  ClipboardList, MessageSquare, TriangleAlert, UserX, CheckCircle2, ShieldCheck,
  Wallet, HandCoins, Inbox, Clock3, Banknote, Users,
} from 'lucide-react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import StatusBadge from './StatusBadge';
import { peso } from '../utils/money';
import './drive.css';

/* ------------------------------------------------------------------ shared */

// "What you do in this system": the steps of the account's own work, each with a shortcut.
function RoleGuide({ title, intro, steps, navigate }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="panel-header" style={{ marginBottom: 6 }}>
        <h3>{title}</h3>
      </div>
      <p className="drive-hint">{intro}</p>
      <ol className="role-steps">
        {steps.map((step) => (
          <li key={step.text}>
            <span>{step.text}</span>
            {step.path && (
              <button type="button" className="link-btn" onClick={() => navigate(step.path)}>{step.label}</button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Bar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="drive-bar"><div className="drive-bar-fill" style={{ width: `${pct}%` }} /></div>;
}

function Empty({ children }) {
  return <p className="drive-hint" style={{ margin: 0 }}>{children}</p>;
}

/* ------------------------------------------------------- Guidance Counselor */

export function GuidanceDashboard({ data, navigate }) {
  const { stats, needsAttention, replies, byCategory, byStatus } = data;
  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));
  const maxStatus = Math.max(1, ...byStatus.map((c) => c.count));

  return (
    <div className="page-stack">
      <PageHeader title="Guidance Counselor Dashboard" subtitle="Incident reports sent from the app, and what needs your attention." />

      <RoleGuide
        title="Your role in the system"
        intro="You are the first responder for incident reports (bullying, abuse, safety threats, mental health and more) sent by students and staff."
        navigate={navigate}
        steps={[
          { text: 'Check new reports and verify them, or dismiss the ones that are not valid.', label: 'Pending verifications', path: '/verifications/pending' },
          { text: 'Open a report to read the details and attachments, assign a case officer and ask the reporter questions.', label: 'Incident reports', path: '/requests/incidents' },
          { text: 'Check the photos and files the reporter sent, and mark them verified or rejected.', label: 'Documents', path: '/verifications/documents' },
          { text: 'Keep the status updated until the case is Resolved. The reporter is notified in the app.' },
        ]}
      />

      <div className="stat-grid">
        <StatCard icon={ShieldCheck} iconBg="#FEE7DC" iconColor="#EA580C" label="New reports to verify"
          value={stats.toVerify} delta="Status: Submitted" deltaTone="neutral" onClick={() => navigate('/verifications/pending')} />
        <StatCard icon={ClipboardList} iconBg="#E7EEFD" iconColor="#2F6FED" label="Open cases"
          value={stats.openCases} delta="Not yet resolved" deltaTone="neutral" onClick={() => navigate('/requests/incidents')} />
        <StatCard icon={MessageSquare} iconBg="#EDE9FE" iconColor="#7C3AED" label="Replies from reporters"
          value={stats.unreadReplies} delta="Unread answers" deltaTone="neutral" onClick={() => navigate('/requests/incidents')} />
        <StatCard icon={UserX} iconBg="#FEF3C7" iconColor="#D97706" label="Unassigned open cases"
          value={stats.unassigned} delta="Need a case officer" deltaTone="neutral" onClick={() => navigate('/requests/incidents')} />
        <StatCard icon={TriangleAlert} iconBg="#FEE2E2" iconColor="#DC2626" label="High priority open"
          value={stats.highPriority} delta="Handle first" deltaTone="neutral" onClick={() => navigate('/requests/incidents')} />
        <StatCard icon={CheckCircle2} iconBg="#DCFCE7" iconColor="#16A34A" label="Resolved this month"
          value={stats.resolvedThisMonth} delta="Closed cases" deltaTone="up" />
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>Needs your attention</h3>
            <button className="link-btn" onClick={() => navigate('/verifications/pending')}>View all</button>
          </div>
          {needsAttention.length === 0 ? <Empty>No new reports waiting. Nice work.</Empty> : (
            <div className="table-scroll">
              <table className="data-table data-table--compact">
                <thead><tr><th>ID</th><th>Incident</th><th>Reported by</th><th>Priority</th><th>Date</th></tr></thead>
                <tbody>
                  {needsAttention.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td>{r.type}<div className="drive-note">{r.location}</div></td>
                      <td>{r.reportedBy}</td>
                      <td>{r.priority ? <StatusBadge status={r.priority} kind="priority" /> : '—'}</td>
                      <td>{r.dateSubmitted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Reporters who replied</h3></div>
          {replies.length === 0 ? <Empty>No unread replies.</Empty> : (
            <ul className="mini-list role-list">
              {replies.map((r) => (
                <li key={r.code}>
                  <button type="button" className="link-btn" onClick={() => navigate('/requests/incidents')}>
                    <span className="mono">{r.code}</span>
                  </button>{' '}
                  <b>{r.from}</b>{r.count > 1 ? ` (${r.count} messages)` : ''}
                  <div className="drive-note">{r.snippet} &middot; {r.time}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header"><h3>Reports by category</h3></div>
          {byCategory.length === 0 ? <Empty>No reports yet.</Empty> : (
            <div className="bar-list">
              {byCategory.map((c) => (
                <div className="bar-row" key={c.name}>
                  <span className="bar-label">{c.name}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.count / maxCat) * 100}%` }} /></div>
                  <span className="bar-value">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Cases by status</h3></div>
          <div className="bar-list">
            {byStatus.map((c) => (
              <div className="bar-row" key={c.name}>
                <span className="bar-label">{c.name}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.count / maxStatus) * 100}%` }} /></div>
                <span className="bar-value">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ TMC Treasurer */

export function TreasurerDashboard({ data, navigate }) {
  const { stats, pendingRemittances, drives, awaiting } = data;

  return (
    <div className="page-stack">
      <PageHeader title="TMC Treasurer Dashboard" subtitle="Financial assistance requests, donation drives and the cash coming in from departments." />

      <RoleGuide
        title="Your role in the system"
        intro="Financial assistance works as a school donation drive: you approve the request, the departments collect donations, and you release the money to the family."
        navigate={navigate}
        steps={[
          { text: 'Verify new requests and their documents (death certificate or medical papers).', label: 'Pending verifications', path: '/verifications/pending' },
          { text: 'Approve a request to open its donation drive with a target amount and deadline. An announcement is posted in the app.', label: 'Financial requests', path: '/requests/financial' },
          { text: 'Department treasurers (CCS, CCJE, COAD, CAS, COED) hand you the cash they collected. Count it, then receive or reject each hand-over.', label: 'Open a drive', path: '/requests/financial' },
          { text: 'When all the cash is in your hands and a document is verified, a different admin than the approver releases it to the family.' },
        ]}
      />

      <div className="stat-grid">
        <StatCard icon={ShieldCheck} iconBg="#FEE7DC" iconColor="#EA580C" label="Requests to verify"
          value={stats.toVerify} delta="Status: Submitted" deltaTone="neutral" onClick={() => navigate('/verifications/pending')} />
        <StatCard icon={HandCoins} iconBg="#E7EEFD" iconColor="#2F6FED" label="Open donation drives"
          value={stats.openDrives} delta={`${peso(stats.collected)} of ${peso(stats.target)}`} deltaTone="neutral" onClick={() => navigate('/requests/financial')} />
        <StatCard icon={Inbox} iconBg="#FEF3C7" iconColor="#D97706" label="Cash waiting for you"
          value={peso(stats.toReceive)} delta={`${stats.pendingRemittances} hand-over${stats.pendingRemittances === 1 ? '' : 's'} to receive`} deltaTone="neutral" onClick={() => navigate('/requests/financial')} />
        <StatCard icon={Wallet} iconBg="#EDE9FE" iconColor="#7C3AED" label="Still with departments"
          value={peso(stats.withDepartments)} delta="Not handed over yet" deltaTone="neutral" />
        <StatCard icon={CheckCircle2} iconBg="#DCFCE7" iconColor="#16A34A" label="Ready to release"
          value={stats.readyToRelease} delta="All cash received" deltaTone="up" onClick={() => navigate('/requests/financial')} />
        <StatCard icon={Banknote} iconBg="#CCFBF1" iconColor="#0F766E" label="Released so far"
          value={peso(stats.releasedAmount)} delta={`${stats.releasedCount} request${stats.releasedCount === 1 ? '' : 's'}`} deltaTone="up" />
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>Open donation drives</h3>
            <button className="link-btn" onClick={() => navigate('/requests/financial')}>Manage</button>
          </div>
          {drives.length === 0 ? <Empty>No donation drive is open. Approve a request to start one.</Empty> : (
            <div className="role-drives">
              {drives.map((d) => (
                <div key={d.id} className="role-drive">
                  <div className="role-drive-top">
                    <span><span className="mono">{d.id}</span> &middot; {d.beneficiary}</span>
                    {d.ready ? <span className="drive-pill">Ready to release</span>
                      : <span className="drive-note">{d.withDepartments > 0 ? `${peso(d.withDepartments)} not received yet` : ''}</span>}
                  </div>
                  <Bar value={d.collected} max={d.target} />
                  <div className="drive-progress-text">
                    <b>{peso(d.collected)}</b> of {peso(d.target)}
                    <span> &middot; ends {d.deadline || '—'}{d.overdue ? ' (deadline passed)' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Hand-overs waiting for you</h3></div>
          {pendingRemittances.length === 0 ? <Empty>No cash is waiting to be received.</Empty> : (
            <ul className="mini-list role-list">
              {pendingRemittances.map((r) => (
                <li key={r.id}>
                  <b>{r.department}</b> &middot; {peso(r.amount)}
                  <div className="drive-note">{r.code} &middot; {r.requestCode} &middot; {r.submittedAt}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Requests waiting for verification</h3>
          <button className="link-btn" onClick={() => navigate('/verifications/pending')}>View all</button>
        </div>
        {awaiting.length === 0 ? <Empty>Nothing to verify right now.</Empty> : (
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead><tr><th>ID</th><th>Type</th><th>For</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {awaiting.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td><td>{r.type}</td><td>{r.requestedBy}</td>
                    <td>{peso(r.amount)}</td><td>{r.dateSubmitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Department Treasurer */

export function DepartmentDashboard({ data, navigate }) {
  const { stats, drives, remittances, department } = data;

  return (
    <div className="page-stack">
      <PageHeader title={`${department ?? 'Department'} Treasurer Dashboard`} subtitle="Donations collected in your department and what you still have to hand over." />

      <RoleGuide
        title="Your role in the system"
        intro={`You collect donations from ${department ?? 'your department'} for the approved donation drives and pass the cash to the TMC Treasurer.`}
        navigate={navigate}
        steps={[
          { text: 'Pick an open drive and collect donations from students and staff in your department.', label: 'Open Collections', path: '/collections' },
          { text: 'Record every donation (donor, amount, date) right away, so the cash is always traceable.', label: 'Record a donation', path: '/collections' },
          { text: 'Give the cash to the TMC Treasurer in person, then press "Hand over" in Collections.' },
          { text: 'Wait for the TMC Treasurer to confirm. Only confirmed cash counts toward the drive.' },
        ]}
      />

      <div className="stat-grid">
        <StatCard icon={Wallet} iconBg="#FEF3C7" iconColor="#D97706" label="Cash you are holding"
          value={peso(stats.held)} delta="Hand it over soon" deltaTone="neutral" onClick={() => navigate('/collections')} />
        <StatCard icon={Clock3} iconBg="#EDE9FE" iconColor="#7C3AED" label="Awaiting confirmation"
          value={peso(stats.awaiting)} delta="Handed over, not yet received" deltaTone="neutral" onClick={() => navigate('/collections')} />
        <StatCard icon={CheckCircle2} iconBg="#DCFCE7" iconColor="#16A34A" label="Confirmed so far"
          value={peso(stats.confirmed)} delta="Received by the TMC Treasurer" deltaTone="up" />
        <StatCard icon={Users} iconBg="#E7EEFD" iconColor="#2F6FED" label="Open donation drives"
          value={stats.openDrives} delta="Collect for these" deltaTone="neutral" onClick={() => navigate('/collections')} />
      </div>

      <div className="grid-2fr-1fr">
        <div className="panel">
          <div className="panel-header">
            <h3>Open donation drives</h3>
            <button className="link-btn" onClick={() => navigate('/collections')}>Open Collections</button>
          </div>
          {drives.length === 0 ? <Empty>No donation drive is open right now.</Empty> : (
            <div className="table-scroll">
              <table className="data-table data-table--compact">
                <thead><tr><th>Drive</th><th>For</th><th>Total so far</th><th>With you</th><th>Ends</th></tr></thead>
                <tbody>
                  {drives.map((d) => (
                    <tr key={d.id}>
                      <td><span className="mono">{d.id}</span><div className="drive-note">{d.type}</div></td>
                      <td>{d.beneficiary}</td>
                      <td>{peso(d.collected)} <span className="drive-note">of {peso(d.target)}</span></td>
                      <td>{peso(d.held)}</td>
                      <td>{d.deadline || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Your recent hand-overs</h3></div>
          {remittances.length === 0 ? <Empty>You have not handed over any cash yet.</Empty> : (
            <ul className="mini-list role-list">
              {remittances.map((r) => (
                <li key={r.id}>
                  <b>{peso(r.amount)}</b> &middot; {r.status}
                  <div className="drive-note">{r.code} &middot; {r.requestCode} &middot; {r.submittedAt}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
