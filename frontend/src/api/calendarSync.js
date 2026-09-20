const userEmail = () => JSON.parse(localStorage.getItem('wayzyy_user') || '{}').email || '';

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || 'Calendar sync request failed.');
  return body;
}

export async function getCalendarSync(propertyId) {
  const email = userEmail();
  return readResponse(await fetch(`/api/properties/${propertyId}/calendar-sync?email=${encodeURIComponent(email)}`));
}

export async function importCalendarFeed(propertyId, url) {
  return readResponse(await fetch(`/api/properties/${propertyId}/calendar-sync/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, email: userEmail() }),
  }));
}
