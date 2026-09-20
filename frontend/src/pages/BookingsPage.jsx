import React, { useState, useEffect } from 'react';
import { MessageCircle, Globe, Check, X, MessageSquare } from 'lucide-react';
import WhatsAppModal from '../components/bookings/WhatsAppModal';
import NoPropertiesEmptyState from '../components/dashboard/NoPropertiesEmptyState';
import { getBookings, getProperties } from '../api/pricing';
import './BookingsPage.css';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [activeModalBooking, setActiveModalBooking] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setBookings(await getBookings());
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
    
    // Optional: Poll every 5 seconds for new WhatsApp messages
    const interval = setInterval(fetchBookings, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch(error => {
        console.error('Failed to load properties', error);
        setProperties([]);
      })
      .finally(() => setPropertiesLoading(false));
  }, []);

  const handleAccept = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
  };

  const handleDecline = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'declined' } : b));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getSourceBadge = (source) => {
    if (source === 'whatsapp') {
      return (
        <span className="source-badge source-whatsapp">
          <MessageCircle size={12} /> WhatsApp
        </span>
      );
    }
    return (
      <span className="source-badge source-web">
        <Globe size={12} /> Web
      </span>
    );
  };

  const hasNoProperties = !propertiesLoading && properties.length === 0;

  return (
    <div className="bookings-page animate-fade-in-up">
      {hasNoProperties ? <NoPropertiesEmptyState /> : <>
      <div className="bookings-header">
        <h1 className="page-title">Unified Bookings Queue</h1>
        <p className="page-subtitle">Manage reservations from Web and WhatsApp in one place</p>
      </div>

      {loading ? (
        <div className="bookings-container skeleton-container">
          <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>
        </div>
      ) : (
        <div className="bookings-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Property</th>
                <th>Dates</th>
                <th>Source</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    <div className="guest-col">
                      <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {booking.guestName.charAt(0)}
                      </div>
                      {booking.guestName}
                    </div>
                  </td>
                  <td>{booking.propertyName}</td>
                  <td>
                    {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      {booking.nights} nights • {booking.guestCount} guests
                    </div>
                  </td>
                  <td>{getSourceBadge(booking.source)}</td>
                  <td style={{ fontWeight: 600 }}>£{booking.totalPrice}</td>
                  <td>
                    <span className={`status-badge ${booking.status === 'confirmed' ? 'booked' : booking.status === 'pending' ? 'pending' : 'blocked'}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {booking.status === 'pending' && (
                        <>
                          <button className="btn-accept" onClick={() => handleAccept(booking.id)}>
                            <Check size={14} /> Accept
                          </button>
                          <button className="btn-decline" onClick={() => handleDecline(booking.id)}>
                            <X size={14} /> Decline
                          </button>
                        </>
                      )}
                      {booking.source === 'whatsapp' && (
                        <button className="btn-chat" onClick={() => setActiveModalBooking(booking)}>
                          <MessageSquare size={14} /> Chat
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeModalBooking && (
        <WhatsAppModal 
          booking={activeModalBooking} 
          onClose={() => setActiveModalBooking(null)} 
        />
      )}
      </>}
    </div>
  );
}
