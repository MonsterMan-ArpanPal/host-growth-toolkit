import React from 'react';
import { X, MessageCircle } from 'lucide-react';

export default function WhatsAppModal({ booking, onClose }) {
  if (!booking) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <MessageCircle className="wa-icon" size={24} />
            <div>
              <h3 style={{ margin: 0, color: 'var(--white)', fontSize: 'var(--text-base)' }}>WhatsApp Bot Sync</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}>{booking.guestName} • {booking.propertyName}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="chat-history">
          <div className="chat-bubble guest">
            Hi, I'm interested in booking your place from {new Date(booking.checkIn).toLocaleDateString('en-GB')} to {new Date(booking.checkOut).toLocaleDateString('en-GB')}. Are these dates available?
            <span className="chat-time">10:14 AM</span>
          </div>
          
          <div className="chat-bubble bot">
            Hello {booking.guestName.split(' ')[0]}! Yes, {booking.propertyName} is available for those dates. The total for {booking.nights} nights for {booking.guestCount} guests would be £{booking.totalPrice}. Would you like me to hold these dates for you?
            <span className="chat-time">10:15 AM</span>
          </div>
          
          <div className="chat-bubble guest">
            Yes please, that sounds great.
            <span className="chat-time">10:18 AM</span>
          </div>
          
          <div className="chat-bubble bot">
            Perfect! I've sent a booking request to the host for £{booking.totalPrice}. I will notify you as soon as they confirm!
            <span className="chat-time">10:18 AM</span>
          </div>
        </div>
        
        <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', display: 'flex', gap: 'var(--sp-3)' }}>
           <input 
             type="text" 
             placeholder="Wayzyy AI is managing this conversation..." 
             disabled 
             style={{ flex: 1, padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--white)', fontSize: 'var(--text-sm)' }}
           />
        </div>
      </div>
    </div>
  );
}
