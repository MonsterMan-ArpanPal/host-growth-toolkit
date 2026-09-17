import React, { useState, useEffect } from 'react';
import { fetchPricingRecommendation, fetchPricingCalendar, getProperties } from '../api/pricing';
import PricingHero from '../components/pricing/PricingHero';
import PricingFactors from '../components/pricing/PricingFactors';
import ComparableListings from '../components/pricing/ComparableListings';
import PricingControls from '../components/pricing/PricingControls';
import PricingCalendar from '../components/pricing/PricingCalendar';
import './PricingPage.css';

export default function PricingPage() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('prop_001');
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  
  const [recommendation, setRecommendation] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProperties() {
      try {
        const props = await getProperties();
        setProperties(props);
        if (props.length > 0 && !props.find(p => p.id === selectedProperty)) {
          setSelectedProperty(props[0].id);
        }
      } catch (err) {
        console.error("Failed to load properties", err);
      }
    }
    loadProperties();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!selectedProperty || !selectedDate) return;
      setLoading(true);
      setError(null);
      try {
        const [recData, calData] = await Promise.all([
          fetchPricingRecommendation(selectedProperty, selectedDate),
          fetchPricingCalendar(selectedProperty)
        ]);
        setRecommendation(recData);
        setCalendarData(calData);
      } catch (err) {
        setError('Failed to load pricing data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedProperty, selectedDate]);

  const handleApplyPrice = (price) => {
    console.log(`Applied price £${price} for ${selectedDate}`);
  };

  const property = properties.find(p => p.id === selectedProperty) || null;

  return (
    <div className="pricing-page animate-fade-in-up">
      <div className="pricing-header">
        <div className="pricing-controls-row">
          <select 
            value={selectedProperty} 
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="property-selector"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="pricing-content">
        <div className="pricing-main-column">
          <PricingHero recommendation={recommendation} property={property} loading={loading} />
          <PricingFactors factors={recommendation?.factors} loading={loading} />
          <ComparableListings comparables={recommendation?.comparables} loading={loading} />
        </div>
        
        <div className="pricing-side-column">
          <PricingControls 
            recommendation={recommendation} 
            property={property}
            selectedDate={selectedDate}
            onApplyPrice={handleApplyPrice}
          />
          <PricingCalendar 
            calendarData={calendarData} 
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
