import { useEffect, useState } from 'react';
import { Check, X, Trash2, Plus, Banknote, Inbox } from 'lucide-react';
import { api } from '../api/client';
import { peso } from '../utils/money';
import { useToast } from './Toast';
import './drive.css';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

/**
 * The school's donation drive for one financial request:
 *   Submitted / Under Verification -> set target + deadline and approve (opens the drive)
 *   Approved                       -> log the donations collected in person, then release
 *   Assistance Released            -> read-only summary
 *
 * Use with a `key` that includes the status so it reloads after each change:
 *   <DonationDrivePanel key={`${r.id}-${r.status}`} request={r} onChange={...} />
 */
export default function DonationDrivePanel({ request, onChange }) {
  const showToast = useToast();
  const status = request.status;
  const isOpen = status === 'Approved';
  const isReleased = status === 'Assistance Released';
  const canApprove = status === 'Submitted' || status === 'Under Verification' || status === 'Additional Documents';

  const [donations, setDonations] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [unreceived, setUnreceived] = useState(0);
  const [busy, setBusy] = useState(false);

  // approve form
  const [target, setTarget] = useState(String(request.amountRequested ?? ''));
  const [deadline, setDeadline] = useState(inDays(14));

  // donation form
  const [donor, setDonor] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedOn, setReceivedOn] = useState(today());
  const [notes, setNotes] = useState('');

  // release form
  const [releasedTo, setReleasedTo] = useState('');

  useEffect(() => {
    if (!isOpen && !isReleased) return undefined;
    let cancelled = false;
    api.get(`/financial-requests/${request.id}/donations`)
      .then((data) => {
        if (cancelled) return;
        setDonations(data.donations);
        setRemittances(data.remittances ?? []);
        setUnreceived(data.unreceived ?? 0);
      })
      .catch((err) => showToast(err.message, 'error'));
    return () => { cancelled = true; };
  }, [request.id, isOpen, isReleased, showToast]);

  const applyState = (data) => {
    setDonations(data.donations);
    setRemittances(data.remittances ?? []);
    setUnreceived(data.unreceived ?? 0);
    onChange(data.request);
  };

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const approve = () => run(async () => {
    const updated = await api.post(`/financial-requests/${request.id}/approve`, {
      target_amount: Number(target),
      drive_deadline: deadline,
    });
    showToast(`${request.id} approved. The donation drive is now open.`, 'success');
    onChange(updated);
  });

  const addDonation = () => run(async () => {
    const data = await api.post(`/financial-requests/${request.id}/donations`, {
      donor_name: donor,
      amount: Number(amount),
      received_on: receivedOn,
      notes: notes || undefined,
    });
    setDonor(''); setAmount(''); setNotes('');
    showToast('Donation recorded.', 'success');
    applyState(data);
  });

  const removeDonation = (d) => {
    if (!window.confirm(`Remove the ${peso(d.amount)} donation from ${d.donor}?`)) return;
    run(async () => {
      const data = await api.delete(`/financial-requests/${request.id}/donations/${d.id}`);
      showToast('Donation removed.', 'info');
      applyState(data);
    });
  };

  const receiveRemittance = (r) => {
    if (!window.confirm(`Confirm that you received ${peso(r.amount)} in cash from ${r.department}?`)) return;
    run(async () => {
      const data = await api.post(`/remittances/${r.id}/receive`, {});
      showToast(`${r.code} received.`, 'success');
      applyState(data);
    });
  };

  const rejectRemittance = (r) => {
    const note = window.prompt(`Why are you rejecting ${r.code}? (e.g. amount does not match the cash handed over)`);
    if (!note || !note.trim()) return;
    run(async () => {
      const data = await api.post(`/remittances/${r.id}/reject`, { note: note.trim() });
      showToast(`${r.code} rejected. The department can count and send it again.`, 'info');
      applyState(data);
    });
  };

  const release = () => {
    if (!window.confirm(`Close the drive and release ${peso(request.amountCollected)} to ${releasedTo.trim()}? This cannot be undone.`)) return;
    run(async () => {
      const updated = await api.post(`/financial-requests/${request.id}/release`, { released_to: releasedTo.trim() });
      showToast(`Assistance released for ${request.id}.`, 'success');
      onChange(updated);
    });
  };

  // ---- release checklist --------------------------------------------------
  const checks = [
    { ok: donations.length > 0, text: 'At least one donation is recorded' },
    { ok: unreceived === 0, text: `All cash is in your hands${unreceived > 0 ? ` (${peso(unreceived)} is still with department treasurers)` : ''}` },
    { ok: (request.verifiedDocuments ?? 0) > 0, text: 'At least one supporting document is verified (Documents page)' },
    { ok: !request.approvedByYou, text: `Released by a different admin than the approver${request.approvedBy ? ` (${request.approvedBy})` : ''}` },
  ];
  const canRelease = checks.every((c) => c.ok) && releasedTo.trim().length > 0 && !busy;

  const collected = Number(request.amountCollected ?? 0);
  const goal = Number(request.targetAmount ?? 0);
  const pct = goal > 0 ? Math.min(100, Math.round((collected / goal) * 100)) : 0;
  const overdue = isOpen && request.driveDeadline && request.driveDeadline < today();

  // ======================= Approve & open the drive =======================
  if (canApprove) {
    return (
      <div className="drive-section">
        <div className="drive-head"><h4>Approve &amp; open donation drive</h4></div>
        <p className="drive-hint">
          Approving posts a pinned announcement in the app asking the school to donate. Donations are then
          collected in person and recorded here.
        </p>
        <div className="form-row-2">
          <label className="field">
            <span>Target amount (₱)</span>
            <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="field">
            <span>Drive ends on</span>
            <input type="date" min={today()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>
        <div className="drive-actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !(Number(target) > 0) || !deadline}
            onClick={approve}
          >
            <Check size={15} /> {busy ? 'Saving…' : 'Approve & open drive'}
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen && !isReleased) return null;

  // ======================= Open drive / released summary ====================
  return (
    <div className="drive-section">
      <div className="drive-head">
        <h4>{isReleased ? 'Donation drive (closed)' : 'Donation drive'}</h4>
        <span className={`drive-pill${isReleased ? ' drive-pill--done' : ''}`}>{isReleased ? 'Released' : 'Open'}</span>
      </div>

      <div className="drive-progress">
        <div className="drive-bar"><div className="drive-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="drive-progress-text">
          <b>{peso(collected)}</b> collected of {peso(goal)} <span>({pct}%)</span>
        </div>
      </div>

      <div className="detail-grid" style={{ marginTop: 10 }}>
        <div><span>Approved by</span><b>{request.approvedBy || '—'}</b></div>
        <div>
          <span>Drive ends</span>
          <b>{request.driveDeadline || '—'}{overdue ? ' (deadline passed)' : ''}</b>
        </div>
        {isReleased && (
          <>
            <div><span>Handed over to</span><b>{request.releasedTo || '—'}</b></div>
            <div><span>Released by</span><b>{request.releasedBy || '—'}</b></div>
            <div className="detail-full"><span>Released on</span><b>{request.releasedAt || '—'}</b></div>
          </>
        )}
      </div>

      <div className="drive-list-head">Donations ({donations.length})</div>
      {donations.length === 0 ? (
        <p className="drive-hint">No donations recorded yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table data-table--compact">
            <thead>
              <tr><th>Donor</th><th>Amount</th><th>Collected by</th><th>Status</th><th>Date</th><th /></tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td>{d.donor}{d.notes ? <div className="drive-note">{d.notes}</div> : null}</td>
                  <td>{peso(d.amount)}</td>
                  <td>{d.department}</td>
                  <td>{d.status === 'Received' ? 'Received' : d.status === 'Remitted' ? 'Awaiting confirmation' : 'With department'}</td>
                  <td>{d.receivedOn}</td>
                  <td>
                    {isOpen && d.department === 'TMC Treasurer' && (
                      <button type="button" className="icon-btn icon-btn--danger" disabled={busy}
                        onClick={() => removeDonation(d)} aria-label="Remove donation">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {remittances.length > 0 && (
        <>
          <div className="drive-list-head">Cash handed over by departments ({remittances.length})</div>
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead>
                <tr><th>Ref</th><th>Department</th><th>Amount</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {remittances.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}<div className="drive-note">{r.submittedBy} &middot; {r.submittedAt}</div></td>
                    <td>{r.department}</td>
                    <td>{peso(r.amount)}</td>
                    <td>
                      {r.status}
                      {r.status !== 'Pending' && r.receivedBy ? <div className="drive-note">{r.receivedBy}{r.note ? ` — ${r.note}` : ''}</div> : null}
                    </td>
                    <td>
                      {isOpen && r.status === 'Pending' && (
                        <div className="drive-row-actions">
                          <button type="button" className="icon-btn icon-btn--success" disabled={busy}
                            onClick={() => receiveRemittance(r)} aria-label="Receive cash"><Inbox size={15} /></button>
                          <button type="button" className="icon-btn icon-btn--danger" disabled={busy}
                            onClick={() => rejectRemittance(r)} aria-label="Reject"><X size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isOpen && (
        <>
          <div className="drive-list-head">Record a donation (cash taken at your office)</div>
          <div className="form-row-2">
            <label className="field">
              <span>Donor name (blank = Anonymous)</span>
              <input type="text" maxLength={100} value={donor} onChange={(e) => setDonor(e.target.value)} />
            </label>
            <label className="field">
              <span>Amount (₱)</span>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>
          <div className="form-row-2" style={{ marginTop: 10 }}>
            <label className="field">
              <span>Date received</span>
              <input type="date" max={today()} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
            </label>
            <label className="field">
              <span>Note (optional)</span>
              <input type="text" maxLength={150} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <div className="drive-actions">
            <button type="button" className="btn btn--outline" disabled={busy || !(Number(amount) > 0)} onClick={addDonation}>
              <Plus size={15} /> Add donation
            </button>
          </div>

          <div className="drive-list-head">Close the drive &amp; release</div>
          <ul className="drive-checks">
            {checks.map((c) => (
              <li key={c.text} className={c.ok ? 'ok' : 'no'}>
                {c.ok ? <Check size={14} /> : <X size={14} />} {c.text}
              </li>
            ))}
          </ul>
          <label className="field">
            <span>Cash handed over to (name of the person who receives it)</span>
            <input type="text" maxLength={100} value={releasedTo} onChange={(e) => setReleasedTo(e.target.value)} />
          </label>
          <div className="drive-actions">
            <button type="button" className="btn btn--primary" disabled={!canRelease} onClick={release}>
              <Banknote size={15} /> Close drive &amp; release {peso(collected)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
