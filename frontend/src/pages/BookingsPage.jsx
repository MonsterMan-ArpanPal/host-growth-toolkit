import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, CircleCheck, Globe, Instagram, MessageCircle, MessageSquare, Search, X } from 'lucide-react';
import WhatsAppModal from '../components/bookings/WhatsAppModal';
import NoPropertiesEmptyState from '../components/dashboard/NoPropertiesEmptyState';
import { getProperties } from '../api/pricing';
import './BookingsPage.css';

// Temporary lead fixtures. Replace this array with GET /api/inquiries when the
// WhatsApp/direct-message ingestion service is connected.
const INITIAL_INQUIRIES = [
  { id: 'inq_001', guestName: 'Priya Sharma', propertyName: 'Beach House', channel: 'whatsapp', inquiryType: 'Pet Policy', status: 'pending', unread: true, receivedAt: '12 min ago', message: 'Hi! We have a small, well-trained dog. Is the Beach House pet friendly for a three-night stay?' },
  { id: 'inq_002', guestName: 'The Miller Family', propertyName: 'Coastal Retreat', channel: 'direct', inquiryType: 'Pricing & Rates', status: 'responded', unread: false, receivedAt: '1 hr ago', message: 'We are a family of five looking at a seven-night stay in October. Do you offer a weekly rate?' },
  { id: 'inq_003', guestName: 'Daniel Okafor', propertyName: 'City Loft', channel: 'instagram', inquiryType: 'Date Availability', status: 'converted', unread: false, receivedAt: 'Yesterday', message: 'Is the loft available from 14–17 October? We would love to book if those dates are open.' },
  { id: 'inq_004', guestName: 'Amelia Brooks', propertyName: 'Beach House', channel: 'whatsapp', inquiryType: 'Amenities', status: 'pending', unread: true, receivedAt: 'Yesterday', message: 'Could you confirm whether there is fast Wi-Fi and a dedicated place to work?' },
];

const CHANNELS = ['all', 'whatsapp', 'direct', 'instagram'];
const STATUSES = ['all', 'pending', 'responded', 'converted'];

