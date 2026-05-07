// pages/StartTrip.jsx
// Unified trip start + SafeRoute selection flow.
// STEP 1: Enter source/dest → STEP 2: See route options → STEP 3: Select → Trip starts

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Play, Square, Loader2, BrainCircuit, Shield, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import MapView from '../components/MapView';
import ThreatBox from '../components/ThreatBox';
import { getSafestRoute, startTrip, endTrip, analyzeThreat } from '../services/api';

// Fixed Delhi-area coordinates for demo
const LOCATION_PRESETS = {
  'New Delhi Station':   { lat: 28.6429, lon: 77.2191 },
  'Connaught Place':     { lat: 28.6315, lon: 77.2167 },
  'Lajpat Nagar':        { lat: 28.5677, lon: 77.2433 },
  'Hauz Khas':           { lat: 28.5495, lon: 77.2065 },
  'Saket':               { lat: 28.5254, lon: 77.2091 },
  'Karol Bagh':          { lat: 28.6514, lon: 77.1907 },
  'AIIMS':               { lat: 28.5672, lon: 77.2100 },
  'Noida Sector 18':     { lat: 28.5355, lon: 77.3910 },
};

const STEP = { INPUT: 'INPUT', ROUTES: 'ROUTES', TRACKING: 'TRACKING' };

const riskColor = { LOW: '#00FF9D', MEDIUM: '#FFC857', HIGH: '#FF3B5C' };

