import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, SlidersHorizontal, Loader2, RefreshCw, MapPin, Shield, AlertTriangle } from 'lucide-react';
import RouteCard from '../components/RouteCard';
import SafetyRating from '../components/SafetyRating';
import MapView from '../components/MapView';
import { safestRoute } from '../services/api';
import clsx from 'clsx';

// Delhi demonstration coordinates
const DEMO_ORIGIN = { lat: 28.6429, lon: 77.2191, name: 'New Delhi Station' };
const DEMO_DEST   = { lat: 28.5244, lon: 77.1855, name: 'Qutub Minar' };

const ROUTE_COORDS = [
  [DEMO_ORIGIN.lat, DEMO_ORIGIN.lon],
  [28.6139, 77.2090],
  [28.5800, 77.2000],
  [28.5500, 77.1900],
  [DEMO_DEST.lat, DEMO_DEST.lon],
];

export default function SafeRoute() {
  const [routeData, setRouteData]   = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRoute = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else           setIsLoading(true);
    try {
      const data = await safestRoute({
        origin_lat: DEMO_ORIGIN.lat,
        origin_lon: DEMO_ORIGIN.lon,
        dest_lat:   DEMO_DEST.lat,
        dest_lon:   DEMO_DEST.lon,
      });
      setRouteData(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  const bestRoute   = routeData?.safest_route ?? null;
  const alternatives = (routeData?.all_routes_ranked ?? []).slice(1, 4);
  const explanation  = routeData?.explanation ?? '';

  // Derive unsafe zone count from best route factors (heuristic)
  const unsafeZoneCount = bestRoute?.safety_factors
    ?.filter(f => f.toLowerCase().includes('unsafe') || f.toLowerCase().includes('zone'))
    .length ?? 0;

  // Build map markers from best route proximity data
  const markers = bestRoute ? [
    bestRoute.nearby_police   ? { position: [28.6330, 77.2195], color: '#00E5FF',   label: 'Police Station (Connaught Place)' } : null,
    bestRoute.nearby_hospital ? { position: [28.5672, 77.2100], color: '#00FF9D',   label: 'AIIMS Hospital — Emergency' } : null,
    { position: [28.6492, 77.2050], color: '#FF3B5C', label: 'High Risk Zone (Avoided)' },
  ].filter(Boolean) : [];

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

      {/* ─── Left Panel ─── */}
      <div className="w-full lg:w-5/12 flex flex-col gap-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-[#00E5FF]" />
            AI SafeRoute
          </h1>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500 hidden sm:block">Updated {lastUpdated}</span>
            )}
            <button
              onClick={() => fetchRoute(true)}
              disabled={isRefreshing || isLoading}
              className="p-2 glass rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
              title="Recalculate route"
            >
              <RefreshCw className={clsx('w-5 h-5', isRefreshing && 'animate-spin text-[#00E5FF]')} />
            </button>
          </div>
        </div>

        {/* Route labels */}
        <div className="glass p-4 rounded-2xl border border-gray-800 flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4 text-[#00E5FF] flex-shrink-0" />
            <span className="text-white font-medium truncate">{DEMO_ORIGIN.name}</span>
          </div>
          <div className="text-gray-600 font-bold">→</div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-white font-medium truncate">{DEMO_DEST.name}</span>
            <MapPin className="w-4 h-4 text-[#7C4DFF] flex-shrink-0" />
          </div>
        </div>

        {isLoading ? (
          <div className="glass p-14 rounded-3xl flex flex-col items-center justify-center border border-[#00E5FF]/20">
            <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin mb-4" />
            <p className="text-gray-400 font-bold text-center">AI analyzing route safety...</p>
            <p className="text-gray-600 text-xs mt-2">Checking police, hospitals, unsafe zones</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5"
            >
              {/* AI Explanation card */}
              {explanation && (
                <div className="glass p-5 rounded-3xl border border-[#00E5FF]/20 relative overflow-hidden group shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold">AI Safety Analysis</h2>
                    {bestRoute && (
                      <div className="scale-75 origin-right">
                        <SafetyRating score={bestRoute.safety_score} />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-3">{explanation}</p>

                  {/* Proximity badges */}
                  <div className="flex flex-wrap gap-2">
                    {bestRoute?.nearby_police && (
                      <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/40 px-3 py-1 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Police nearby
                      </span>
                    )}
                    {bestRoute?.nearby_hospital && (
                      <span className="text-xs bg-rose-900/40 text-rose-300 border border-rose-700/40 px-3 py-1 rounded-full">
                        🏥 Hospital nearby
                      </span>
                    )}
                    {unsafeZoneCount > 0 && (
                      <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/40 px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {unsafeZoneCount} unsafe zones factored
                      </span>
                    )}
                    {bestRoute?.is_nighttime && (
                      <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700/40 px-3 py-1 rounded-full">
                        🌙 {bestRoute.is_deep_night ? 'Deep night mode' : 'Night mode active'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Best route */}
              {bestRoute && (
                <>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse" />
                    AI Recommended Route
                  </h3>
                  <RouteCard route={bestRoute} isRecommended={true} />
                </>
              )}

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <>
                  <h3 className="font-bold text-base text-gray-400 mt-1">Alternative Routes</h3>
                  {alternatives.map((alt, idx) => (
                    <RouteCard key={alt.id ?? idx} route={alt} isRecommended={false} />
                  ))}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ─── Right Panel: Map ─── */}
      <div className="w-full lg:w-7/12 flex flex-col gap-5">
        <div className="glass p-2 rounded-3xl h-[620px] border border-[#00E5FF]/20 relative z-0 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <MapView
            source={[DEMO_ORIGIN.lat, DEMO_ORIGIN.lon]}
            destination={[DEMO_DEST.lat, DEMO_DEST.lon]}
            routeCoordinates={ROUTE_COORDS}
            markers={markers}
            routeColor={
              bestRoute
                ? bestRoute.safety_score >= 70 ? '#00E5FF'
                  : bestRoute.safety_score >= 45 ? '#FFC857'
                  : '#FF3B5C'
                : '#00E5FF'
            }
          />

          {/* Map legend */}
          <div className="absolute top-6 right-6 glass p-4 rounded-2xl border border-gray-700 flex flex-col gap-3 backdrop-blur-xl z-[400] shadow-xl">
            <div className="font-bold text-sm mb-1 text-white border-b border-gray-700 pb-2">Map Legend</div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#00FF9D] shadow-[0_0_5px_#00FF9D]" /> Safest Zone
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#FFC857] shadow-[0_0_5px_#FFC857]" /> Caution
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#FF3B5C] shadow-[0_0_5px_#FF3B5C]" /> High Risk / Unsafe
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-4 h-1 bg-[#00E5FF] rounded-full shadow-[0_0_5px_#00E5FF]" /> Recommended Route
            </div>
          </div>

          {/* Live badge */}
          <div className="absolute bottom-6 left-6 z-[400] glass px-3 py-1.5 rounded-full border border-[#00E5FF]/30 flex items-center gap-2 text-xs text-[#00E5FF] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
            LIVE SAFETY MAP
          </div>
        </div>
      </div>
    </div>
  );
}
