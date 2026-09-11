import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';

export default function CommunicationsMessages() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const showToast = useToast();

  useEffect(() => {
    api.get('/messages')
      .then((data) => {
        setThreads(data);
        setActiveId(data[0]?.id ?? null);
      })
      .catch(() => showToast('Failed to load messages.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const active = threads.find((t) => t.id === activeId);

  const openThread = async (id) => {
    setActiveId(id);
    const thread = threads.find((t) => t.id === id);
    if (thread && !thread.unread) return; // already read, skip the API call

    try {
      const updated = await api.post(`/messages/${id}/read`);
      setThreads((ts) => ts.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeId) return;
    try {
      const updated = await api.post(`/messages/${activeId}/reply`, { body: draft });
      setThreads((ts) => ts.map((t) => (t.id === activeId ? updated : t)));
      setDraft('');
      showToast('Message sent.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader title="Messages" subtitle="Direct conversations with students regarding their reports and requests." />

      <div className="messages-layout">
        <div className="message-list-panel">
          {threads.length === 0 ? (
            <p style={{ color: '#6B7280', padding: 12 }}>No messages yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                className={`message-list-item${t.id === activeId ? ' message-list-item--active' : ''}`}
                onClick={() => openThread(t.id)}
              >
                <div className="avatar avatar--sm" style={{ backgroundColor: '#7C3AED' }}>
                  {t.from.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="message-list-text">
                  <div className="message-list-top">
                    <span className="message-list-name">{t.from}</span>
                    <span className="message-list-date">{t.date}</span>
                  </div>
                  <p className="message-list-preview">{t.preview}</p>
                </div>
                {t.unread && <span className="unread-dot" />}
              </button>
            ))
          )}
        </div>

        <div className="message-thread-panel">
          {active ? (
            <>
              <div className="message-thread-header">
                <div className="avatar avatar--sm" style={{ backgroundColor: '#7C3AED' }}>
                  {active.from.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="message-thread-name">{active.from}</p>
                  <p className="message-thread-sub">{active.subject}</p>
                </div>
              </div>
              <div className="message-thread-body">
                {active.thread.map((m, idx) => (
                  <div key={idx} className={`bubble${m.from === 'Admin User' ? ' bubble--mine' : ''}`}>
                    <p>{m.body}</p>
                    <span>{m.time}</span>
                  </div>
                ))}
              </div>
              <form className="message-composer" onSubmit={send}>
                <input
                  placeholder="Type a reply..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn btn--primary btn--icon" aria-label="Send">
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state"><p>Select a conversation</p></div>
          )}
        </div>
      </div>
    </div>
  );
}