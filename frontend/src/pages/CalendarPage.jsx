import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Copy, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Home,
  ShieldAlert,
  Layers,
  Info
} from 'lucide-react';
import { getProperties } from '../api/pricing';
import { generatePricingCalendar } from '../data/mockData';
import { bookings as initialBookings } from '../data/mockData';
import './CalendarPage.css';

export default function CalendarPage() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); // Sept 2026 for demo
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingsList, setBookingsList] = useState(initialBookings);

  // iCal Sync Modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [activeFeeds, setActiveFeeds] = useState([
    { id: 1, name: 'Airbnb iCal Feed', channel: 'airbnb', url: 'https://www.airbnb.com/calendar/ical/9841203.ics', status: 'Active' },
    { id: 2, name: 'Google / iOS Calendar Feed', channel: 'google', url: 'https://calendar.google.com/ical/wayzyy_prop001.ics', status: 'Active' }
  ]);

  // Conflict state
  const [activeConflict, setActiveConflict] = useState(null);

  // Day Inspector Drawer state
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Initialize properties
  useEffect(() => {
    getProperties().then(props => {
      setProperties(props);
      if (props.length > 0) {
        setSelectedPropertyId(props[0].id);
      }
    });
  }, []);

  // Build calendar data whenever selectedPropertyId or currentMonth changes
  useEffect(() => {
    if (!selectedPropertyId) return;
    setLoading(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const pricingData = generatePricingCalendar(selectedPropertyId, `${year}-${String(month + 1).padStart(2, '0')}-01`);
      
      // Get bookings specifically for this property
      const propertyBookings = bookingsList.filter(b => b.propertyId === selectedPropertyId);

      // Check for conflicts in property bookings
      let foundConflict = null;
      for (let i = 0; i < propertyBookings.length; i++) {
        for (let j = i + 1; j < propertyBookings.length; j++) {
          const b1 = propertyBookings[i];
          const b2 = propertyBookings[j];
          if (b1.checkIn < b2.checkOut && b2.checkIn < b1.checkOut) {
            foundConflict = {
              b1,
              b2,
              start: b1.checkIn > b2.checkIn ? b1.checkIn : b2.checkIn,
              end: b1.checkOut < b2.checkOut ? b1.checkOut : b2.checkOut
            };
            break;
          }
        }
      }
      setActiveConflict(foundConflict);
      
      const newDays = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Find pricing info
        const pricing = pricingData.find(d => d.date === dateStr);
        
        // Find bookings on this date
        const matchedBookings = propertyBookings.filter(b => dateStr >= b.checkIn && dateStr < b.checkOut);
        
        // Check turnover / transition dates for this property
        const isCheckOutDate = propertyBookings.some(b => b.checkOut === dateStr);
        const isCheckInDate = propertyBookings.some(b => b.checkIn === dateStr);
        const requiresTurnover = isCheckOutDate || isCheckInDate;

        let status = 'available';
        let dayBookings = [];

        if (matchedBookings.length > 0) {
          if (matchedBookings.length > 1) {
            status = 'conflict';
          } else {
            status = matchedBookings[0].status === 'confirmed' ? 'booked' : 'pending';
          }
          dayBookings = matchedBookings;
        } else if (i === 10 && selectedPropertyId === 'prop_002') {
          // Demo blocked date for second property
          status = 'blocked';
        }

        newDays.push({
          date: dateStr,
          dayNum: i,
          status,
          dayBookings,
          price: pricing ? pricing.recommendedPrice : 185,
          requiresTurnover,
          isCheckOutDate,
          isCheckInDate
        });
      }
      
      setCalendarDays(newDays);
      setLoading(false);
    }, 350);
  }, [selectedPropertyId, currentMonth, bookingsList]);

  // Toggle manual date block/available
  const toggleDateStatus = (day) => {
    if (day.status === 'booked' || day.status === 'pending' || day.status === 'conflict') {
      // Open detail inspector for booked/conflict days
      setSelectedDayDetail(day);
      return;
    }

    const updated = calendarDays.map(d => {
      if (d.date === day.date) {
        return {
          ...d,
          status: d.status === 'available' ? 'blocked' : 'available'
        };
      }
      return d;
    });
    setCalendarDays(updated);
  };

  // Trigger iCal Auto-Sync simulation
  const handleAutoSyncFeed = () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1200);
  };

  // Copy outbound iCal link to clipboard
  const outboundUrl = `https://api.wayzyy.com/v1/ical/export/${selectedPropertyId || 'prop_001'}.ics`;
  const handleCopyOutboundLink = () => {
    navigator.clipboard.writeText(outboundUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Add new external feed
  const handleAddFeed = (e) => {
    e.preventDefault();
    if (!newFeedUrl) return;
    let channel = 'google';
    if (newFeedUrl.includes('airbnb')) channel = 'airbnb';
    if (newFeedUrl.includes('wayzyy')) channel = 'wayzyy';

    setActiveFeeds([
      ...activeFeeds,
      {
        id: Date.now(),
        name: `Custom ${channel.toUpperCase()} Feed`,
        channel,
        url: newFeedUrl,
        status: 'Active'
      }
    ]);
    setNewFeedUrl('');
  };

  // Resolve conflict helper
  const handleResolveConflict = () => {
    if (!activeConflict) return;
    // Keep Elena (Airbnb) and adjust Wayzyy booking
    const resolved = bookingsList.filter(b => b.id !== 'bk_004_conflict');
    setBookingsList(resolved);
    setActiveConflict(null);
  };

  // Render Channel Badge with required color themes
  const renderChannelBadge = (booking) => {
    const channel = booking.channel || 'wayzyy';
    let badgeClass = 'badge-wayzyy';
    let channelLabel = 'Wayzyy Direct';

    if (channel === 'airbnb') {
      badgeClass = 'badge-airbnb';
      channelLabel = 'Airbnb';
    } else if (channel === 'google' || channel === 'apple') {
      badgeClass = 'badge-apple-google';
      channelLabel = 'iOS / Google';
    }

    return (
      <div className={`channel-badge ${badgeClass}`} title={`${channelLabel}: ${booking.guestName}`}>
        <span className="badge-dot"></span>
        <span className="badge-text">{channelLabel} • {booking.guestName.split(' ')[0]}</span>
      </div>
    );
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];
  const firstDayOffset = currentMonth.getDay() === 0 ? 6 : currentMonth.getDay() - 1;
  const emptyCells = Array.from({ length: firstDayOffset }, (_, i) => i);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-page animate-fade-in-up">
      {/* ─── Conflict Alert Banner ────────────────────────────────── */}
      {activeConflict && (
        <div className="conflict-alert-banner">
          <div className="conflict-banner-left">
            <div className="banner-icon-wrapper">
              <ShieldAlert className="banner-icon" size={24} />
            </div>
            <div>
              <div className="conflict-title">⚠️ Double-Booking Conflict Detected</div>
              <div className="conflict-subtitle">
                Overlapping dates on <strong>Sep 21–23, 2026</strong> between 
                <span className="channel-tag airbnb"> Airbnb ({activeConflict.b1.guestName})</span> and 
                <span className="channel-tag wayzyy"> Wayzyy Web ({activeConflict.b2.guestName})</span>.
              </div>
            </div>
          </div>
          <div className="conflict-banner-actions">
            <button className="btn-resolve-conflict" onClick={handleResolveConflict}>
              <Check size={16} /> Auto-Resolve & Keep Airbnb
            </button>
          </div>
        </div>
      )}

      {/* ─── Header Section with Property Switcher ───────────────── */}
      <header className="calendar-header">
        <div className="header-left">
          <h1 className="page-title">Availability & iCal Calendar</h1>
          <p className="page-subtitle">Real-time multi-channel inventory, pricing & turnover prep</p>
        </div>
        
        <div className="calendar-controls">
          {/* Property Selector Dropdown */}
          <div className="property-switcher-wrapper">
            <Home size={16} className="switcher-icon" />
            <select 
              id="property-switcher"
              aria-label="Select property"
              className="property-selector"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  🏡 {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync iCal Modal Launcher Button */}
          <button className="btn-sync-ical" onClick={() => setShowSyncModal(true)}>
            <RefreshCw size={16} className={isSyncing ? 'spin-icon' : ''} />
            <span>Sync iCal</span>
          </button>

          {/* Month Selector */}
          <div className="month-selector">
            <button 
              className="month-btn"
              aria-label="Previous Month"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="current-month-label">
              {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              className="month-btn"
              aria-label="Next Month"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Channel Color Legend & Turnover Bar ────────────────────── */}
      <div className="calendar-legend-bar">
        <div className="legend-items">
          <span className="legend-label">Channel Feeds:</span>
          <span className="legend-tag coral">
            <span className="tag-dot"></span> Airbnb (Coral)
          </span>
          <span className="legend-tag blue">
            <span className="tag-dot"></span> Apple iOS / Google (Blue)
          </span>
          <span className="legend-tag green">
            <span className="tag-dot"></span> Direct Wayzyy (Green)
          </span>
        </div>

        <div className="turnover-legend">
          <Sparkles size={15} className="broom-legend-icon" />
          <span>Turnover & Cleaning Prep Required</span>
        </div>
      </div>

      {/* ─── Main Calendar Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="calendar-container skeleton-container">
          <div className="skeleton" style={{ height: '560px', width: '100%', borderRadius: '16px' }}></div>
        </div>
      ) : (
        <div className="calendar-container">
          <div className="calendar-grid-header">
            {daysOfWeek.map(day => (
              <div key={day} className="day-name">{day}</div>
            ))}
          </div>
          
          <div className="calendar-grid-body">
            {emptyCells.map(i => (
              <div key={`empty-${i}`} className="calendar-cell empty"></div>
            ))}
            
            {calendarDays.map((day) => {
              const isInteractive = day.status === 'available' || day.status === 'blocked';
              
              return (
                <div 
                  key={day.date} 
                  className={`calendar-cell status-${day.status} ${isInteractive ? 'interactive' : ''}`}
                  onClick={() => toggleDateStatus(day)}
                >
                  <div className="cell-top">
                    <span className="cell-date">{day.dayNum}</span>
                    <span className="cell-price">£{day.price}</span>
                  </div>

                  {/* Turnover Broom / Sparkle Indicator on checkout/checkin dates */}
                  {day.requiresTurnover && (
                    <div className="turnover-indicator" title="Turnover & Cleaning prep required">
                      <Sparkles size={13} className="sparkle-icon" />
                      <span className="turnover-text">Prep</span>
                    </div>
                  )}

                  <div className="cell-bottom">
                    {day.status === 'conflict' ? (
                      <div className="status-badge conflict">
                        <AlertTriangle size={12} /> Double Booked
                      </div>
                    ) : day.dayBookings.length > 0 ? (
                      day.dayBookings.map(b => renderChannelBadge(b))
                    ) : day.status === 'blocked' ? (
                      <div className="status-badge blocked">Blocked</div>
                    ) : (
                      <div className="status-badge available">Available</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── iCal Sync & Feed Modal ───────────────────────────────── */}
      {showSyncModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowSyncModal(false)}>
          <div className="modal-glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <RefreshCw size={20} className="modal-title-icon" />
                <h2>iCal Calendar Sync & Feeds</h2>
              </div>
              <button className="btn-close-modal" aria-label="Close modal" onClick={() => setShowSyncModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Section 1: Auto-Detect & Sync Feed Button */}
              <div className="sync-action-box">
                <div className="sync-box-info">
                  <h3>Auto-Detect & Background Sync</h3>
                  <p>Fetch real-time reservations from connected Airbnb, Booking.com, and Google iCal feeds.</p>
                </div>
                <button 
                  className="btn-primary-sync"
                  onClick={handleAutoSyncFeed}
                  disabled={isSyncing}
                >
                  <RefreshCw size={16} className={isSyncing ? 'spin-icon' : ''} />
                  {isSyncing ? 'Syncing Feeds...' : 'Auto-Detect & Sync Feed'}
                </button>
              </div>

              {syncSuccess && (
                <div className="sync-success-alert">
                  <Check size={16} /> All active iCal feeds synced successfully! 3 reservations updated.
                </div>
              )}

              {/* Section 2: Copy Outbound iCal Feed Link */}
              <div className="outbound-link-box">
                <label className="input-label">Wayzyy Outbound iCal Feed URL (For Apple iOS & Google Calendar)</label>
                <div className="copy-link-group">
                  <input 
                    type="text" 
                    readOnly 
                    value={outboundUrl}
                    className="outbound-url-input" 
                  />
                  <button className="btn-copy-link" onClick={handleCopyOutboundLink}>
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <p className="field-hint">Paste this feed URL into your iPhone / Mac Calendar or Google Calendar app.</p>
              </div>

              {/* Section 3: Active Inbound iCal Feeds */}
              <div className="active-feeds-section">
                <h3>Connected Channel Feeds</h3>
                <div className="feeds-list">
                  {activeFeeds.map(feed => (
                    <div key={feed.id} className="feed-item">
                      <div className="feed-info">
                        <span className={`channel-pill ${feed.channel}`}>
                          {feed.channel.toUpperCase()}
                        </span>
                        <div>
                          <div className="feed-name">{feed.name}</div>
                          <div className="feed-url">{feed.url}</div>
                        </div>
                      </div>
                      <span className="feed-status-badge">
                        <span className="live-dot"></span> Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Add New iCal Feed Form */}
              <form onSubmit={handleAddFeed} className="add-feed-form">
                <input 
                  type="url" 
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="add-feed-input"
                  required
                />
                <button type="submit" className="btn-add-feed">
                  <Plus size={16} /> Add Feed
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Day Detail Inspector Drawer ───────────────────────────── */}
      {selectedDayDetail && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedDayDetail(null)}>
          <div className="drawer-glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Date Inspector — {selectedDayDetail.date}</h3>
                <p className="drawer-subtitle">Property: {selectedProperty.name}</p>
              </div>
              <button className="btn-close-modal" aria-label="Close details" onClick={() => setSelectedDayDetail(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-stat-row">
                <div className="drawer-stat-card">
                  <span className="stat-label">Nightly Rate</span>
                  <span className="stat-val">£{selectedDayDetail.price}</span>
                </div>
                <div className="drawer-stat-card">
                  <span className="stat-label">Turnover Status</span>
                  <span className="stat-val">
                    {selectedDayDetail.requiresTurnover ? '✨ Cleaning Required' : 'Standard'}
                  </span>
                </div>
              </div>

              <div className="reservations-section">
                <h4>Reservations on this date</h4>
                {selectedDayDetail.dayBookings.length === 0 ? (
                  <p className="no-res">No active bookings for this date.</p>
                ) : (
                  selectedDayDetail.dayBookings.map(b => (
                    <div key={b.id} className="res-card">
                      <div className="res-top">
                        <span className="res-guest">{b.guestName}</span>
                        {renderChannelBadge(b)}
                      </div>
                      <div className="res-details">
                        <span>Check-In: {b.checkIn}</span>
                        <span>Check-Out: {b.checkOut}</span>
                        <span>Total: £{b.totalPrice} ({b.nights} nights)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
