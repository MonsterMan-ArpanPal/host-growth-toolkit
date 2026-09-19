import React, { useState, useEffect } from 'react';

export default function PricingControls({ recommendation, property, selectedDate, onApplyPrice }) {
  const [customPrice, setCustomPrice] = useState('');
  const [minPrice, setMinPrice] = useState(120);
  const [maxPrice, setMaxPrice] = useState(350);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (property) {
      setMinPrice(property.minPrice || 120);
      setMaxPrice(property.maxPrice || 350);
    }
  }, [property]);

  const handleApplyRecommended = () => {
    if (recommendation) {
      onApplyPrice(recommendation.recommendedPrice);
      triggerSuccess();
    }
  };

  const handleApplyCustom = () => {
    if (customPrice && !isNaN(customPrice)) {
      onApplyPrice(Number(customPrice));
      triggerSuccess();
    }
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (!recommendation || !property) return null;

  return (
    <div className="pricing-controls animate-fade-in-up stagger-4">
      <button className="btn-primary full-width apply-btn" onClick={handleApplyRecommended}>
        {showSuccess ? 'Price Applied ✓' : `Apply £${recommendation.recommendedPrice} for ${formatDate(selectedDate)}`}
      </button>

      <div className="custom-price-section">
        <label>Or set a custom price</label>
        <div className="custom-price-input-group">
          <span className="currency-prefix">£</span>
          <input 
            type="number" 
            value={customPrice} 
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder={recommendation.recommendedPrice}
          />
          <button className="btn-secondary" onClick={handleApplyCustom}>Apply</button>
        </div>
      </div>

      <div className="price-bounds">
        <div className="bounds-header">
          <span>Pricing Boundaries</span>
          <span className="bounds-values">£{minPrice} — £{maxPrice}</span>
        </div>
        <div className="bound-inputs">
          <div className="bound-input">
            <label>Min</label>
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="bound-input">
            <label>Max</label>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="controls-footer">
        host It recommends. You decide.
      </div>
    </div>
  );
}
