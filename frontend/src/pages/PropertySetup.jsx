import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupProperty } from '../api/pricing';
import './Auth.css';

const PropertySetup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    property_type: 'Apartment',
    room_type: 'Entire home/apt',
    accommodates: 2,
    bathrooms: 1.0,
    bedrooms: 1,
    beds: 1,
    host_neighbourhood: 'Kensington',
    amenities: ['Wifi', 'Kitchen', 'Heating']
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const amenitiesList = [
    'Wifi', 'Kitchen', 'Heating', 'Smoke alarm', 'Washer', 'Dryer', 'Air conditioning', 'TV'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckbox = (amenity) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
    } else {
      setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Basic coordinates for London
      const coords = {
        latitude: 51.5074,
        longitude: -0.1278
      };
      
      await setupProperty({
        ...formData,
        accommodates: Number(formData.accommodates),
        bathrooms: Number(formData.bathrooms),
        bedrooms: Number(formData.bedrooms),
        beds: Number(formData.beds),
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to setup property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: '2rem 0', minHeight: '100vh', overflowY: 'auto' }}>
      <div className="auth-card animate-fade-in-up" style={{ maxWidth: '600px', margin: 'auto' }}>
        <div className="auth-header">
          <h1 className="auth-title">Set up your property</h1>
          <p className="auth-subtitle">Tell us about your listing to get accurate pricing recommendations</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label>Property Type</label>
              <select name="property_type" value={formData.property_type} onChange={handleChange} style={{height: '44px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0 12px'}}>
                <option style={{color: 'black'}} value="Apartment">Apartment</option>
                <option style={{color: 'black'}} value="House">House</option>
                <option style={{color: 'black'}} value="Condominium">Condominium</option>
                <option style={{color: 'black'}} value="Townhouse">Townhouse</option>
                <option style={{color: 'black'}} value="Loft">Loft</option>
              </select>
            </div>
            <div className="form-group">
              <label>Room Type</label>
              <select name="room_type" value={formData.room_type} onChange={handleChange} style={{height: '44px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '0 12px'}}>
                <option style={{color: 'black'}} value="Entire home/apt">Entire home/apt</option>
                <option style={{color: 'black'}} value="Private room">Private room</option>
                <option style={{color: 'black'}} value="Shared room">Shared room</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Accommodates</label>
              <input type="number" name="accommodates" value={formData.accommodates} onChange={handleChange} min="1" max="16" />
            </div>
            <div className="form-group">
              <label>Bedrooms</label>
              <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} min="0" max="10" />
            </div>
            <div className="form-group">
              <label>Beds</label>
              <input type="number" name="beds" value={formData.beds} onChange={handleChange} min="1" max="16" />
            </div>
            <div className="form-group">
              <label>Bathrooms</label>
              <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} min="0" step="0.5" max="10" />
            </div>
          </div>

          <div className="form-group">
            <label>Neighborhood (London)</label>
            <input type="text" name="host_neighbourhood" value={formData.host_neighbourhood} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Amenities</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px', marginTop: '8px' }}>
              {amenitiesList.map(a => (
                <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.9)' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.amenities.includes(a)}
                    onChange={() => handleCheckbox(a)}
                    style={{ width: '16px', height: '16px', margin: 0 }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '20px' }}>
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PropertySetup;
