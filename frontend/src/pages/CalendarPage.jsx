import React, { useState, useEffect } from 'react';
import { getProperties } from '../api/pricing';
import { generatePricingCalendar } from '../data/mockData';
import { bookings as mockBookings } from '../data/mockData';
import './CalendarPage.css';

export default function CalendarPage() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); // Sept 2026 for demo
  const [calendarDays, setCalendarDays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize data
  useEffect(() => {
    getProperties().then(props => {
      setProperties(props);
      if (props.length > 0) {
        setSelectedPropertyId(props[0].id);
      }
    });
  }, []);

  // Build calendar data
  useEffect(() => {
    if (!selectedPropertyId) return;
    setLoading(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      
      const pricingData = generatePricingCalendar(selectedPropertyId, `${year}-${String(month + 1).padStart(2, '0')}-01`);
      
      // Get bookings for this property
      const propertyBookings = mockBookings.filter(b => b.propertyId === selectedPropertyId);
      
      const newDays = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Find pricing info
        const pricing = pricingData.find(d => d.date === dateStr);
        
        // Find booking status
        let status = 'available';
        let guestName = null;
        
        propertyBookings.forEach(b => {
          if (dateStr >= b.checkIn && dateStr < b.checkOut) {
            status = b.status === 'confirmed' ? 'booked' : 'pending';
            guestName = b.guestName;
          }
        });

        // Add some random blocked dates for demo if available
        if (status === 'available' && (i === 12 || i === 13)) {
          status = 'blocked';
        }

        newDays.push({
          date: dateStr,
          dayNum: i,
          status,
          guestName,
          price: pricing ? pricing.recommendedPrice : 0
        });
      }
      
      setCalendarDays(newDays);
      setLoading(false);
    }, 400);
  }, [selectedPropertyId, currentMonth]);

  const toggleDateStatus = (index) => {
    const days = [...calendarDays];
    const currentStatus = days[index].status;
    
    // Only allow toggling available/blocked
    if (currentStatus === 'booked' || currentStatus === 'pending') return;
    
    days[index].status = currentStatus === 'available' ? 'blocked' : 'available';
    setCalendarDays(days);
  };

  const getStatusBadge = (day) => {
    switch (day.status) {
      case 'booked': return <div className="status-badge booked">Booked: {day.guestName}</div>;
      case 'pending': return <div className="status-badge pending">Pending: {day.guestName}</div>;
      case 'blocked': return <div className="status-badge blocked">Blocked</div>;
      default: return <div className="status-badge available">Available</div>;
    }
  };

  const firstDayOffset = currentMonth.getDay() === 0 ? 6 : currentMonth.getDay() - 1;
  const emptyCells = Array.from({ length: firstDayOffset }, (_, i) => i);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-page animate-fade-in-up">
      <header className="calendar-header">
        <div>
          <h1 className="page-title">Availability Calendar</h1>
          <p className="page-subtitle">Manage your inventory and reservations</p>
        </div>
        
        <div className="calendar-controls">
          <select 
            className="property-selector"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <div className="month-selector">
            <button 
              className="month-btn"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            >
              &lt;
            </button>
            <span className="current-month-label">
              {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              className="month-btn"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="calendar-container skeleton-container">
          <div className="skeleton" style={{ height: '600px', width: '100%' }}></div>
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
            
            {calendarDays.map((day, index) => {
              const isInteractive = day.status === 'available' || day.status === 'blocked';
              
              return (
                <div 
                  key={day.date} 
                  className={`calendar-cell status-${day.status} ${isInteractive ? 'interactive' : ''}`}
                  onClick={() => toggleDateStatus(index)}
                >
                  <div className="cell-top">
                    <span className="cell-date">{day.dayNum}</span>
                    <span className="cell-price">£{day.price}</span>
                  </div>
                  <div className="cell-bottom">
                    {getStatusBadge(day)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
