import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../api/client';
import './conversation.css';

/**
 * Chat between the admin and the person who submitted an incident report, so
 * the admin can ask follow-up questions. The reporter sees each question as a
 * notification in the mobile app and answers from the report's details screen.
 *
 * Use with a `key` so it starts fresh for every report:
 *   <IncidentConversation key={report.id} reportId={report.id} canMessage={report.canMessage} />
 */
export default function IncidentConversation({ reportId, canMessage = true }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchThread = () => api.get(`/incident-reports/${reportId}/messages`)
      .then((data) => {
        if (cancelled) return;
        setMessages(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load the messages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchThread();
    // Pick up the reporter's answers while this window is open.
    const timer = setInterval(fetchThread, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reportId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const created = await api.post(`/incident-reports/${reportId}/messages`, { body });
      setMessages((m) => [...m, created]);
      setText('');
      setError('');
    } catch (err) {
      setError(err.message || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="convo-section">
      <div className="convo-head">
        <h4>Messages with the reporter</h4>
        <span>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
      </div>

      <div className="convo-list" ref={listRef}>
        {loading ? (
          <p className="convo-empty">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="convo-empty">
            {canMessage
              ? 'No messages yet. Ask the reporter a question below.'
              : 'This report was submitted anonymously, so you cannot message the reporter.'}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`convo-msg ${m.sender === 'admin' ? 'convo-msg--admin' : 'convo-msg--reporter'}`}>
              <div className="convo-bubble">{m.body}</div>
              <span className="convo-meta">{m.sender === 'admin' ? 'You' : m.senderName} &middot; {m.time}</span>
            </div>
          ))
        )}
      </div>

      {error && <p className="convo-error">{error}</p>}

      {canMessage && (
        <div className="convo-compose">
          <textarea
            rows={2}
            maxLength={1000}
            value={text}
            placeholder="Write a question or message to the reporter…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="button" className="btn btn--primary" disabled={sending || !text.trim()} onClick={send}>
            <Send size={15} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
