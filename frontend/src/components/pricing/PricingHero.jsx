import React from 'react';

export default function PricingHero({ recommendation, property, loading }) {
  if (loading || !recommendation) {
    return (
      <div className="pricing-hero skeleton-container">
        <div className="skeleton title-skeleton"></div>
        <div className="skeleton price-skeleton"></div>
        <div className="skeleton badge-skeleton"></div>
        <div className="skeleton bar-skeleton"></div>
      </div>
    );
  }

  const { recommendedPrice, priceRange, demandLevel, marketPressure, adjustmentPct } = recommendation;
  const isPositive = adjustmentPct > 0;
  
  return (
    <div className="pricing-hero animate-fade-in-up stagger-1">
      <div className="hero-header">
        <span className="hero-label">Recommended nightly rate</span>
        <div className={`demand-badge demand-${demandLevel}`}>
          {demandLevel.charAt(0).toUpperCase() + demandLevel.slice(1)} Demand
        </div>
      </div>
      
      <div className="price-display">
        <span className="currency">£</span>
        <span className="amount">{recommendedPrice}</span>
        <span className="period">/ night</span>
      </div>

      <div className={`change-badge ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{adjustmentPct}% from your current price
      </div>

      <div className="price-range-container">
        <div className="range-labels">
          <span>£{priceRange[0]}</span>
          <span className="range-title">Optimal Range</span>
          <span>£{priceRange[1]}</span>
        </div>
        <div className="range-bar">
          <div className="range-fill" style={{ 
            left: '0%', 
            width: '100%' 
          }}></div>
          <div className="range-marker" style={{ 
            left: `${((recommendedPrice - priceRange[0]) / (priceRange[1] - priceRange[0])) * 100}%` 
          }}></div>
        </div>
      </div>

      <div className="market-pressure">
        <div className="pressure-header">
          <span>Market pressure</span>
          <span>{marketPressure}/100</span>
        </div>
        <div className="pressure-bar-bg">
          <div className="pressure-bar-fill" style={{ width: `${marketPressure}%` }}></div>
        </div>
      </div>
    </div>
  );
}
