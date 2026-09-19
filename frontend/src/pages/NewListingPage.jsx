import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateListing } from '../api/listings';
import {
  Upload, X, Sparkles, AlertTriangle, Check, Camera,
  MapPin, Home, Users, BedDouble, Bath, Save, ArrowLeft,
  Loader2, Image as ImageIcon, ChevronDown
} from 'lucide-react';
import './NewListingPage.css';

const AMENITY_OPTIONS = [
  'WiFi', 'Kitchen', 'A/C', 'Pool', 'Washer', 'Dryer',
  'Free Parking', 'TV', 'Iron', 'Workspace', 'Heating', 'Elevator',
];

const PROPERTY_TYPES = [
  'Apartment', 'House', 'Villa', 'Townhouse', 'Condo',
  'Loft', 'Cottage', 'Guest Suite', 'Other',
];

export default function NewListingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    location: '',
    property_type: '',
    capacity_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    amenities: [],
    description_notes: '',
  });

  // Photo state
  const [photos, setPhotos] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Save state
  const [saved, setSaved] = useState(false);

  // --- Form handlers ---
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  // --- Photo handlers ---
  const addFiles = useCallback((files) => {
    const newPhotos = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 20));
  }, []);

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  // --- Generation ---
  const handleGenerate = async () => {
    if (photos.length === 0) {
      setError('Please upload at least one photo.');
      return;
    }
    if (!form.location.trim()) {
      setError('Please enter a location.');
      return;
    }

    setError(null);
    setGenerating(true);
    setResult(null);

    try {
      const data = await generateListing(photos, form);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // --- Save (placeholder) ---
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => navigate('/dashboard/listings'), 1500);
  };

  return (
    <div className="new-listing-page animate-fade-in-up">
      {/* Header */}
      <header className="nl-header">
        <button className="nl-back-btn" onClick={() => navigate('/dashboard/listings')}>
          <ArrowLeft size={18} />
          Back to Listings
        </button>
        <div>
          <h1 className="page-title">Create New Listing</h1>
          <p className="page-subtitle">Add your property details and photos — Wayzyy AI will write the listing for you</p>
        </div>
      </header>

      <div className="nl-layout">
        {/* Left column — Form */}
        <div className="nl-form-col">
          {/* Location */}
          <div className="nl-section glass-card">
            <h3><MapPin size={18} /> Location</h3>
            <input
              type="text"
              className="nl-input"
              placeholder="e.g. Assagao, Goa"
              value={form.location}
              onChange={e => handleChange('location', e.target.value)}
            />
          </div>

          {/* Property Type */}
          <div className="nl-section glass-card">
            <h3><Home size={18} /> Property Type</h3>
            <div className="nl-select-wrap">
              <select
                className="nl-select"
                value={form.property_type}
                onChange={e => handleChange('property_type', e.target.value)}
              >
                <option value="">Select type...</option>
                {PROPERTY_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={16} className="nl-select-icon" />
            </div>
          </div>

          {/* Capacity */}
          <div className="nl-section glass-card">
            <h3><Users size={18} /> Capacity</h3>
            <div className="nl-capacity-grid">
              <div className="nl-capacity-field">
                <label>Guests</label>
                <div className="nl-stepper">
                  <button onClick={() => handleChange('capacity_guests', Math.max(1, form.capacity_guests - 1))}>-</button>
                  <span>{form.capacity_guests}</span>
                  <button onClick={() => handleChange('capacity_guests', Math.min(20, form.capacity_guests + 1))}>+</button>
                </div>
              </div>
              <div className="nl-capacity-field">
                <label>Bedrooms</label>
                <div className="nl-stepper">
                  <button onClick={() => handleChange('bedrooms', Math.max(0, form.bedrooms - 1))}>-</button>
                  <span>{form.bedrooms}</span>
                  <button onClick={() => handleChange('bedrooms', Math.min(10, form.bedrooms + 1))}>+</button>
                </div>
              </div>
              <div className="nl-capacity-field">
                <label>Beds</label>
                <div className="nl-stepper">
                  <button onClick={() => handleChange('beds', Math.max(1, form.beds - 1))}>-</button>
                  <span>{form.beds}</span>
                  <button onClick={() => handleChange('beds', Math.min(15, form.beds + 1))}>+</button>
                </div>
              </div>
              <div className="nl-capacity-field">
                <label>Baths</label>
                <div className="nl-stepper">
                  <button onClick={() => handleChange('bathrooms', Math.max(1, form.bathrooms - 1))}>-</button>
                  <span>{form.bathrooms}</span>
                  <button onClick={() => handleChange('bathrooms', Math.min(8, form.bathrooms + 1))}>+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="nl-section glass-card">
            <h3>Key Amenities</h3>
            <div className="nl-amenities-grid">
              {AMENITY_OPTIONS.map(a => (
                <button
                  key={a}
                  className={`nl-amenity-chip ${form.amenities.includes(a) ? 'active' : ''}`}
                  onClick={() => toggleAmenity(a)}
                >
                  {form.amenities.includes(a) && <Check size={14} />}
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Extra notes */}
          <div className="nl-section glass-card">
            <h3>Additional Notes for AI</h3>
            <textarea
              className="nl-textarea"
              placeholder="Anything the AI should know — nearby attractions, special features, target audience..."
              rows={3}
              value={form.description_notes}
              onChange={e => handleChange('description_notes', e.target.value)}
            />
          </div>
        </div>

        {/* Right column — Photos + Generate */}
        <div className="nl-right-col">
          {/* Photo Upload */}
          <div className="nl-section glass-card">
            <h3><Camera size={18} /> Property Photos</h3>
            <div
              className={`nl-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="nl-dropzone-icon" />
              <p>Drag & drop photos here</p>
              <span>or click to browse (max 20)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {photos.length > 0 && (
              <div className="nl-photo-grid">
                {photos.map((file, i) => (
                  <div key={i} className="nl-photo-thumb">
                    <img src={URL.createObjectURL(file)} alt={file.name} />
                    <button className="nl-photo-remove" onClick={() => removePhoto(i)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          {error && (
            <div className="nl-error glass-card">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="nl-generate-btn"
            onClick={handleGenerate}
            disabled={generating || photos.length === 0 || !form.location.trim()}
          >
            {generating ? (
              <>
                <Loader2 size={20} className="nl-spin" />
                Generating Listing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Listing with AI
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="nl-result glass-card animate-fade-in-up">
              <h3><Sparkles size={18} color="#c2694d" /> Generated Listing</h3>

              {/* Photo Verdicts */}
              {result.photo_verdicts?.length > 0 && (
                <div className="nl-photo-verdicts">
                  <h4>Photo Quality Check</h4>
                  <div className="nl-verdict-list">
                    {result.photo_verdicts.map((v, i) => (
                      <div key={i} className={`nl-verdict ${v.is_good ? 'good' : 'bad'}`}>
                        {v.is_good ? <Check size={14} /> : <AlertTriangle size={14} />}
                        <span className="nl-verdict-name">{v.filename}</span>
                        <span className="nl-verdict-flags">{v.flags.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="nl-result-field">
                <label>Title</label>
                <p className="nl-result-title">{result.title}</p>
              </div>

              {/* Highlights */}
              {result.highlights?.length > 0 && (
                <div className="nl-result-field">
                  <label>Highlights</label>
                  <ul className="nl-result-highlights">
                    {result.highlights.map((h, i) => (
                      <li key={i}><Check size={14} className="nl-highlight-check" />{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Description */}
              <div className="nl-result-field">
                <label>Description</label>
                <div className="nl-result-description">
                  {result.full_description.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              {/* Vision Features */}
              {result.vision_features?.length > 0 && (
                <details className="nl-vision-details">
                  <summary>Vision Analysis ({result.vision_features.length} photos)</summary>
                  <div className="nl-vision-list">
                    {result.vision_features.map((vf, i) => (
                      <div key={i} className="nl-vision-item">
                        <span className="nl-vision-filename">{vf.filename}</span>
                        <span>{vf.room_type}</span>
                        <span>{vf.lighting}</span>
                        <span>{vf.furniture_style}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Save Button */}
              <button className="nl-save-btn" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <Check size={18} />
                    Saved! Redirecting...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Listing
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
