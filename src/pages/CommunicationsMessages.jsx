import { useState } from 'react';
import { Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { messages as seed } from '../data/mockData';
import { useToast } from '../components/Toast';

export default function CommunicationsMessages() {
  const [threads, setThreads] = useState(seed);
  const [activeId, setActiveId] = useState(seed[0]?.id);
  const [draft, setDraft] = useState('');
  const showToast = useToast();

  const active = threads.find((t) => t.id === activeId);

  const openThread = (id) => {
    setActiveId(id);
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  };

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setThreads((ts) => ts.map((t) => (
      t.id === activeId
        ? { ...t, thread: [...t.thread, { from: 'Admin User', body: draft, time: 'Just now' }] }
        : t
    )));
    setDraft('');
    showToast('Message sent.', 'success');
  };

  return (
    <div className="page-stack">
      <PageHeader title="Messages" subtitle="Direct conversations with students regarding their reports and requests." />

      <div className="messages-layout">
        <div className="message-list-panel">
          {threads.map((t) => (
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
          ))}
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
