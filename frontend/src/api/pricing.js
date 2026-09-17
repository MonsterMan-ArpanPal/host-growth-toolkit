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
  getPricingRecommendation,
  generatePricingCalendar,
  getPricingOpportunities,
} from '../data/mockData';

// Simulate network latency (200-400ms)
const delay = (ms = 300) =>
  new Promise(resolve => setTimeout(resolve, 150 + Math.random() * ms));

// ─── Auth ───────────────────────────────────────────────────────
export async function login(email, password) {
  await delay();
  // In production: POST /api/auth/login
  if (!email || !password) throw new Error('Email and password are required');
  return { token: 'mock_token_xyz', user: host };
}

export async function signup(data) {
  await delay();
  // In production: POST /api/auth/signup
  return { token: 'mock_token_xyz', user: { ...host, ...data } };
}

// ─── Host ───────────────────────────────────────────────────────
export async function getHost() {
  await delay(200);
  // In production: GET /api/host/me
  return host;
}

// ─── Properties ─────────────────────────────────────────────────
export async function getProperties() {
  await delay(200);
  // In production: GET /api/properties
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
export async function fetchPricingRecommendation(propertyId, date) {
  await delay(400);
  // In production: POST /api/recommend
  // Body: { property_id, date, property_features }
  return getPricingRecommendation(propertyId, date);
}

export async function fetchPricingCalendar(propertyId, startDate) {
  await delay(500);
  // In production: GET /api/calendar?property_id=...&start=...
  return generatePricingCalendar(propertyId, startDate);
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
