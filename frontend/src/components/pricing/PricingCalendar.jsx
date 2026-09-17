import React from 'react';

export default function PricingCalendar({ calendarData, selectedDate, onDateSelect, loading }) {
  if (loading || !calendarData) {
    return (
      <div className="pricing-calendar skeleton-container">
        <div className="skeleton title-skeleton"></div>
        <div className="skeleton grid-skeleton" style={{ height: '200px' }}></div>
      </div>
    );
  }

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const firstDay = new Date(calendarData[0].date).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  
  const emptyCells = Array.from({ length: adjustedFirstDay }, (_, i) => i);

  return (
    <div className="pricing-calendar animate-fade-in-up stagger-5">
      <h3>30-day pricing outlook</h3>
      
      <div className="calendar-grid">
        <div className="calendar-header-row">
          {daysOfWeek.map(day => (
            <div key={day} className="calendar-day-name">{day}</div>
          ))}
        </div>
        
        <div className="calendar-days">
          {emptyCells.map(i => (
            <div key={`empty-${i}`} className="calendar-cell empty"></div>
          ))}
          
          {calendarData.map(dayData => {
            const dateObj = new Date(dayData.date);
            const dateNum = dateObj.getDate();
            const isSelected = dayData.date === selectedDate;
            
            return (
              <div 
                key={dayData.date}
                className={`calendar-cell demand-${dayData.demandLevel} ${isSelected ? 'selected' : ''}`}
                onClick={() => onDateSelect(dayData.date)}
              >
                <div className="cell-date">{dateNum}</div>
                <div className="cell-price">£{dayData.recommendedPrice}</div>
                {dayData.event && <div className="cell-event-dot"></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
