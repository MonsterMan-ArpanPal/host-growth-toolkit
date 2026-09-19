/**
 * Wayzyy Mock Data
 * ================
 * Realistic sample data for the prototype. Structured to match
 * the shape the real Python/FastAPI backend will return.
 *
 * When the backend is ready, replace the API layer (api/pricing.js)
 * without changing any UI components.
 */

// ─── Host Profile ───────────────────────────────────────────────
export const host = {
  id: 'host_001',
  firstName: 'James',
  lastName: 'Wilson',
  email: 'james.wilson@email.com',
  avatar: null,
  memberSince: '2024-03',
  isSuperhost: true,
};

// ─── Properties ─────────────────────────────────────────────────
export const properties = [
  {
    id: 'prop_001',
    name: 'Kensington Garden Flat',
    address: '42 Kensington High St, London W8 4PT',
    neighborhood: 'Kensington and Chelsea',
    propertyType: 'Apartment',
    roomType: 'Entire home/apt',
    bedrooms: 2,
    bathrooms: 1,
    accommodates: 4,
    beds: 3,
    currentPrice: 175,
    minPrice: 120,
    maxPrice: 350,
    rating: 4.82,
    reviewCount: 47,
    status: 'active',
    occupancyRate: 78,
    latitude: 51.4993,
    longitude: -0.1928,
    isSuperhost: true,
    amenities: [
      'wifi', 'kitchen', 'heating', 'washer', 'dryer',
      'tv', 'iron', 'workspace', 'smoke_alarm',
    ],
  },
  {
    id: 'prop_002',
    name: 'Shoreditch Loft Studio',
    address: '18 Curtain Rd, London EC2A 3AT',
    neighborhood: 'Hackney',
    propertyType: 'Apartment',
    roomType: 'Entire home/apt',
    bedrooms: 0,
    bathrooms: 1,
    accommodates: 2,
    beds: 1,
    currentPrice: 95,
    minPrice: 65,
    maxPrice: 200,
    rating: 4.71,
    reviewCount: 89,
    status: 'active',
    occupancyRate: 84,
    latitude: 51.5235,
    longitude: -0.0794,
    isSuperhost: true,
    amenities: [
      'wifi', 'kitchen', 'heating', 'washer', 'tv',
      'air_conditioning', 'workspace', 'smoke_alarm',
    ],
  },
  {
    id: 'prop_003',
    name: 'Camden Victorian Townhouse',
    address: '7 Gloucester Crescent, London NW1 7DL',
    neighborhood: 'Camden',
    propertyType: 'House',
    roomType: 'Entire home/apt',
    bedrooms: 3,
    bathrooms: 2,
    accommodates: 6,
    beds: 4,
    currentPrice: 280,
    minPrice: 180,
    maxPrice: 500,
    rating: 4.93,
    reviewCount: 31,
    status: 'active',
    occupancyRate: 65,
    latitude: 51.5388,
    longitude: -0.1462,
    isSuperhost: true,
    amenities: [
      'wifi', 'kitchen', 'heating', 'washer', 'dryer',
      'tv', 'iron', 'workspace', 'free_parking', 'smoke_alarm',
      'air_conditioning',
    ],
  },
];

// ─── Bookings ───────────────────────────────────────────────────
export const bookings = [
  {
    id: 'bk_001',
    propertyId: 'prop_001',
    propertyName: 'Kensington Garden Flat',
    guestName: 'Sarah M.',
    checkIn: '2026-09-04',
    checkOut: '2026-09-08',
    nights: 4,
    nightlyRate: 191,
    totalPrice: 764,
    status: 'confirmed',
    channel: 'airbnb', // Coral / Orange badge
    guestCount: 2,
    cleaningStatus: 'scheduled'
  },
  {
    id: 'bk_002',
    propertyId: 'prop_001',
    propertyName: 'Kensington Garden Flat',
    guestName: 'David L. (iOS Sync)',
    checkIn: '2026-09-12',
    checkOut: '2026-09-16',
    nights: 4,
    nightlyRate: 185,
    totalPrice: 740,
    status: 'confirmed',
    channel: 'google', // Blue badge
    guestCount: 2,
    cleaningStatus: 'completed'
  },
  {
    id: 'bk_003',
    propertyId: 'prop_001',
    propertyName: 'Kensington Garden Flat',
    guestName: 'Elena R. (Airbnb)',
    checkIn: '2026-09-21',
    checkOut: '2026-09-24',
    nights: 3,
    nightlyRate: 195,
    totalPrice: 585,
    status: 'confirmed',
    channel: 'airbnb', // Coral badge
    guestCount: 3,
    cleaningStatus: 'pending'
  },
  {
    id: 'bk_004_conflict',
    propertyId: 'prop_001',
    propertyName: 'Kensington Garden Flat',
    guestName: 'Direct Booking (Web)',
    checkIn: '2026-09-21',
    checkOut: '2026-09-23',
    nights: 2,
    nightlyRate: 210,
    totalPrice: 420,
    status: 'confirmed',
    channel: 'wayzyy', // Green badge - creates conflict on Sep 21-23!
    guestCount: 2,
    isConflict: true
  },
  {
    id: 'bk_005',
    propertyId: 'prop_001',
    propertyName: 'Kensington Garden Flat',
    guestName: 'Michael P.',
    checkIn: '2026-09-26',
    checkOut: '2026-09-29',
    nights: 3,
    nightlyRate: 188,
    totalPrice: 564,
    status: 'confirmed',
    channel: 'wayzyy', // Green badge
    guestCount: 4,
    cleaningStatus: 'scheduled'
  },
  {
    id: 'bk_006',
    propertyId: 'prop_002',
    propertyName: 'Shoreditch Loft Studio',
    guestName: 'Marco D.',
    checkIn: '2026-09-10',
    checkOut: '2026-09-14',
    nights: 4,
    nightlyRate: 102,
    totalPrice: 408,
    status: 'confirmed',
    channel: 'airbnb',
    guestCount: 1
  },
  {
    id: 'bk_007',
    propertyId: 'prop_002',
    propertyName: 'Shoreditch Loft Studio',
    guestName: 'Sophie T.',
    checkIn: '2026-09-18',
    checkOut: '2026-09-22',
    nights: 4,
    nightlyRate: 110,
    totalPrice: 440,
    status: 'confirmed',
    channel: 'wayzyy',
    guestCount: 2
  },
  {
    id: 'bk_008',
    propertyId: 'prop_003',
    propertyName: 'Camden Victorian Townhouse',
    guestName: 'Chen W.',
    checkIn: '2026-09-15',
    checkOut: '2026-09-20',
    nights: 5,
    nightlyRate: 295,
    totalPrice: 1475,
    status: 'confirmed',
    channel: 'google',
    guestCount: 5
  }
];

