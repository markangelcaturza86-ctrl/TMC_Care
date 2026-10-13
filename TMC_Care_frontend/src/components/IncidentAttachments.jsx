import { useEffect, useState } from 'react';
import { X, Download, FileText, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProtectedBlobUrl, openProtectedFile } from '../api/client';
import './attachments.css';

/**
 * Shows the photos / files the student or staff member attached to an incident
 * report in the mobile app. Photos are fetched with the admin's login token
 * (they are not public) and open full-size in a viewer when clicked.
 *
 * Use with a `key` so it starts fresh for every report:
 *   <IncidentAttachments key={report.id} files={report.attachments} />
 */
export default function IncidentAttachments({ files = [] }) {
  const images = files.filter((f) => f.isImage);
  const others = files.filter((f) => !f.isImage);

  const [urls, setUrls] = useState({});      // document id -> blob: url
  const [failed, setFailed] = useState({});  // document id -> true
  const [activeId, setActiveId] = useState(null);

  const imageKey = images.map((f) => f.id).join(',');

  useEffect(() => {
    let cancelled = false;
    const created = [];

    images.forEach(async (f) => {
      try {
        const url = await fetchProtectedBlobUrl(`/documents/${f.id}/download`);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created.push(url);
        setUrls((prev) => ({ ...prev, [f.id]: url }));
      } catch {
        if (!cancelled) setFailed((prev) => ({ ...prev, [f.id]: true }));
      }
    });

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey]);

  const activeIndex = images.findIndex((f) => f.id === activeId);
  const active = activeIndex >= 0 ? images[activeIndex] : null;

  const step = (delta) => {
    if (images.length < 2) return;
    const next = (activeIndex + delta + images.length) % images.length;
    setActiveId(images[next].id);
  };

  // Keyboard: Esc closes only the viewer (not the report window behind it),
  // arrow keys move between photos.
  useEffect(() => {
    if (activeId == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setActiveId(null);
      } else if (e.key === 'ArrowRight') {
        step(1);
      } else if (e.key === 'ArrowLeft') {
        step(-1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, imageKey]);

  return (
    <div className="attach-section">
      <div className="attach-head">
        <h4>Photos &amp; attachments</h4>
        <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
      </div>

      {files.length === 0 ? (
        <p className="attach-empty">The reporter did not attach any photos or files.</p>
      ) : (
        <div className="attach-grid">
          {images.map((f) => {
            if (failed[f.id]) {
              return (
                <button
                  key={f.id}
                  type="button"
                  className="attach-tile attach-tile--file"
                  title="This image could not be previewed. Click to download it."
                  onClick={() => openProtectedFile(`/documents/${f.id}/download`, f.name).catch(() => {})}
                >
                  <ImageOff size={22} />
                  <b>{f.name}</b>
                  <span>Preview unavailable</span>
                </button>
              );
            }
            if (!urls[f.id]) {
              return <div key={f.id} className="attach-tile attach-tile--loading" aria-label="Loading photo" />;
            }
            return (
              <button
                key={f.id}
                type="button"
                className="attach-tile"
                onClick={() => setActiveId(f.id)}
                aria-label={`View ${f.name}`}
              >
                <img src={urls[f.id]} alt={f.name} />
                <span className="attach-tile-name">{f.name}</span>
              </button>
            );
          })}

          {others.map((f) => (
            <button
              key={f.id}
              type="button"
              className="attach-tile attach-tile--file"
              onClick={() => openProtectedFile(`/documents/${f.id}/download`, f.name).catch(() => {})}
            >
              <FileText size={24} />
              <b>{f.name}</b>
              <span>Open file</span>
            </button>
          ))}
        </div>
      )}

      {active && urls[active.id] && (
        <div className="attach-lightbox" onMouseDown={() => setActiveId(null)}>
          <button
            type="button"
            className="attach-lightbox-btn attach-lightbox-close"
            onClick={() => setActiveId(null)}
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="attach-lightbox-btn attach-lightbox-nav attach-lightbox-nav--prev"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="attach-lightbox-btn attach-lightbox-nav attach-lightbox-nav--next"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <img src={urls[active.id]} alt={active.name} onMouseDown={(e) => e.stopPropagation()} />

          <div className="attach-lightbox-bar" onMouseDown={(e) => e.stopPropagation()}>
            <b>{active.name}</b>
            <span>{activeIndex + 1} / {images.length}</span>
            <a className="attach-lightbox-btn" href={urls[active.id]} download={active.name}>
              <Download size={15} /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
