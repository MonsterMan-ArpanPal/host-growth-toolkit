import React from 'react';

export default function PricingCalendar({ calendarData, selectedDate, onDateSelect, loading }) {
  if (loading || !calendarData || calendarData.length === 0) {
    return (
      <div className="pricing-calendar skeleton-container">
        <div className="skeleton title-skeleton"></div>
        <div className="skeleton grid-skeleton" style={{ height: '200px' }}></div>
      </div>
    );
  }

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Parse first date without timezone issues
  const [year, month, day] = calendarData[0].date.split('-').map(Number);
  const firstDateObj = new Date(year, month - 1, day);
  const jsDay = firstDateObj.getDay(); // 0=Sun, 1=Mon...
  const adjustedFirstDay = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon

  const emptyCells = Array.from({ length: adjustedFirstDay }, (_, i) => i);

  return (
    <div className="pricing-calendar animate-fade-in-up stagger-5">
      <h3>30-day pricing outlook</h3>

      {/* Single unified grid for perfect alignment */}
      <div className="calendar-unified-grid">
        {daysOfWeek.map(d => (
          <div key={d} className="calendar-day-name">{d}</div>
        ))}

        {emptyCells.map(i => (
          <div key={`empty-${i}`} className="calendar-cell empty"></div>
        ))}

        {calendarData.map(dayData => {
          const [, , dd] = dayData.date.split('-');
          const dateNum = parseInt(dd, 10);
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
  );
}
