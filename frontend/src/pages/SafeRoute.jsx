// pages/SafeRoute.jsx
// Standalone SafeRoute AI explorer — search routes, see all 3 options, with live map
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Navigation, MapPin, Loader2, ChevronRight, Shield, Clock, TrendingDown } from 'lucide-react';
import MapView from '../components/MapView';
import SafetyRating from '../components/SafetyRating';
import { getSafestRoute } from '../services/api';

const LOCATIONS = {
  'New Delhi Station':  { lat: 28.6429, lon: 77.2191 },
  'Connaught Place':    { lat: 28.6315, lon: 77.2167 },
  'Lajpat Nagar':       { lat: 28.5677, lon: 77.2433 },
  'Hauz Khas':          { lat: 28.5495, lon: 77.2065 },
  'Saket':              { lat: 28.5254, lon: 77.2091 },
  'Karol Bagh':         { lat: 28.6514, lon: 77.1907 },
  'AIIMS':              { lat: 28.5672, lon: 77.2100 },
  'Noida Sector 18':    { lat: 28.5355, lon: 77.3910 },
  'Qutub Minar':        { lat: 28.5244, lon: 77.1855 },
  'India Gate':         { lat: 28.6129, lon: 77.2295 },
};

const scoreColor = s => s >= 65 ? '#00FF9D' : s >= 40 ? '#FFC857' : '#FF3B5C';
const routeColors = ['#00E5FF', '#FFC857', '#FF3B5C', '#7C4DFF'];

