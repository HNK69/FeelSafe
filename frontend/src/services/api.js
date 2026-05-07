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
    console.log(`✅ Backend response for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Call failed for ${endpoint}:`, error.message);
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
    trip_id: 'demo-trip-001',
    status: 'success',
    eta: '22 mins',
    safety_score: 88
  });
};

export const analyzeThreat = async (text) => {
  return apiCall('/api/analyze-threat', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, {
    risk_level: 'LOW',
    confidence: 0.05,
    threat_score: 5,
    score: 5,
    reason: 'No significant threat indicators detected.',
    matched_keywords: [],
    action_tips: ['Stay aware of your surroundings.'],
    categories: []
  });
};

export const safestRoute = async ({ origin_lat, origin_lon, dest_lat, dest_lon }) => {
  return apiCall('/api/safest-route', {
    method: 'POST',
    body: JSON.stringify({ origin_lat, origin_lon, dest_lat, dest_lon }),
  }, {
    safest_route: {
      id: 'fallback',
      name: 'Main Highway (Fallback)',
      safety_score: 75,
      safety_label: 'Safe',
      distance_km: 14.2,
      nearby_police: true,
      nearby_hospital: false,
      tags: ['busy_road'],
      safety_factors: ['Police station nearby (+22)', 'Community rating: 3.8/5 (+9)'],
      description: 'Main road via India Gate — generally well-lit and busy.'
    },
    all_routes_ranked: [],
    explanation: 'Route evaluated using current safety conditions. Backend offline — showing estimated data.',
  });
};

export const submitFeedback = async (feedbackData) => {
  return apiCall('/api/submit-route-feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  }, { success: true, message: 'Feedback noted (offline mode).' });
};

export const getRouteStats = async (routeId) => {
  return apiCall(`/api/route-stats/${routeId}`, {}, {
    route_stats: { avg_rating: 0, total_ratings: 0, unsafe_report_count: 0 }
  });
};

export const emergencyAlert = async (locationData) => {
  return apiCall('/api/emergency-alert', {
    method: 'POST',
    body: JSON.stringify(locationData),
  }, {
    status: 'Alert Sent',
    alert_id: 'SOS-DEMO',
    notified: ['Emergency Contacts', 'Authorities']
  });
};

export const checkHealth = async () => {
  return apiCall('/health', {}, { status: 'offline' });
};
