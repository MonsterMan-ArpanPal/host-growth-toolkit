/**
 * Wayzyy API Layer
 * ================
 * Abstraction over data fetching. Currently uses mock data.
 * When the Python/FastAPI backend is ready, swap implementations
 * here without touching any UI components.
 *
 * Every function returns a Promise to match real API behavior.
 */

import {
  host,
  properties,
  bookings,
  earnings,
  getPricingOpportunities,
} from '../data/mockData';

// Simulate network latency (200-400ms)
const delay = (ms = 300) =>
  new Promise(resolve => setTimeout(resolve, 150 + Math.random() * ms));

export async function login(email, password) {
  const res = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('wayzyy_user', JSON.stringify(data.user));
  return data;
}

export async function signup(userData) {
  const res = await fetch('http://localhost:8000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Signup failed');
  }
  const data = await res.json();
  localStorage.setItem('wayzyy_user', JSON.stringify(data.user || {}));
  return data;
}

export async function setupProperty(propertyData) {
  const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
  if (!user.email) throw new Error('Not logged in');
  
  const res = await fetch('http://localhost:8000/api/properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, ...propertyData })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Setup failed');
  }
  const data = await res.json();
  user.property_id = data.property_id;
  localStorage.setItem('wayzyy_user', JSON.stringify(user));
  return data;
}

// ─── Host ───────────────────────────────────────────────────────
export async function getHost() {
  await delay(200);
  // In production: GET /api/host/me
  return host;
}

// ─── Properties ─────────────────────────────────────────────────
export async function getProperties() {
  const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
  
  // If user signed up with a property name or has a property ID, show their property
  if (user.property_id || user.property_name) {
    return [{
      id: user.property_id || 'prop_custom_001',
      name: user.property_name || 'My Property',
      address: 'Added Property Location',
      minPrice: 50,
      maxPrice: 1000
    }];
  }
  
  // Fetch real properties from backend
  try {
    const res = await fetch('http://localhost:8000/api/properties');
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Backend properties unavailable, using mock data', err);
  }
  
  // Fallback to mock data if backend is not reachable
  return properties;
}

export async function getProperty(propertyId) {
  await delay(150);
  // In production: GET /api/properties/:id
  const prop = properties.find(p => p.id === propertyId);
  if (!prop) throw new Error(`Property ${propertyId} not found`);
  return prop;
}

// ─── Bookings ───────────────────────────────────────────────────
export async function getBookings(propertyId) {
  await delay(200);
  // In production: GET /api/bookings?property_id=...
  if (propertyId) {
    return bookings.filter(b => b.propertyId === propertyId);
  }
  return bookings;
}

export async function getUpcomingBookings() {
  await delay(200);
  const today = new Date().toISOString().split('T')[0];
  return bookings
    .filter(b => b.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

// ─── Earnings ───────────────────────────────────────────────────
export async function getEarnings() {
  await delay(200);
  // In production: GET /api/earnings/summary
  return earnings;
}

// ─── Pricing ────────────────────────────────────────────────────
const PRICING_API_URL = 'http://localhost:8000/api/pricing/recommend';
const PRICING_RETRY_ATTEMPTS = 3;
const PRICING_RETRY_DELAY_MS = 300;
const CALENDAR_REQUEST_CONCURRENCY = 5;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function requestPricingRecommendation(propertyId, date) {
  let lastError;

  for (let attempt = 1; attempt <= PRICING_RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(PRICING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ property_id: propertyId, date })
      });

      if (res.ok) return res.json();

      const error = new Error(`API error: ${res.status}`);
      // Bad request and missing-property responses cannot recover through retrying.
      if (res.status < 500 || attempt === PRICING_RETRY_ATTEMPTS) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === PRICING_RETRY_ATTEMPTS) throw error;
    }

    await wait(PRICING_RETRY_DELAY_MS * attempt);
  }

  throw lastError;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

