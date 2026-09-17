import { Calendar } from 'lucide-react'
import './ComingSoon.css'

function BookingsPage() {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-card">
        <div className="coming-soon-icon">
          <Calendar size={32} />
        </div>
        <h1 className="coming-soon-title">Bookings</h1>
        <p className="coming-soon-subtitle">
          Your booking management hub is coming soon.
        </p>
        <p className="coming-soon-desc">
          View, manage, and sync bookings across all your platforms in one place.
        </p>
      </div>
    </div>
  )
}
export default BookingsPage;
