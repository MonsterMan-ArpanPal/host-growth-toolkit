import React from 'react';

export default function PricingFactors({ factors, loading }) {
  if (loading) {
    return (
      <div className="pricing-factors skeleton-container">
        <div className="skeleton title-skeleton"></div>
        <div className="skeleton row-skeleton"></div>
        <div className="skeleton row-skeleton"></div>
      </div>
    );
  }

  if (!factors || factors.length === 0) return null;

  return (
    <div className="pricing-factors animate-fade-in-up stagger-2">
      <h3>Why this price</h3>
      <div className="factors-list">
        {factors.map((factor, index) => (
          <div key={index} className="factor-item">
            <div className={`impact-dot impact-${factor.impact}`}></div>
            <div className="factor-content">
              <div className="factor-header">
                <span className="factor-label">{factor.label}</span>
                {factor.pct && (
                  <span className={`factor-pct ${factor.pct > 0 ? 'positive' : factor.pct < 0 ? 'negative' : ''}`}>
                    {factor.pct > 0 ? '+' : ''}{factor.pct}%
                  </span>
                )}
              </div>
              <div className="factor-detail">{factor.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
