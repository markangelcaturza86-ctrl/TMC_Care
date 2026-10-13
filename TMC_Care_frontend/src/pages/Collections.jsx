import { useEffect, useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { api } from '../api/client';
import { peso } from '../utils/money';
import { useToast } from '../components/Toast';
import '../components/drive.css';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * For department treasurers (CCS, CCJE, COAD, CAS, COED):
 *   1. record the donations collected from your own department,
 *   2. hand the cash over to the TMC Treasurer ("Hand over"),
 *   3. the TMC Treasurer confirms it - only then it counts toward the drive.
 */
export default function Collections() {
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(null); // the drive a donation is being recorded for
  const [form, setForm] = useState({ donor_name: '', amount: '', received_on: today(), notes: '' });

  const reload = () => api.get('/collections')
    .then(setData)
    .catch((err) => showToast(err.message, 'error'));

  useEffect(() => {
    api.get('/collections')
      .then(setData)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const openAdd = (drive) => {
    setForm({ donor_name: '', amount: '', received_on: today(), notes: '' });
    setAdding(drive);
  };

  const saveDonation = async () => {
    setBusy(true);
    try {
      await api.post('/collections/donations', {
        financial_request: adding.id,
        donor_name: form.donor_name,
        amount: Number(form.amount),
        received_on: form.received_on,
        notes: form.notes || undefined,
      });
      showToast('Donation recorded.', 'success');
      setAdding(null);
      await reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeDonation = async (d) => {
    if (!window.confirm(`Remove the ${peso(d.amount)} donation from ${d.donor}?`)) return;
    try {
      await api.delete(`/collections/donations/${d.id}`);
      showToast('Donation removed.', 'info');
      await reload();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handOver = async (drive) => {
    if (!window.confirm(`Hand over ${peso(drive.held)} to the TMC Treasurer for ${drive.id}? Give the cash to the TMC Treasurer in person.`)) return;
    setBusy(true);
    try {
      const r = await api.post('/collections/remittances', { financial_request: drive.id });
      showToast(`${r.code} sent. Waiting for the TMC Treasurer to confirm.`, 'success');
      await reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="page-stack">Loading…</div>;
  if (!data) return <div className="page-stack">Could not load your collections.</div>;

  const heldTotal = data.drives.reduce((sum, d) => sum + d.held, 0);

  return (
    <div className="page-stack">
      <PageHeader
        title={`Collections — ${data.department ?? ''}`}
        subtitle="Collect donations from your department, then hand the cash to the TMC Treasurer."
      />

      <div className="panel" style={{ padding: 16 }}>
        <b>Cash you are holding right now: {peso(heldTotal)}</b>
        <p className="drive-hint" style={{ margin: '4px 0 0' }}>
          Hand it over to the TMC Treasurer as soon as you can. A donation only counts toward a drive after the TMC Treasurer confirms it.
        </p>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <h4 className="drive-list-head" style={{ marginTop: 0 }}>Open donation drives</h4>
        {data.drives.length === 0 ? (
          <p className="drive-hint">There are no open donation drives right now.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drive</th><th>For</th><th>Target</th><th>Confirmed total</th>
                  <th>With you</th><th>Awaiting confirmation</th><th>Ends</th><th />
                </tr>
              </thead>
              <tbody>
                {data.drives.map((d) => (
                  <tr key={d.id}>
                    <td><span className="mono">{d.id}</span><div className="drive-note">{d.type}</div></td>
                    <td>{d.beneficiary}</td>
                    <td>{peso(d.target)}</td>
                    <td>{peso(d.collected)}</td>
                    <td>{peso(d.held)}</td>
                    <td>{peso(d.pending)}</td>
                    <td>{d.deadline || '—'}</td>
                    <td>
                      <div className="drive-row-actions">
                        <button type="button" className="btn btn--outline" onClick={() => openAdd(d)}>
                          <Plus size={14} /> Add
                        </button>
                        <button type="button" className="btn btn--primary" disabled={busy || d.held <= 0} onClick={() => handOver(d)}>
                          <Send size={14} /> Hand over
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <h4 className="drive-list-head" style={{ marginTop: 0 }}>Donations you collected</h4>
        {data.donations.length === 0 ? (
          <p className="drive-hint">Nothing recorded yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead><tr><th>Drive</th><th>Donor</th><th>Amount</th><th>Date</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.donations.map((d) => (
                  <tr key={d.id}>
                    <td><span className="mono">{d.requestCode}</span></td>
                    <td>{d.donor}{d.notes ? <div className="drive-note">{d.notes}</div> : null}</td>
                    <td>{peso(d.amount)}</td>
                    <td>{d.receivedOn}</td>
                    <td>{d.status === 'Received' ? 'Confirmed' : d.status === 'Remitted' ? 'Awaiting confirmation' : 'With you'}</td>
                    <td>
                      {d.status === 'Collected' && (
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeDonation(d)} aria-label="Remove donation">
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
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <h4 className="drive-list-head" style={{ marginTop: 0 }}>Your hand-overs to the TMC Treasurer</h4>
        {data.remittances.length === 0 ? (
          <p className="drive-hint">You have not handed over any cash yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table data-table--compact">
              <thead><tr><th>Ref</th><th>Drive</th><th>Amount</th><th>Sent</th><th>Status</th></tr></thead>
              <tbody>
                {data.remittances.map((r) => (
                  <tr key={r.id}>
                    <td><span className="mono">{r.code}</span></td>
                    <td><span className="mono">{r.requestCode}</span></td>
                    <td>{peso(r.amount)}</td>
                    <td>{r.submittedAt}</td>
                    <td>
                      {r.status}
                      {r.status !== 'Pending' && r.receivedBy ? <div className="drive-note">{r.receivedBy}{r.note ? ` — ${r.note}` : ''}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!adding}
        onClose={() => setAdding(null)}
        title={adding ? `Record a donation — ${adding.id}` : ''}
        width={480}
        footer={(
          <>
            <button className="btn btn--outline" onClick={() => setAdding(null)}>Cancel</button>
            <button className="btn btn--primary" disabled={busy || !(Number(form.amount) > 0)} onClick={saveDonation}>
              {busy ? 'Saving…' : 'Save donation'}
            </button>
          </>
        )}
      >
        <div className="form-row-2">
          <label className="field">
            <span>Donor name (blank = Anonymous)</span>
            <input type="text" maxLength={100} value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} />
          </label>
          <label className="field">
            <span>Amount (₱)</span>
            <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
        </div>
        <div className="form-row-2" style={{ marginTop: 10 }}>
          <label className="field">
            <span>Date received</span>
            <input type="date" max={today()} value={form.received_on} onChange={(e) => setForm({ ...form, received_on: e.target.value })} />
          </label>
          <label className="field">
            <span>Note (optional)</span>
            <input type="text" maxLength={150} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