// ─── Earnings ───────────────────────────────────────────────────
export const earnings = {
  currentMonth: { total: 3240, label: 'September' },
  lastMonth: { total: 2880, label: 'August' },
  revenueChange: 12.5,
  occupancyRate: 78,
  occupancyChange: 5.2,
  averageNightly: 182,
  averageNightlyChange: 8.1,
  totalBookingsThisMonth: 14,
  bookingsChange: 16.7,
};


// ─── Pricing Engine Mock ────────────────────────────────────────

/**
 * Deterministic pseudo-random from a seed string.
 * Used to generate consistent "random" data for demo purposes.
 */
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

const LONDON_EVENTS = {
  '2026-09-19': { name: 'Rugby Autumn Internationals', type: 'Sports' },
  '2026-10-31': { name: 'Halloween Weekend', type: 'Holiday' },
  '2026-11-05': { name: 'Bonfire Night', type: 'Holiday' },
  '2026-12-24': { name: 'Christmas Eve', type: 'Holiday' },
  '2026-12-25': { name: 'Christmas Day', type: 'Holiday' },
  '2026-12-31': { name: "New Year's Eve", type: 'Holiday' },
};

const BASE_PRICES = {
  prop_001: 175,
  prop_002: 95,
  prop_003: 280,
};

/**
 * Generate a pricing recommendation for a property on a specific date.
 * Mimics the output shape of the real PricingEngine.recommend_price().
 */
