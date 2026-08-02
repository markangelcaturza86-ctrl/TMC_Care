import { useState } from 'react';
import { Pin, Megaphone, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { announcements as seed } from '../data/mockData';
import { useToast } from '../components/Toast';

export default function CommunicationsAnnouncements() {
  const [items, setItems] = useState(seed);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', audience: 'All Students' });
  const showToast = useToast();

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const next = {
      id: `AN-${(items.length + 15).toString().padStart(3, '0')}`,
      title: form.title,
      audience: form.audience,
      postedBy: 'Admin',
      date: 'Just now',
      pinned: false,
    };
    setItems([next, ...items]);
    setForm({ title: '', audience: 'All Students' });
    setComposing(false);
    showToast('Announcement posted.', 'success');
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast updates to students and staff."
        actions={<button className="btn btn--primary" onClick={() => setComposing(true)}><Plus size={16} /> New Announcement</button>}
      />

      <div className="announcement-list">
        {items.map((a) => (
          <div className="announcement-card" key={a.id}>
            <div className="announcement-icon"><Megaphone size={18} /></div>
            <div className="announcement-body">
              <div className="announcement-top">
                {a.pinned && <span className="pin-chip"><Pin size={12} /> Pinned</span>}
                <span className="announcement-audience">{a.audience}</span>
              </div>
              <p className="announcement-title">{a.title}</p>
              <p className="announcement-meta">Posted by {a.postedBy} &middot; {a.date}</p>
            </div>
          </div>
        ))}
      </div>

      <Modal open={composing} onClose={() => setComposing(false)} title="New Announcement">
        <form className="modal-form" onSubmit={submit}>
          <label className="field">
            <span>Message</span>
            <textarea
              rows={4}
              placeholder="Write your announcement..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Audience</span>
            <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
              <option>All Students</option>
              <option>All Staff</option>
              <option>Case Officers</option>
            </select>
          </label>
          <div className="modal-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setComposing(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary">Post Announcement</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
