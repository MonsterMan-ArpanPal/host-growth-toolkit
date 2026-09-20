import { useEffect, useState } from 'react';
import { CalendarDays, Check, Copy, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { getCalendarSync, importCalendarFeed } from '../../api/calendarSync';
import './CalendarSyncSection.css';

export default function CalendarSyncSection({ propertyId }) {
  const [sync, setSync] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setSync(await getCalendarSync(propertyId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [propertyId]);

  const copyExportUrl = async () => {
    try {
      await navigator.clipboard.writeText(sync.export_url);
      setMessage('Export link copied.');
    } catch {
      setError('Could not copy the link. Select and copy it manually.');
    }
  };

  const syncNow = async (event) => {
    event.preventDefault();
    if (!url.trim()) return;
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const result = await importCalendarFeed(propertyId, url.trim());
      setSync(current => ({ ...current, blocks: result.blocks, imports: [...(current?.imports || []).filter(item => item.url !== url.trim()), { url: url.trim() }] }));
      setMessage(`Synced ${result.imported} dates${result.skipped_conflicts ? `; ${result.skipped_conflicts} conflicts were safely skipped` : ''}.`);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="glass-card dl-section calendar-sync-section"><div className="skeleton" style={{ height: '180px' }} /></div>;

  return (
    <section className="glass-card dl-section calendar-sync-section">
      <div className="calendar-sync-heading">
        <div className="calendar-sync-icon"><CalendarDays size={18} /></div>
        <div><h3>Calendar Sync</h3><p>Keep availability aligned across HostIt and your booking channels.</p></div>
      </div>

      <div className="calendar-export-card">
        <label htmlFor="calendar-export-url">Your HostIt export link</label>
        <p>Paste this read-only iCal feed into Google Calendar, Apple Calendar, Airbnb, or another OTA.</p>
        <div className="calendar-export-url">
          <input id="calendar-export-url" value={sync?.export_url || ''} readOnly aria-label="HostIt iCal export URL" />
          <button type="button" onClick={copyExportUrl} title="Copy export link"><Copy size={16} /> Copy</button>
        </div>
      </div>

      <form className="calendar-import-form" onSubmit={syncNow}>
        <label htmlFor="calendar-import-url">Import an external iCal link</label>
        <div className="calendar-import-row">
          <span><LinkIcon size={16} /></span>
          <input id="calendar-import-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…/calendar.ics" required />
          <button className="calendar-sync-button" disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </form>

      {message && <p className="calendar-sync-message success"><Check size={15} /> {message}</p>}
      {error && <p className="calendar-sync-message error">{error}</p>}

      {(sync?.blocks?.length > 0 || sync?.imports?.length > 0) && (
        <div className="calendar-sync-status">
          <h4>Synced availability</h4>
          {sync.blocks?.length > 0 ? <div className="calendar-block-grid">
            {sync.blocks.map(block => <div className="calendar-block" key={block.id}>
              <span>{new Date(`${block.checkIn}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(`${block.checkOut}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              <small>Unavailable · external calendar</small>
            </div>)}
          </div> : <p className="calendar-sync-muted">No dates are currently blocked by your connected calendars.</p>}
        </div>
      )}
    </section>
  );
}