export default function StartTrip() {
  const [step, setStep]           = useState(STEP.INPUT);
  const [sourceKey, setSourceKey] = useState('New Delhi Station');
  const [destKey, setDestKey]     = useState('Lajpat Nagar');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [currentPos, setCurrentPos]   = useState(null);
  const [threatInput, setThreatInput] = useState('');
  const [threatResult, setThreatResult] = useState(null);
  const [analyzingThreat, setAnalyzingThreat] = useState(false);
  const [liveRisk, setLiveRisk] = useState('LOW');

  const trackIntervalRef = useRef(null);
  const routeWaypointsRef = useRef([]);

  const src  = LOCATION_PRESETS[sourceKey];
  const dest = LOCATION_PRESETS[destKey];

  // ── Step 1 → Step 2: Fetch routes ─────────────────────────────────────────
  const handleAnalyzeRoutes = async () => {
    if (!src || !dest) return;
    setLoadingRoutes(true);
    try {
      const data = await getSafestRoute(src.lat, src.lon, dest.lat, dest.lon);
      setRouteData(data);
      setStep(STEP.ROUTES);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // ── Step 2 → Step 3: Start trip after route selection ─────────────────────
  const handleStartTrip = async (route) => {
    setSelectedRoute(route);
    try {
      const trip = await startTrip(src.lat, src.lon, dest.lat, dest.lon, sourceKey, destKey, 1);
      setActiveTrip(trip?.trip || { id: 1, eta_minutes: 25, status: 'ACTIVE' });

      // Build waypoints from selected route or generate synthetic ones
      const wps = route?.waypoints?.map(w => [w.lat, w.lon]) || [
        [src.lat, src.lon],
        [(src.lat + dest.lat) / 2, (src.lon + dest.lon) / 2],
        [dest.lat, dest.lon],
      ];
      routeWaypointsRef.current = wps;
      setCurrentPos(wps[0]);
      setStep(STEP.TRACKING);
      startPositionSimulation(wps);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Animated position simulation ──────────────────────────────────────────
  const startPositionSimulation = (waypoints) => {
    let progress = 0;
    clearInterval(trackIntervalRef.current);
    trackIntervalRef.current = setInterval(() => {
      progress += 0.02;
      if (progress >= 1) { clearInterval(trackIntervalRef.current); return; }
      const total = waypoints.length - 1;
      const segIdx = Math.floor(progress * total);
      const segProg = (progress * total) - segIdx;
      if (segIdx < total) {
        const s = waypoints[segIdx], e = waypoints[segIdx + 1];
        setCurrentPos([s[0] + (e[0] - s[0]) * segProg, s[1] + (e[1] - s[1]) * segProg]);
      }
    }, 1500);
  };

  // ── End trip ───────────────────────────────────────────────────────────────
  const handleEndTrip = async () => {
    clearInterval(trackIntervalRef.current);
    if (activeTrip?.id) await endTrip(activeTrip.id).catch(() => {});
    setStep(STEP.INPUT);
    setActiveTrip(null);
    setCurrentPos(null);
    setThreatResult(null);
    setLiveRisk('LOW');
    setRouteData(null);
    setSelectedRoute(null);
  };

  // ── Live threat analysis ───────────────────────────────────────────────────
  const handleThreatAnalysis = async () => {
    if (!threatInput.trim()) return;
    setAnalyzingThreat(true);
    try {
      const res = await analyzeThreat(
        threatInput,
        currentPos ? currentPos[0] : src.lat,
        currentPos ? currentPos[1] : src.lon,
        1, 'FeelSafe User', activeTrip?.id
      );
      setThreatResult(res);
      setLiveRisk(res.risk_level || 'LOW');
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingThreat(false);
    }
  };

  useEffect(() => () => clearInterval(trackIntervalRef.current), []);

  const routeColor = selectedRoute ? (
    selectedRoute.safety_score >= 65 ? '#00E5FF' :
    selectedRoute.safety_score >= 40 ? '#FFC857' : '#FF3B5C'
  ) : '#00E5FF';

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-full md:w-2/5 flex flex-col gap-4">

        {/* STEP 1: Location Input */}
        <AnimatePresence mode="wait">
          {step === STEP.INPUT && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass p-6 rounded-3xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-[#00E5FF]" /> Plan Safe Trip
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">From</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 w-5 h-5 text-[#00E5FF]" />
                    <select value={sourceKey} onChange={e => setSourceKey(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00E5FF]">
                      {Object.keys(LOCATION_PRESETS).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-[#00FF9D]" />
                    <select value={destKey} onChange={e => setDestKey(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00FF9D]">
                      {Object.keys(LOCATION_PRESETS).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleAnalyzeRoutes} disabled={loadingRoutes || sourceKey === destKey}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white disabled:opacity-50">
                {loadingRoutes ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                {loadingRoutes ? 'Analyzing Routes...' : 'Analyze Safe Routes'}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: Route Selection */}
          {step === STEP.ROUTES && routeData && (
            <motion.div key="routes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="glass p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Select Route</h2>
                <button onClick={() => setStep(STEP.INPUT)} className="text-xs text-gray-400 hover:text-white">Back</button>
              </div>
              <p className="text-sm text-gray-400 mb-4">{routeData.explanation}</p>

              <div className="space-y-3">
                {/* Safest Route */}
                {routeData.safest_route && (
                  <RouteOption
                    route={routeData.safest_route}
                    label="Safest"
                    badge="#00FF9D"
                    onSelect={() => handleStartTrip(routeData.safest_route)}
                  />
                )}
                {/* Shortest Route (if different) */}
                {routeData.shortest_route && routeData.shortest_route.id !== routeData.safest_route?.id && (
                  <RouteOption
                    route={routeData.shortest_route}
                    label="Shortest"
                    badge="#00E5FF"
                    onSelect={() => handleStartTrip(routeData.shortest_route)}
                  />
                )}
                {/* Alternatives */}
                {(routeData.alternative_routes || []).slice(0, 2).map((r, i) => (
                  <RouteOption key={i} route={r} label={`Option ${i + 2}`} badge="#7C4DFF"
                    onSelect={() => handleStartTrip(r)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Tracking Active */}
          {step === STEP.TRACKING && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4">
              {/* Live Status Card */}
              <div className={`glass p-5 rounded-3xl border transition-all duration-500 ${
                liveRisk === 'HIGH'   ? 'border-[#FF3B5C]/60 shadow-[0_0_20px_rgba(255,59,92,0.2)]' :
                liveRisk === 'MEDIUM' ? 'border-[#FFC857]/60' : 'border-[#00FF9D]/30'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Live Monitoring</h3>
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full`}
                    style={{ color: riskColor[liveRisk], background: `${riskColor[liveRisk]}18`, border: `1px solid ${riskColor[liveRisk]}44` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: riskColor[liveRisk] }}></span>
                    {liveRisk} RISK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <StatMini label="ETA" value={`${activeTrip?.eta_minutes ?? 25} min`} color="#00E5FF" />
                  <StatMini label="Route" value={selectedRoute?.safety_label || 'Safe'} color="#00FF9D" />
                  <StatMini label="Score" value={selectedRoute?.safety_score ?? '—'} color="#7C4DFF" />
                </div>
              </div>

              {/* Threat Input */}
              <div className="glass p-5 rounded-3xl">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFC857]" /> AI Threat Check
                </h3>
                <textarea rows={2} value={threatInput} onChange={e => setThreatInput(e.target.value)}
                  placeholder="Describe situation e.g. 'Someone is following me'"
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-[#FFC857] mb-2" />
                <button onClick={handleThreatAnalysis} disabled={analyzingThreat || !threatInput.trim()}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-[#FFC857] text-black disabled:opacity-50 flex items-center justify-center gap-2">
                  {analyzingThreat ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {analyzingThreat ? 'Analyzing...' : 'Analyze Threat'}
                </button>
                {threatResult && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`mt-3 p-3 rounded-xl border text-sm ${
                      threatResult.risk_level === 'HIGH' ? 'border-[#FF3B5C]/50 bg-[#FF3B5C]/10' :
                      threatResult.risk_level === 'MEDIUM' ? 'border-[#FFC857]/50 bg-[#FFC857]/10' :
                      'border-[#00FF9D]/50 bg-[#00FF9D]/10'}`}>
                    <div className="font-bold mb-1" style={{ color: riskColor[threatResult.risk_level] }}>
                      {threatResult.risk_level} RISK
                    </div>
                    <p className="text-gray-300 text-xs">{threatResult.message}</p>
                    {threatResult.auto_escalated && (
                      <p className="text-[#FFC857] text-xs mt-1 font-bold">
                        Auto-alerted {threatResult.escalation_result?.contacts_count ?? 0} emergency contacts
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* End Trip */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleEndTrip}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF3B5C] to-red-700 text-white">
                <Square className="w-5 h-5" fill="currentColor" /> End Trip Safely
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT PANEL: MAP ────────────────────────────────────────────────── */}
      <div className="w-full md:w-3/5 flex flex-col gap-4">
        <div className={`glass rounded-3xl overflow-hidden h-[450px] md:h-full relative border transition-all duration-700 ${
          liveRisk === 'HIGH' ? 'border-[#FF3B5C]/50' :
          liveRisk === 'MEDIUM' ? 'border-[#FFC857]/50' : 'border-[#00E5FF]/20'}`}>
          <MapView
            source={src ? [src.lat, src.lon] : null}
            destination={dest ? [dest.lat, dest.lon] : null}
            routeCoordinates={
              step === STEP.TRACKING ? routeWaypointsRef.current :
              step === STEP.ROUTES && routeData?.safest_route?.waypoints
                ? routeData.safest_route.waypoints.map(w => [w.lat, w.lon])
                : []
            }
            currentPosition={currentPos}
            routeColor={routeColor}
            riskLevel={liveRisk}
          />
          {step === STEP.TRACKING && (
            <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
              <div className={`w-[200%] h-[200%] rounded-full border animate-ping opacity-10`}
                style={{ borderColor: riskColor[liveRisk] }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteOption({ route, label, badge, onSelect }) {
  const score = route?.safety_score ?? 50;
  const scoreColor = score >= 65 ? '#00FF9D' : score >= 40 ? '#FFC857' : '#FF3B5C';
  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className="cursor-pointer p-4 bg-black/40 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ background: badge }}>{label}</span>
          <span className="font-bold text-sm">{route?.name || 'Route'}</span>
        </div>
        <div className="text-xs text-gray-400">{route?.distance_km ? `${route.distance_km} km` : ''} · {route?.safety_label || ''}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black" style={{ color: scoreColor }}>{score}</span>
        <ChevronRight className="w-5 h-5 text-gray-500" />
      </div>
    </motion.div>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded-xl p-2">
      <div className="text-xs text-gray-500 uppercase mb-1">{label}</div>
      <div className="font-bold text-sm" style={{ color }}>{value}</div>
    </div>
  );
}
