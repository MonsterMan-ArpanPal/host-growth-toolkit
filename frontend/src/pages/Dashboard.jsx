import React, { useState, useEffect } from 'react';
import { ArrowUpRight, TrendingUp, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { getUpcomingBookings, getProperties } from '../api/pricing';
import NoPropertiesEmptyState from '../components/dashboard/NoPropertiesEmptyState';
import './Dashboard.css';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    document.title = 'Dashboard | host It';
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const hostProperties = await getProperties();
        setProperties(hostProperties);
        if (hostProperties.length === 0) {
          setBookings([]);
          setOpportunities([]);
          return;
        }
        const bookingsData = await getUpcomingBookings();
        setBookings(bookingsData.slice(0, 4)); // Show top 4
        setOpportunities([]); // No live pricing-opportunities endpoint exists yet.
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        setProperties([]);
        setBookings([]);
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const renderBookingSkeleton = () => (
    Array(3).fill(0).map((_, i) => (
      <div key={i} className="skeleton-booking">
        <div className="skeleton skeleton-avatar"></div>
        <div className="skeleton-booking-meta">
          <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '30%' }}></div>
        </div>
      </div>
    ))
  );

  const renderOppSkeleton = () => (
    Array(3).fill(0).map((_, i) => (
      <div key={i} className="skeleton skeleton-opp"></div>
    ))
  );

  const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
  const firstName = user.first_name || 'there';
  const bookingRevenue = bookings.reduce((total, booking) => total + Number(booking.totalPrice ?? booking.totalAmount ?? 0), 0);
  const bookedNights = bookings.reduce((total, booking) => total + Number(booking.nights || 0), 0);
  const daysThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const occupancyRate = properties.length ? Math.round((bookedNights / (daysThisMonth * properties.length)) * 100) : 0;
  const averageNightlyRate = bookedNights ? Math.round(bookingRevenue / bookedNights) : 0;

  if (!loading && properties.length === 0) {
    return <div className="dashboard-container"><NoPropertiesEmptyState /></div>;
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Header with Image */}
      <header className="dashboard-header animate-fade-in-up">
        <div className="dashboard-header-bg" style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')`
        }}>
          <div className="dashboard-header-content">
            <h1 className="welcome-title">{getGreeting()}, {firstName}</h1>
            <p className="welcome-subtitle">Here's how your properties are performing today.</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card animate-fade-in-up stagger-1">
          <span className="stat-label">This Month's Revenue</span>
          <span className="stat-value">£{bookingRevenue.toLocaleString('en-GB')}</span>
        </div>
        <div className="stat-card animate-fade-in-up stagger-2">
          <span className="stat-label">Occupancy Rate</span>
          <span className="stat-value">{occupancyRate}%</span>
        </div>
        <div className="stat-card animate-fade-in-up stagger-3">
          <span className="stat-label">Avg Nightly Rate</span>
          <span className="stat-value">£{averageNightlyRate}</span>
        </div>
        <div className="stat-card animate-fade-in-up stagger-4">
          <span className="stat-label">Bookings</span>
          <span className="stat-value">{bookings.length}</span>
        </div>
      </section>

      {/* Main Content */}
      <div className="dashboard-main-content">
        {/* Left Column: Bookings */}
        <section className="section-card animate-fade-in-up stagger-5">
          <div className="section-header">
            <h2 className="section-title">
              Upcoming Bookings
              {!loading && <span className="badge">{bookings.length}</span>}
            </h2>
          </div>
          
          <div className="bookings-list">
            {loading ? (
              renderBookingSkeleton()
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <div className="guest-avatar">
                      {booking.avatarUrl ? (
                        <img src={booking.avatarUrl} alt={booking.guestName} className="guest-avatar-img" />
                      ) : (
                        getInitials(booking.guestName)
                      )}
                    </div>
                    <div className="guest-details">
                      <span className="guest-name">{booking.guestName}</span>
                      <span className="property-name">{booking.propertyName}</span>
                    </div>
                  </div>
                  
                  <div className="booking-meta">
                    <span className="booking-dates">
                      {formatDate(booking.checkIn)} &mdash; {formatDate(booking.checkOut)}
                    </span>
                    <span className={`booking-status ${booking.status.toLowerCase()}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                    <span className="booking-price">£{booking.totalAmount}</span>
                  </div>
                </div>
              ))
            )}
            {!loading && bookings.length === 0 && (
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>No upcoming bookings.</p>
            )}
          </div>
        </section>

        {/* Right Column: Pricing Opportunities */}
        <section className="section-card animate-fade-in-up stagger-6">
          <div className="section-header">
            <h2 className="section-title">Pricing Opportunities</h2>
          </div>
          
          <div className="opportunities-list">
            {loading ? (
              renderOppSkeleton()
            ) : (
              opportunities.map((opp, idx) => (
                <div key={idx} className="opportunity-item">
                  <div className="opp-date-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0
                    }} />
                    <div>
                      <span className="opp-date" style={{ display: 'block' }}>
                        {new Date(opp.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                      <span className="opp-reason" style={{ display: 'block' }}>{opp.reason}</span>
                    </div>
                  </div>
                  
                  <div className="opp-price-info">
                    <div className="opp-prices">
                      <span className="current-price">£{opp.currentPrice}</span>
                      <ArrowRight className="arrow-icon" />
                      <span className="recommended-price">£{opp.recommendedPrice}</span>
                    </div>
                    <span className="uplift-pill">+£{opp.uplift || (opp.recommendedPrice - opp.currentPrice)}</span>
                  </div>
                </div>
              ))
            )}
            {!loading && opportunities.length === 0 && (
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>No new opportunities found.</p>
            )}
          </div>
          
          <a href="/dashboard/pricing" className="view-all-link">
            View all in Pricing
          </a>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="quick-actions-section animate-fade-in-up stagger-6">
        <div className="quick-actions-grid">
          <a href="/dashboard/pricing" className="action-card">
            <div className="action-icon-wrapper">
              <TrendingUp className="action-icon" />
            </div>
            <div className="action-content">
              <span className="action-title">Adjust pricing</span>
            </div>
            <ArrowRight className="action-arrow" />
          </a>
          
          <a href="/dashboard/bookings" className="action-card">
            <div className="action-icon-wrapper">
              <Calendar className="action-icon" />
            </div>
            <div className="action-content">
              <span className="action-title">View bookings</span>
            </div>
            <ArrowRight className="action-arrow" />
          </a>
          
          <a href="/dashboard/listings" className="action-card">
            <div className="action-icon-wrapper">
              <Sparkles className="action-icon" />
            </div>
            <div className="action-content">
              <span className="action-title">Optimise listings</span>
            </div>
            <ArrowRight className="action-arrow" />
          </a>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
