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

  formData.append('location', manualData.location || '');
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