export function getPricingRecommendation(propertyId, dateStr) {
  const base = BASE_PRICES[propertyId] || 150;
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
  const month = date.getMonth();
  const rng = seededRandom(`${propertyId}-${dateStr}`);

  // Market pressure: higher on weekends, events, and peak months
  let marketPressure = 35 + rng() * 30; // 35-65 base
  if (isWeekend) marketPressure += 15;
  if (month >= 5 && month <= 8) marketPressure += 12; // summer peak
  if (month === 11) marketPressure += 18; // december
  const event = LONDON_EVENTS[dateStr] || null;
  if (event) marketPressure += 20;
  marketPressure = Math.min(Math.max(marketPressure, 5), 98);

  // Demand level
  let demandLevel = 'medium';
  if (marketPressure >= 70) demandLevel = 'high';
  else if (marketPressure < 30) demandLevel = 'low';

  // Comparable stats
  const compMedian = base * (0.9 + rng() * 0.2);
  const compP25 = compMedian * 0.82;
  const compP75 = compMedian * 1.18;
  const compCount = Math.floor(12 + rng() * 18);

  // Adjustment factors
  let totalAdjustment = 0;
  const factors = [];

  // Weekend premium
  const weekendAdj = isWeekend ? 0.03 : 0;
  if (weekendAdj > 0) {
    totalAdjustment += weekendAdj;
    factors.push({
      label: 'Weekend demand',
      detail: 'Friday & Saturday typically see higher bookings in this area',
      impact: 'positive',
      pct: weekendAdj * 100,
    });
  }

  // Market pressure effect
  if (marketPressure > 65) {
    const pressureAdj = ((marketPressure - 50) / 50) * 0.08;
    totalAdjustment += pressureAdj;
    factors.push({
      label: 'High local demand',
      detail: `${Math.round(marketPressure)}% of comparable listings are booked`,
      impact: 'positive',
      pct: pressureAdj * 100,
    });
  } else if (marketPressure < 30) {
    const pressureAdj = ((50 - marketPressure) / 50) * -0.06;
    totalAdjustment += pressureAdj;
    factors.push({
      label: 'Lower local demand',
      detail: `Only ${Math.round(marketPressure)}% of listings are booked nearby`,
      impact: 'negative',
      pct: pressureAdj * 100,
    });
  } else {
    factors.push({
      label: 'Typical local demand',
      detail: `${Math.round(marketPressure)}% of nearby listings are booked — normal for this period`,
      impact: 'neutral',
      pct: 0,
    });
  }

  // Comparable listings influence
  const compDiff = (compMedian - base) / base;
  if (Math.abs(compDiff) > 0.05) {
    const compAdj = compDiff * 0.25;
    totalAdjustment += Math.max(-0.1, Math.min(0.1, compAdj));
    factors.push({
      label: 'Comparable listings',
      detail: `${compCount} similar properties nearby average £${Math.round(compMedian)}/night`,
      impact: compDiff > 0 ? 'positive' : 'negative',
      pct: compAdj * 100,
    });
  } else {
    factors.push({
      label: 'Comparable listings',
      detail: `${compCount} similar properties nearby average £${Math.round(compMedian)}/night — in line with your pricing`,
      impact: 'neutral',
      pct: 0,
    });
  }

  // Seasonal context
  let seasonLabel = 'Standard season';
  let seasonDetail = 'No major seasonal factors';
  if (month >= 5 && month <= 8) {
    seasonLabel = 'Summer peak';
    seasonDetail = 'London sees higher tourist demand during summer months';
    const seasonAdj = 0.04 + rng() * 0.03;
    totalAdjustment += seasonAdj;
    factors.push({
      label: seasonLabel,
      detail: seasonDetail,
      impact: 'positive',
      pct: seasonAdj * 100,
    });
  } else if (month === 11 || month === 0) {
    seasonLabel = 'Holiday season';
    seasonDetail = 'Christmas and New Year period drives higher demand';
    const seasonAdj = 0.05 + rng() * 0.04;
    totalAdjustment += seasonAdj;
    factors.push({
      label: seasonLabel,
      detail: seasonDetail,
      impact: 'positive',
      pct: seasonAdj * 100,
    });
  } else {
    factors.push({
      label: seasonLabel,
      detail: seasonDetail,
      impact: 'neutral',
      pct: 0,
    });
  }

  // Event boost
  if (event) {
    const eventAdj = 0.06 + rng() * 0.04;
    totalAdjustment += eventAdj;
    factors.push({
      label: event.name,
      detail: `Local event typically increases demand for short-term rentals`,
      impact: 'positive',
      pct: eventAdj * 100,
    });
  }

  // Clamp total
  totalAdjustment = Math.max(-0.15, Math.min(0.15, totalAdjustment));

  const recommendedPrice = Math.round(base * (1 + totalAdjustment));
  const rangeLow = Math.round(recommendedPrice * 0.9);
  const rangeHigh = Math.round(recommendedPrice * 1.1);

  return {
    basePrice: base,
    recommendedPrice,
    priceRange: [rangeLow, rangeHigh],
    marketPressure: Math.round(marketPressure),
    demandLevel,
    adjustmentPct: Math.round(totalAdjustment * 1000) / 10,
    factors,
    seasonalContext: seasonLabel,
    event: event ? { name: event.name, type: event.type } : null,
    comparables: {
      count: compCount,
      medianPrice: Math.round(compMedian),
      p25Price: Math.round(compP25),
      p75Price: Math.round(compP75),
      radiusKm: 1.5 + rng() * 1.5,
    },
  };
}


/**
 * Generate a pricing calendar (30 days from a start date).
 */
export function generatePricingCalendar(propertyId, startDateStr) {
  // Parse date string manually to avoid timezone issues
  const parts = (startDateStr || '2026-09-17').split('-').map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const rec = getPricingRecommendation(propertyId, dateStr);

    days.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      isWeekend: d.getDay() === 5 || d.getDay() === 6,
      recommendedPrice: rec.recommendedPrice,
      basePrice: rec.basePrice,
      marketPressure: rec.marketPressure,
      demandLevel: rec.demandLevel,
      event: rec.event,
    });
  }

  return days;
}


// ─── Pricing Opportunities ──────────────────────────────────────
export function getPricingOpportunities(propertyId) {
  const calendar = generatePricingCalendar(propertyId, '2026-09-17');
  const property = properties.find(p => p.id === propertyId);
  if (!property) return [];

  return calendar
    .filter(day => {
      const diff = day.recommendedPrice - property.currentPrice;
      return diff > property.currentPrice * 0.05; // at least 5% higher
    })
    .slice(0, 5)
    .map(day => ({
      date: day.date,
      currentPrice: property.currentPrice,
      recommendedPrice: day.recommendedPrice,
      uplift: day.recommendedPrice - property.currentPrice,
      reason: day.event
        ? `${day.event.name} — higher local demand expected`
        : day.demandLevel === 'high'
          ? 'High demand period in your area'
          : day.isWeekend
            ? 'Weekend demand boost'
            : 'Market conditions favour a price increase',
    }));
}