export default function SafeRoute() {
  const [sourceKey, setSourceKey] = useState('New Delhi Station');
  const [destKey, setDestKey]     = useState('Lajpat Nagar');
  const [loading, setLoading]     = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [searched, setSearched]   = useState(false);

  const src  = LOCATIONS[sourceKey];
  const dest = LOCATIONS[destKey];

  const handleSearch = async () => {
    if (sourceKey === destKey) return;
    setLoading(true);
    setRouteData(null);
    try {
      const data = await getSafestRoute(src.lat, src.lon, dest.lat, dest.lon);
      setRouteData(data);
      setActiveIdx(0);
      setSearched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Build all routes list for display
  const allRoutes = routeData ? [
    routeData.safest_route   && { ...routeData.safest_route,  _tag: 'Safest',   _color: '#00FF9D' },
    routeData.shortest_route && routeData.shortest_route?.name !== routeData.safest_route?.name
      && { ...routeData.shortest_route, _tag: 'Shortest',  _color: '#00E5FF' },
    ...(routeData.alternative_routes || []).slice(0, 2).map((r, i) => ({ ...r, _tag: `Option ${i+2}`, _color: routeColors[i+2] })),
  ].filter(Boolean) : [];

  const activeRoute   = allRoutes[activeIdx];
  const activeWaypts  = activeRoute?.waypoints?.map(w => [w.lat, w.lon]) || [
    [src?.lat, src?.lon], [dest?.lat, dest?.lon]
  ];
  const mapColor      = activeRoute ? scoreColor(activeRoute.safety_score) : '#00E5FF';

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-5/12 flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit className="w-8 h-8 text-[#00E5FF]" />
          <h1 className="text-3xl font-black">AI SafeRoute</h1>
        </div>

        {/* Search Form */}
        <div className="glass p-6 rounded-3xl">
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 uppercase mb-1 block">From</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 w-5 h-5 text-[#00E5FF]" />
                <select value={sourceKey} onChange={e => setSourceKey(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00E5FF]">
                  {Object.keys(LOCATIONS).map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase mb-1 block">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-[#00FF9D]" />
                <select value={destKey} onChange={e => setDestKey(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00FF9D]">
                  {Object.keys(LOCATIONS).map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSearch} disabled={loading || sourceKey === destKey}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white disabled:opacity-50">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing Routes...</> :
                       <><BrainCircuit className="w-5 h-5" />Find Safe Routes</>}
          </motion.button>
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass p-10 rounded-3xl flex flex-col items-center border border-[#00E5FF]/20">
              <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin mb-3" />
              <p className="text-gray-400 font-bold">Analyzing all route options...</p>
              <p className="text-xs text-gray-600 mt-1">Checking safety scores, police coverage & community reports</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Route Results */}
        <AnimatePresence>
          {routeData && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              {/* AI Summary */}
              <div className="glass p-5 rounded-3xl border border-[#00E5FF]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[40px] opacity-20" />
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold mb-2">AI Safety Analysis</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{routeData.explanation}</p>
                  </div>
                  <div className="scale-75 origin-right flex-shrink-0">
                    <SafetyRating score={routeData.safest_route?.safety_score ?? 75} />
                  </div>
                </div>
                {/* Route tags */}
                {routeData.safest_route?.factors?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {routeData.safest_route.factors.slice(0, 4).map((f, i) => (
                      <span key={i} className={`text-xs font-bold px-2 py-1 rounded-full ${
                        f.includes('+') ? 'bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/30' :
                        'bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/30'}`}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Route Cards */}
              <div className="space-y-3">
                {allRoutes.map((route, idx) => (
                  <motion.div key={idx} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveIdx(idx)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 ${
                      activeIdx === idx
                        ? 'bg-black/60 shadow-lg' : 'bg-black/30 border-gray-800 hover:border-gray-600'}`}
                    style={activeIdx === idx ? { borderColor: `${route._color}55`, boxShadow: `0 0 15px ${route._color}22` } : {}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black px-2 py-0.5 rounded-full text-black"
                            style={{ background: route._color }}>{route._tag}</span>
                          <span className="font-bold">{route.name}</span>
                          {activeIdx === idx && <span className="text-xs text-gray-400">← on map</span>}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          {route.distance_km && (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />{route.distance_km} km
                            </span>
                          )}
                          {route.eta_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{route.eta_minutes} min
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />{route.safety_label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black" style={{ color: scoreColor(route.safety_score) }}>
                          {route.safety_score}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!searched && !loading && (
          <div className="glass p-8 rounded-3xl text-center border border-gray-800">
            <BrainCircuit className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Select locations and click Find Safe Routes to see AI-ranked route options.</p>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: MAP ────────────────────────────────────────────────── */}
      <div className="w-full lg:w-7/12">
        <div className="glass p-2 rounded-3xl h-[600px] border border-[#00E5FF]/20 relative overflow-hidden"
          style={activeRoute ? { borderColor: `${mapColor}44` } : {}}>
          <MapView
            source={src ? [src.lat, src.lon] : null}
            destination={dest ? [dest.lat, dest.lon] : null}
            routeCoordinates={activeWaypts}
            routeColor={mapColor}
            riskLevel={activeRoute?.safety_score < 40 ? 'HIGH' : activeRoute?.safety_score < 65 ? 'MEDIUM' : 'LOW'}
          />
          {/* Map overlay legend */}
          <div className="absolute top-5 right-5 glass p-4 rounded-2xl border border-gray-700 text-xs z-[400] space-y-2">
            <div className="font-bold text-sm border-b border-gray-700 pb-2">Route Legend</div>
            {[['#00FF9D','Safe (65+)'],['#FFC857','Moderate (40–64)'],['#FF3B5C','Unsafe (<40)']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-2 text-gray-300">
                <div className="w-3 h-3 rounded-full" style={{ background: c, boxShadow: `0 0 5px ${c}` }}></div>{l}
              </div>
            ))}
          </div>
          {/* Route info overlay */}
          {activeRoute && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-5 left-5 glass p-3 rounded-xl border border-gray-700 z-[400] text-xs">
              <div className="font-bold" style={{ color: mapColor }}>{activeRoute._tag}: {activeRoute.name}</div>
              <div className="text-gray-400 mt-0.5">Safety score: {activeRoute.safety_score}/100</div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
