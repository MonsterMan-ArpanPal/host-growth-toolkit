import React, { useState, useEffect } from 'react';
import { getProperties } from '../api/pricing';
import HealthRing from '../components/listings/HealthRing';
import { AlertTriangle, Camera, Edit3, RefreshCw, Check } from 'lucide-react';
import './ListingsPage.css';

export default function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Mock listing health data
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    getProperties().then(props => {
      setProperties(props);
      if (props.length > 0) setSelectedPropertyId(props[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedPropertyId) return;
    setLoading(true);
    
    // Simulate API delay fetching health data
    setTimeout(() => {
      // Generate some deterministic mock data based on ID
      const isGood = selectedPropertyId === 'prop_001';
      
      setHealthData({
        overall: isGood ? 92 : 78,
        photoQuality: isGood ? 95 : 65,
        description: isGood ? 88 : 80,
        pricing: isGood ? 94 : 85,
        alerts: isGood ? [] : [
          {
            id: 1,
            type: 'photo',
            title: 'Living Room Photo Underexposed',
            description: 'The primary living room photo appears dark and may not attract guests. Consider re-shooting in daylight.',
            icon: <Camera size={20} />
          },
          {
            id: 2,
            type: 'description',
            title: 'Missing Amenities in Title',
            description: 'Top performing listings in your area highlight "Free Parking". host It AI can rewrite your title to include this.',
            icon: <Edit3 size={20} />
          }
        ]
      });
      setLoading(false);
    }, 400);
  }, [selectedPropertyId]);

  const renderProgressBar = (label, value) => {
    let fillClass = 'fill-good';
    if (value < 60) fillClass = 'fill-poor';
    else if (value < 85) fillClass = 'fill-warn';
    
    return (
      <div className="progress-item">
        <div className="progress-header">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill ${fillClass}" style={{ width: `${value}%` }}></div>
        </div>
      </div>
    );
  };

  const removeAlert = (id) => {
    setHealthData(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== id),
      overall: Math.min(100, prev.overall + 5), // bump score optimistically
    }));
  };

  return (
    <div className="listings-page animate-fade-in-up">
      <header className="listings-header">
        <div>
          <h1 className="page-title">Listing Optimization</h1>
          <p className="page-subtitle">AI-driven audit to maximize your booking conversion</p>
        </div>
        <select 
          className="property-selector"
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
        >
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </header>

      {loading || !healthData ? (
        <div className="health-dashboard skeleton-container">
          <div className="skeleton" style={{ height: '300px' }}></div>
          <div className="skeleton" style={{ height: '300px' }}></div>
        </div>
      ) : (
        <>
          <div className="health-dashboard">
            <div className="glass-card health-score-container">
              <HealthRing score={healthData.overall} />
              <div className="health-status-text">
                {healthData.overall >= 90 ? 'Excellent' : healthData.overall >= 75 ? 'Needs Improvement' : 'Poor'}
              </div>
              <p style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)' }}>
                Your listing is performing better than {healthData.overall - 12}% of properties in the area.
              </p>
            </div>
            
            <div className="glass-card health-breakdown">
              <h3>Score Breakdown</h3>
              {renderProgressBar('Photo Quality', healthData.photoQuality)}
              {renderProgressBar('Description Completeness', healthData.description)}
              {renderProgressBar('Pricing Competitiveness', healthData.pricing)}
              
              <button className="btn-secondary" style={{ marginTop: 'var(--sp-4)', width: '100%', display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)' }}>
                <RefreshCw size={16} /> Re-scan Listing
              </button>
            </div>
          </div>

          <div className="ai-recommendations">
            <h3><AlertTriangle size={24} color="#fbbf24" /> AI Recommendations</h3>
            
            {healthData.alerts.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                <Check size={48} color="#34d399" style={{ marginBottom: 'var(--sp-4)' }} />
                <h4>Looking Good!</h4>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>host It AI found no immediate issues with your listing.</p>
              </div>
            ) : (
              healthData.alerts.map(alert => (
                <div key={alert.id} className="alert-box">
                  <div className="alert-icon">{alert.icon}</div>
                  <div className="alert-content">
                    <h4>{alert.title}</h4>
                    <p>{alert.description}</p>
                    <div className="alert-actions">
                      {alert.type === 'photo' ? (
                        <button className="btn-action" onClick={() => removeAlert(alert.id)}>Upload New Photo</button>
                      ) : (
                        <button className="btn-action" onClick={() => removeAlert(alert.id)}>Apply AI Rewrite</button>
                      )}
                      <button className="btn-secondary" onClick={() => removeAlert(alert.id)}>Dismiss</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