export async function fetchPricingRecommendation(propertyId, date) {
  try {
    const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
    const targetPropertyId = user.property_id || propertyId;
    const data = await requestPricingRecommendation(targetPropertyId, date);
    
    // Transform FastAPI data to match frontend's expected format
    return {
      recommendedPrice: data.recommended_price,
      priceRange: data.price_range,
      marketPressure: Math.round(data.market_pressure_score),
      demandLevel: data.demand_level,
      adjustmentPct: data.fusion_adjustment_pct || data.adjustment_pct,
      comparables: data.comparables ? {
        count: data.comparables.comparable_count || data.comparable_count,
        radiusKm: data.comparables.message ? (data.comparables.message.match(/within ([\d.]+)km/)?.[1] || 1) : 1,
        p25Price: data.comparables.p25_price ? data.comparables.p25_price.toFixed(2) : data.comparables.p25_price,
        medianPrice: data.comparables.median_price,
        p75Price: data.comparables.p75_price ? data.comparables.p75_price.toFixed(2) : data.comparables.p75_price,
      } : null,
      factors: data.factors
        .filter(f => !f.toLowerCase().includes('fusion v2'))
        .map(f => {
          let label = f.split(':')[0];
          let detail = f;
          let impact = 'neutral';
          let pct = null;
          
          const lowerF = f.toLowerCase();
          
          // Get the ACTUAL pricing adjustment (the last percentage in the string)
          const allPcts = [...f.matchAll(/([+-]\d+(\.\d+)?)%/g)];
          if (allPcts.length > 0) {
            pct = parseFloat(allPcts[allPcts.length - 1][1]);
          }
          
          if (pct > 0) impact = 'positive';
          else if (pct < 0) impact = 'negative';

          // Host-friendly rewrites
          if (lowerF.includes('base price') || lowerF.includes('random forest')) {
            label = 'Base property value';
            detail = 'Calculated from your property attributes and location.';
            pct = null; // Base price has no adjustment %
            impact = 'neutral';
          } else if (lowerF.includes('comp') || lowerF.includes('median')) {
            label = 'Local competition';
            detail = 'Based on prices of similar listings in your area.';
          } else if (lowerF.includes('mps') || lowerF.includes('pressure')) {
            label = 'Market demand';
            detail = 'Traveler interest and availability for these dates.';
          } else if (lowerF.includes('weekend')) {
            label = 'Weekend premium';
            detail = 'Higher typical demand for weekend stays.';
          } else if (lowerF.includes('event')) {
            const nameMatch = f.match(/\(([^)]+)\)/);
            const eventName = nameMatch ? nameMatch[1] : 'Local event';
            label = eventName;
            detail = `Higher demand expected due to ${eventName}.`;
          } else if (lowerF.includes('seasonality')) {
            label = 'Seasonality';
            detail = 'Typical demand for this time of year.';
          }
          
          return {
            label,
            detail,
            impact,
            pct
          };
        }),
      seasonality: data.seasonality_context,
      eventContext: data.event_active ? `${data.event_name} (${data.event_type})` : null
    };
  } catch (err) {
    console.error("FastAPI backend failed", err);
    throw err;
  }
}

export async function fetchPricingCalendar(propertyId, startDate) {
  // Build 30 dates starting from startDate (or today)
  const parts = (startDate || new Date().toISOString().split('T')[0]).split('-').map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const dates = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  // Keep the initial calendar load gentle on the local API while preserving order.
  const results = await mapWithConcurrency(
    dates,
    CALENDAR_REQUEST_CONCURRENCY,
    date => fetchPricingRecommendation(propertyId, date)
  );

  // Transform to the calendar shape PricingCalendar expects
  return dates.map((dateStr, i) => {
    const rec = results[i];
    const [y, m, dy] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, dy);
    return {
      date: dateStr,
      dayOfWeek: d.getDay(),
      isWeekend: d.getDay() === 5 || d.getDay() === 6,
      recommendedPrice: rec.recommendedPrice,
      basePrice: rec.priceRange?.[0],
      marketPressure: rec.marketPressure,
      demandLevel: rec.demandLevel,
      event: rec.eventContext ? { name: rec.eventContext } : null,
    };
  });
}

export async function fetchPricingOpportunities(propertyId) {
  await delay(300);
  // In production: GET /api/pricing/opportunities?property_id=...
  return getPricingOpportunities(propertyId);
}

// ─── Price Update ───────────────────────────────────────────────
export async function applyPrice(propertyId, date, price) {
  await delay(400);
  // In production: POST /api/properties/:id/price
  // Body: { date, price }
  return { success: true, propertyId, date, price };
}

export async function updatePriceBounds(propertyId, minPrice, maxPrice) {
  await delay(300);
  // In production: PATCH /api/properties/:id/price-bounds
  return { success: true, propertyId, minPrice, maxPrice };
}
