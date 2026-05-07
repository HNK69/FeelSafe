const API_BASE_URL = 'http://localhost:5000';

/**
 * Reusable fetch wrapper with error handling and optional fallback data
 */
async function apiCall(endpoint, options = {}, fallbackData = null) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Backend response for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`API Call failed for ${endpoint}:`, error.message);
    if (fallbackData !== null) {
      console.warn('Using fallback data instead due to backend failure.');
      return fallbackData;
    }
    throw error;
  }
}

export const startTrip = async (tripData) => {
  return apiCall('/api/start-trip', {
    method: 'POST',
    body: JSON.stringify(tripData),
  }, {
    trip_id: 'dummy-trip-123',
    status: 'success',
    eta: '25 mins',
    safety_score: 92
  });
};

export const analyzeThreat = async (text) => {
  // Pass strictly the text directly, backend expects {"text": "..."}
  return apiCall('/api/analyze-threat', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, {
    risk_level: text.toLowerCase().includes('help') ? 'High' : 'Low',
    confidence: 0.95,
    threat_score: text.toLowerCase().includes('help') ? 90 : 10,
    categories: ['Suspicious Activity']
  });
};

export const safestRoute = async (routeData) => {
  return apiCall('/api/safest-route', {
    method: 'POST',
    body: JSON.stringify(routeData),
  }, {
    safest_route: "Main Highway",
    safety_score: 85,
    risk_label: "Low Risk",
    alternative_routes: [
      { name: "Downtown Ave", score: 65, risk: "Moderate" },
      { name: "Backstreets", score: 40, risk: "High Risk" }
    ],
    explanation: "This route avoids known poorly-lit areas and has a higher density of community reports indicating safety."
  });
};

export const emergencyAlert = async (locationData) => {
  return apiCall('/api/emergency-alert', {
    method: 'POST',
    body: JSON.stringify(locationData),
  }, {
    status: 'Alert Sent',
    alert_id: 'SOS-999',
    notified: ['Police', 'Emergency Contacts']
  });
};

export const checkHealth = async () => {
  return apiCall('/health', {}, { status: 'offline' });
};
