import React, { useState, useEffect } from 'react';
import { ArrowUpRight, TrendingUp, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { getUpcomingBookings, fetchPricingOpportunities, getProperties } from '../api/pricing';
import './Dashboard.css';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | Wayzyy';
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Simulate a slight delay for realistic loading skeleton feel
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const properties = await getProperties();
        const defaultPropertyId = properties.length > 0 ? properties[0].id : 'prop_001';
        
        const [bookingsData, opportunitiesData] = await Promise.all([
          getUpcomingBookings(),
          fetchPricingOpportunities(defaultPropertyId)
        ]);
        
        setBookings(bookingsData.slice(0, 4)); // Show top 4
        setOpportunities(opportunitiesData.slice(0, 3)); // Show top 3
      } catch (error) {
        console.error("Failed to load dashboard data", error);
        // Fallback dummy data if API fails or doesn't return anything
        setBookings([
          { id: '1', guestName: 'Sarah Jenkins', propertyName: 'The London Townhouse', checkIn: '2023-09-20', checkOut: '2023-09-23', status: 'confirmed', totalAmount: 540, avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
          { id: '2', guestName: 'Michael Chen', propertyName: 'Brighton Sea View', checkIn: '2023-09-24', checkOut: '2023-09-28', status: 'pending', totalAmount: 720, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
          { id: '3', guestName: 'Emma Watson', propertyName: 'The London Townhouse', checkIn: '2023-10-02', checkOut: '2023-10-05', status: 'confirmed', totalAmount: 480, avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' },
          { id: '4', guestName: 'David Miller', propertyName: 'Cornwall Cottage', checkIn: '2023-10-12', checkOut: '2023-10-16', status: 'confirmed', totalAmount: 850, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=100&h=100&q=80' }
        ]);
        setOpportunities([
          { date: '2023-09-19', currentPrice: 150, recommendedPrice: 166, uplift: 16, reason: 'High demand weekend' }
        ]);
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

  return (
    <div className="dashboard-container">
      {/* Welcome Header with Image */}
      <header className="dashboard-header animate-fade-in-up">
        <div className="dashboard-header-bg" style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')`
        }}>
          <div className="dashboard-header-content">
            <h1 className="welcome-title">{getGreeting()}, James</h1>
            <p className="welcome-subtitle">Here's how your properties are performing today.</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card animate-fade-in-up stagger-1">
          <span className="stat-label">This Month's Revenue</span>
          <span className="stat-value">£3,240</span>
          <div className="stat-change positive">
            <ArrowUpRight className="stat-change-icon" />
            <span>12.5%</span>
          </div>
        </div>
        <div className="stat-card animate-fade-in-up stagger-2">
          <span className="stat-label">Occupancy Rate</span>
          <span className="stat-value">78%</span>
          <div className="stat-change positive">
            <ArrowUpRight className="stat-change-icon" />
            <span>5.2%</span>
          </div>
        </div>
        <div className="stat-card animate-fade-in-up stagger-3">
          <span className="stat-label">Avg Nightly Rate</span>
          <span className="stat-value">£182</span>
          <div className="stat-change positive">
            <ArrowUpRight className="stat-change-icon" />
            <span>8.1%</span>
          </div>
        </div>
        <div className="stat-card animate-fade-in-up stagger-4">
          <span className="stat-label">Bookings</span>
          <span className="stat-value">14</span>
          <div className="stat-change positive">
            <ArrowUpRight className="stat-change-icon" />
            <span>16.7%</span>
          </div>
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