export default function BookingsPage() {
  const [inquiries, setInquiries] = useState(INITIAL_INQUIRIES);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [activeInquiry, setActiveInquiry] = useState(null);
  const [whatsAppInquiry, setWhatsAppInquiry] = useState(null);

  useEffect(() => {
    getProperties().then(setProperties).catch(() => setProperties([])).finally(() => setPropertiesLoading(false));
  }, []);

  const filteredInquiries = useMemo(() => inquiries.filter(inquiry => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [inquiry.guestName, inquiry.propertyName, inquiry.inquiryType, inquiry.message].some(value => value.toLowerCase().includes(term));
    return matchesSearch && (channel === 'all' || inquiry.channel === channel) && (status === 'all' || inquiry.status === status);
  }), [inquiries, search, channel, status]);

  const totals = {
    total: inquiries.length,
    pending: inquiries.filter(inquiry => inquiry.status === 'pending').length,
    converted: inquiries.filter(inquiry => inquiry.status === 'converted').length,
    unreadWhatsApp: inquiries.filter(inquiry => inquiry.channel === 'whatsapp' && inquiry.unread).length,
  };

  const markResolved = (id) => setInquiries(current => current.map(inquiry => inquiry.id === id ? { ...inquiry, status: 'responded', unread: false } : inquiry));
  const hasNoProperties = !propertiesLoading && properties.length === 0;

  return <div className="bookings-page animate-fade-in-up">
    {hasNoProperties ? <NoPropertiesEmptyState /> : <>
      <header className="bookings-header">
        <h1 className="page-title">Guest Inquiry &amp; Message Queue</h1>
        <p className="page-subtitle">Track guest questions and booking leads from WhatsApp, direct enquiries, and social channels.</p>
      </header>

      <section className="inquiry-summary" aria-label="Inquiry queue summary">
        <SummaryPill label="Total inquiries" value={totals.total} active={status === 'all'} onClick={() => setStatus('all')} />
        <SummaryPill label="Pending replies" value={totals.pending} tone="amber" active={status === 'pending'} onClick={() => setStatus('pending')} />
        <SummaryPill label="Converted leads" value={totals.converted} tone="green" active={status === 'converted'} onClick={() => setStatus('converted')} />
        <SummaryPill label="Unread WhatsApp" value={totals.unreadWhatsApp} tone="whatsapp" active={channel === 'whatsapp'} onClick={() => setChannel(channel === 'whatsapp' ? 'all' : 'whatsapp')} />
      </section>

      <section className="inquiry-controls glass-card">
        <label className="inquiry-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search guest, property, or question" /></label>
        <FilterSelect value={channel} onChange={setChannel} options={CHANNELS} label="Channel" />
        <FilterSelect value={status} onChange={setStatus} options={STATUSES} label="Status" />
      </section>

      <div className="bookings-container">
        <table className="bookings-table inquiry-table">
          <thead><tr><th>Guest</th><th>Property</th><th>Channel</th><th>Inquiry Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filteredInquiries.map(inquiry => <tr key={inquiry.id} className={inquiry.unread ? 'inquiry-unread' : ''}>
            <td><div className="guest-col"><div className="avatar inquiry-avatar">{inquiry.guestName.charAt(0)}</div><div><span>{inquiry.guestName}</span><small>{inquiry.receivedAt}{inquiry.unread && <b className="unread-dot" aria-label="Unread" />}</small></div></div></td>
            <td>{inquiry.propertyName}</td>
            <td><ChannelBadge channel={inquiry.channel} /></td>
            <td><span className="inquiry-type-tag">{inquiry.inquiryType}</span></td>
            <td><StatusBadge status={inquiry.status} /></td>
            <td><div className="action-buttons">
              {inquiry.channel === 'whatsapp' && <button className="btn-chat" onClick={() => setWhatsAppInquiry(inquiry)}><MessageSquare size={14} /> Reply</button>}
              <button className="btn-detail" onClick={() => setActiveInquiry(inquiry)}>View details</button>
              {inquiry.status === 'pending' && <button className="btn-accept" onClick={() => markResolved(inquiry.id)}><Check size={14} /> Resolve</button>}
            </div></td>
          </tr>)}</tbody>
        </table>
        {filteredInquiries.length === 0 && <div className="inquiry-empty">No inquiries match the current filters.</div>}
      </div>

      {activeInquiry && <InquiryDetails inquiry={activeInquiry} onClose={() => setActiveInquiry(null)} onResolve={() => { markResolved(activeInquiry.id); setActiveInquiry(null); }} />}
      {whatsAppInquiry && <WhatsAppModal booking={{ ...whatsAppInquiry, guestCount: 0, nights: 0, totalPrice: 0 }} onClose={() => setWhatsAppInquiry(null)} />}
    </>}
  </div>;
}

function SummaryPill({ label, value, tone = 'default', active, onClick }) { return <button className={`inquiry-summary-pill ${tone} ${active ? 'active' : ''}`} onClick={onClick}><strong>{value}</strong><span>{label}</span></button>; }
function FilterSelect({ label, options, value, onChange }) { return <label className="inquiry-filter"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{option === 'all' ? `All ${label}s` : option.charAt(0).toUpperCase() + option.slice(1)}</option>)}</select><ChevronDown size={14} /></label>; }
function ChannelBadge({ channel }) { const config = { whatsapp: [MessageCircle, 'WhatsApp'], direct: [Globe, 'Direct Web'], instagram: [Instagram, 'Instagram'] }; const [Icon, label] = config[channel]; return <span className={`source-badge source-${channel}`}><Icon size={12} /> {label}</span>; }
function StatusBadge({ status }) { const labels = { pending: 'Pending reply', responded: 'Responded', converted: 'Converted to blocked dates' }; return <span className={`status-badge inquiry-status-${status}`}>{labels[status]}</span>; }
function InquiryDetails({ inquiry, onClose, onResolve }) { return <div className="modal-overlay" onClick={onClose}><div className="modal-content inquiry-details" onClick={event => event.stopPropagation()}><div className="modal-header"><div className="modal-header-info"><CircleCheck size={20} className="wa-icon" /><strong>Guest inquiry</strong></div><button className="modal-close" onClick={onClose}><X size={18} /></button></div><div className="inquiry-detail-body"><p className="inquiry-detail-meta">{inquiry.guestName} · {inquiry.propertyName} · {inquiry.receivedAt}</p><span className="inquiry-type-tag">{inquiry.inquiryType}</span><p className="inquiry-detail-message">“{inquiry.message}”</p>{inquiry.status === 'pending' && <button className="btn-accept" onClick={onResolve}><Check size={15} /> Mark resolved</button>}</div></div></div>; }
