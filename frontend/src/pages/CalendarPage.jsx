import React, { useState, useEffect } from 'react';
import { 
  Check, 
  AlertTriangle, 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Home,
  ShieldAlert
} from 'lucide-react';
import { getProperties } from '../api/pricing';
import { generatePricingCalendar } from '../data/mockData';
import { bookings as initialBookings } from '../data/mockData';
import './CalendarPage.css';

// Lets the default demo property show the turnover workflow before it has
// connected reservations. Booking endpoints take precedence when present.
const demoTurnoverWindows = {
  demo_001: {
    '2026-09-12': {
      checkoutGuest: 'Maya R.',
      checkinGuest: 'Oliver K.'
    },
    '2026-09-19': {
      checkoutGuest: 'Nina P.',
      checkinGuest: 'Theo B.'
    }
  }
};

export default function CalendarPage() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); // Sept 2026 for demo
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingsList, setBookingsList] = useState(initialBookings);

  // Conflict state
  const [activeConflict, setActiveConflict] = useState(null);

  // Day Inspector Drawer state
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Keeps the cleaning summary close to the date it applies to.
  const [activeTurnoverDate, setActiveTurnoverDate] = useState(null);
  const [activeBookingPopover, setActiveBookingPopover] = useState(null);

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

    const refreshTimer = setTimeout(() => {
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
        const scheduledTurnover = demoTurnoverWindows[selectedPropertyId]?.[dateStr];
        const checkingOutBookings = propertyBookings.filter(b => b.checkOut === dateStr);
        const checkingInBookings = propertyBookings.filter(b => b.checkIn === dateStr);

        if (scheduledTurnover && checkingOutBookings.length === 0 && checkingInBookings.length === 0) {
          checkingOutBookings.push({ id: `${dateStr}-checkout`, guestName: scheduledTurnover.checkoutGuest });
          checkingInBookings.push({ id: `${dateStr}-checkin`, guestName: scheduledTurnover.checkinGuest });
        }
        const isCheckOutDate = checkingOutBookings.length > 0;
        const isCheckInDate = checkingInBookings.length > 0;
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
          isCheckInDate,
          checkingOutBookings,
          checkingInBookings
        });
      }
      
      setCalendarDays(newDays);
      setActiveTurnoverDate(null);
      setLoading(false);
    }, 350);

    return () => clearTimeout(refreshTimer);
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

  // Resolve conflict helper
  const handleResolveConflict = () => {
    if (!activeConflict) return;
    // Keep the first reservation and remove its conflicting duplicate.
    const resolved = bookingsList.filter(b => b.id !== 'bk_004_conflict');
    setBookingsList(resolved);
    setActiveConflict(null);
  };

  const renderBookingBadge = (booking, date) => {
    return (
      <button
        type="button"
        className="booking-badge"
        aria-label={`View booking details for ${booking.guestName}`}
        aria-expanded={activeBookingPopover?.id === booking.id && activeBookingPopover?.date === date}
        onClick={(event) => {
          event.stopPropagation();
          const isOpen = activeBookingPopover?.id === booking.id && activeBookingPopover?.date === date;
          setActiveBookingPopover(isOpen ? null : { ...booking, date });
        }}
      >
        <span className="badge-text">Reserved · {booking.guestName.split(' ')[0]}</span>
      </button>
    );
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];
  const firstDayOffset = currentMonth.getDay() === 0 ? 6 : currentMonth.getDay() - 1;
  const emptyCells = Array.from({ length: firstDayOffset }, (_, i) => i);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthBookings = bookingsList.filter(booking => (
    booking.propertyId === selectedPropertyId
    && booking.checkIn <= calendarDays[calendarDays.length - 1]?.date
    && booking.checkOut > calendarDays[0]?.date
  ));
  const bookedNights = calendarDays.filter(day => day.dayBookings.length > 0).length;
  const totalProjectedRevenue = monthBookings.reduce((total, booking) => total + booking.totalPrice, 0);
  const occupancyRate = calendarDays.length ? Math.round((bookedNights / calendarDays.length) * 100) : 0;
  const confirmedStayCount = monthBookings.length;

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
                <strong>{activeConflict.b1.guestName}</strong> and <strong>{activeConflict.b2.guestName}</strong>.
              </div>
            </div>
          </div>
          <div className="conflict-banner-actions">
            <button className="btn-resolve-conflict" onClick={handleResolveConflict}>
              <Check size={16} /> Resolve conflict
            </button>
          </div>
        </div>
      )}

      {/* ─── Header Section with Property Switcher ───────────────── */}
      <header className="calendar-header">
        <div className="header-left">
          <h1 className="page-title">Availability Calendar</h1>
          <p className="page-subtitle">Availability, pricing and turnover preparation</p>
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
                  {p.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* ─── Main Calendar Grid ──────────────────────────────────── */}
      {loading ? (
        <div className="calendar-container skeleton-container">
          <div className="skeleton" style={{ height: '560px', width: '100%', borderRadius: '16px' }}></div>
        </div>
      ) : (
        <>
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

                  {/* Turnover is only shown on booking arrival/departure dates. */}
                  {day.requiresTurnover && (
                    <button
                      type="button"
                      className="turnover-indicator"
                      aria-label={`View cleaning prep for ${day.date}`}
                      aria-expanded={activeTurnoverDate === day.date}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveTurnoverDate(activeTurnoverDate === day.date ? null : day.date);
                      }}
                    >
                      <Sparkles size={13} className="sparkle-icon" />
                      <span className="turnover-text">
                        {day.isCheckOutDate ? '11 AM Turnover' : 'Cleaning Prep'}
                      </span>
                    </button>
                  )}

                  {activeTurnoverDate === day.date && (
                    <div
                      className="turnover-popover"
                      role="status"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="turnover-popover-title">
                        <Sparkles size={14} /> Cleaning prep
                      </div>
                      {day.checkingOutBookings.map(booking => (
                        <p key={`checkout-${booking.id}`}>
                          {booking.guestName} checks out at <strong>11:00 AM</strong>.
                        </p>
                      ))}
                      {day.checkingInBookings.map(booking => (
                        <p key={`checkin-${booking.id}`}>
                          {booking.guestName} checks in at <strong>2:00 PM</strong>.
                        </p>
                      ))}
                      <span className="turnover-popover-note">Allow time for cleaning and inspection.</span>
                    </div>
                  )}

                  <div className="cell-bottom">
                    {day.status === 'conflict' ? (
                      <div className="status-badge conflict">
                        <AlertTriangle size={12} /> Double Booked
                      </div>
                    ) : day.dayBookings.length > 0 ? (
                      day.dayBookings.map(b => renderBookingBadge(b, day.date))
                    ) : day.status === 'blocked' ? (
                      <div className="status-badge blocked">Blocked</div>
                    ) : (
                      <div className="status-badge available">Available</div>
                    )}
                  </div>

                  {activeBookingPopover?.date === day.date && (
                    <div className="booking-popover" onClick={(event) => event.stopPropagation()}>
                      <div className="booking-popover-topline">
                        <span>Reservation</span>
                        <button
                          type="button"
                          aria-label="Close booking details"
                          onClick={() => setActiveBookingPopover(null)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <strong className="booking-popover-guest">{activeBookingPopover.guestName}</strong>
                      <div className="booking-popover-detail">
                        <span>Payout total</span>
                        <strong>£{activeBookingPopover.totalPrice}</strong>
                      </div>
                      <div className="booking-popover-times">
                        <span>Check-in: {activeBookingPopover.checkIn} · 2:00 PM</span>
                        <span>Check-out: {activeBookingPopover.checkOut} · 11:00 AM</span>
                      </div>
                      <button
                        type="button"
                        className="btn-guest-message"
                        onClick={(event) => event.stopPropagation()}
                      >
                        View Full Guest Message
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>

          <footer className="calendar-summary" aria-label="September calendar summary">
            <div className="calendar-summary-item">
              <span>Projected revenue</span>
              <strong>£{totalProjectedRevenue.toLocaleString('en-GB')}</strong>
            </div>
            <div className="calendar-summary-item">
              <span>Occupancy rate</span>
              <strong>{occupancyRate}% <em>· {bookedNights} booked nights</em></strong>
            </div>
            <div className="calendar-summary-item">
              <span>Confirmed stays</span>
              <strong>{confirmedStayCount}</strong>
            </div>
          </footer>
        </>
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
                        <span className="reservation-label">Reserved</span>
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
