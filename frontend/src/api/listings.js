/**
 * Listings API Layer
 * ==================
 * Client for the Auto-Listing Generator endpoint.
 * Sends photos + manual data to the FastAPI backend.
 */

/**
 * Generate a listing using the AI pipeline.
 *
 * @param {File[]} files - Array of photo File objects from the upload input
 * @param {Object} manualData - Manual fields the host provides
 * @param {string} manualData.location
 * @param {string} manualData.property_type
 * @param {number} manualData.capacity_guests
 * @param {number} manualData.bedrooms
 * @param {number} manualData.beds
 * @param {number} manualData.bathrooms
 * @param {string[]} manualData.amenities
 * @param {string} manualData.description_notes
 * @returns {Promise<Object>} The generated listing result
 */
export async function generateListing(files, manualData) {
  const formData = new FormData();

  files.forEach(file => {
    formData.append('files', file);
  });

  formData.append('location', manualData.location || manualData.host_neighbourhood || '');
  formData.append('property_type', manualData.property_type || '');
  formData.append('capacity_guests', String(manualData.capacity_guests || 2));
  formData.append('bedrooms', String(manualData.bedrooms || 1));
  formData.append('beds', String(manualData.beds || 1));
  formData.append('bathrooms', String(manualData.bathrooms || 1));
  formData.append('amenities', (manualData.amenities || []).join(', '));
  formData.append('description_notes', manualData.description_notes || '');

  const response = await fetch('/api/listings/generate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Generation failed (${response.status})`);
  }

  return response.json();
}

/**
 * Persist a generated listing into the NoSQL store along with its photos.
 *
 * @param {File[]} files - The photo File objects used during creation
 * @param {Object} manualData - The form fields the host filled in
 * @param {Object} listingResult - The AI-generated listing (title, highlights, description, verdicts)
 * @returns {Promise<Object>} { success, property_id }
 */
export async function saveListing(files, manualData, listingResult) {
  const formData = new FormData();

  files.forEach(file => {
    formData.append('files', file);
  });

  // Record which host owns this listing (used to scope the property list).
  const user = JSON.parse(localStorage.getItem('wayzyy_user') || '{}');
  const payload = { ...manualData, email: manualData.email || user.email };

  formData.append('manual_data', JSON.stringify(payload));
  formData.append('listing_result', JSON.stringify(listingResult));

  const response = await fetch('/api/listings/save', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Save failed (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch all listings saved in the NoSQL store.
 * @returns {Promise<Array>} Array of listing documents (id, name, specs, photos, ...)
 */
export async function getListings() {
  const response = await fetch('/api/listings');
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Fetch listings failed (${response.status})`);
  }
  const data = await response.json();
  return data.listings || [];
}

/**
 * Fetch a single listing's full document from the NoSQL store.
 * @param {string} listingId
 * @returns {Promise<Object>} The full listing document
 */
export async function getListing(listingId) {
  const response = await fetch(`/api/listings/${listingId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Fetch listing failed (${response.status})`);
  }
  const data = await response.json();
  return data.listing;
}
