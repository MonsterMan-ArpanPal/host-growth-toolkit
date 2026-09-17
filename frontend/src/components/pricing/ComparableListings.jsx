import React from 'react';

export default function ComparableListings({ comparables, loading }) {
  if (loading) {
    return (
      <div className="comparable-listings skeleton-container">
        <div className="skeleton title-skeleton"></div>
        <div className="skeleton row-skeleton"></div>
      </div>
    );
  }

  if (!comparables) return null;

  return (
    <div className="comparable-listings animate-fade-in-up stagger-3">
      <div className="comparables-header">
        <h3>Nearby comparables</h3>
        <p className="subtitle">{comparables.count} similar listings within {comparables.radiusKm}km</p>
      </div>
      
      <div className="comparables-stats">
        <div className="stat-box">
          <span className="stat-label">Budget</span>
          <span className="stat-value">£{comparables.p25Price}</span>
        </div>
        <div className="stat-box highlight">
          <span className="stat-label">Median</span>
          <span className="stat-value">£{comparables.medianPrice}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Premium</span>
          <span className="stat-value">£{comparables.p75Price}</span>
        </div>
      </div>
    </div>
  );
}
