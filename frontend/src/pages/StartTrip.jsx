// pages/StartTrip.jsx — 4-step unified flow with FeedbackModal + EscalationModal
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Square, Loader2,
  BrainCircuit, AlertTriangle, ChevronRight, Shield, Clock, TrendingDown
} from 'lucide-react';
import MapView from '../components/MapView';
import FeedbackModal from '../components/FeedbackModal';
import EscalationModal from '../components/EscalationModal';
import { getSafestRoute, startTrip, endTrip, analyzeThreat } from '../services/api';

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

const STEP = { INPUT: 'INPUT', ROUTES: 'ROUTES', TRACKING: 'TRACKING' };
const RISK_COLOR = { LOW: '#00FF9D', MEDIUM: '#FFC857', HIGH: '#FF3B5C' };
const scoreColor = s => s >= 65 ? '#00FF9D' : s >= 40 ? '#FFC857' : '#FF3B5C';

export default function StartTrip() {
  const [step, setStep]           = useState(STEP.INPUT);
  const [srcKey, setSrcKey]       = useState('New Delhi Station');
  const [dstKey, setDstKey]       = useState('Lajpat Nagar');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [selectedRoute, setSelected] = useState(null);
  const [activeTrip, setActiveTrip]  = useState(null);
  const [currentPos, setCurrentPos]  = useState(null);
  const [liveRisk, setLiveRisk]      = useState('LOW');
  const [threatInput, setThreatInput] = useState('');
  const [threatResult, setThreatResult] = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [showFeedback, setShowFeedback]     = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationData, setEscalationData] = useState(null);
  const trackRef  = useRef(null);
  const wayptsRef = useRef([]);

  const src  = LOCATIONS[srcKey];
  const dest = LOCATIONS[dstKey];

  // Step 1 → 2
  const handleAnalyzeRoutes = async () => {
    if (srcKey === dstKey) return;
    setLoadingRoutes(true);
    setRouteData(null);
    try {
      const data = await getSafestRoute(src.lat, src.lon, dest.lat, dest.lon);
      setRouteData(data);
      setStep(STEP.ROUTES);
    } catch (e) { console.error(e); }
    finally { setLoadingRoutes(false); }
  };

  // Step 2 → 3
  const handleStartTrip = async (route) => {
    setSelected(route);
    try {
      const res = await startTrip(src.lat, src.lon, dest.lat, dest.lon, srcKey, dstKey, 1);
      setActiveTrip(res?.trip || { id: null, eta_minutes: 25 });
      const wps = route?.waypoints?.map(w => [w.lat, w.lon]) || [
        [src.lat, src.lon],
        [(src.lat + dest.lat) / 2, (src.lon + dest.lon) / 2],
        [dest.lat, dest.lon],
      ];
      wayptsRef.current = wps;
      setCurrentPos(wps[0]);
      setStep(STEP.TRACKING);
      startSim(wps);
    } catch (e) { console.error(e); }
  };

  const startSim = (wps) => {
    let p = 0;
    clearInterval(trackRef.current);
    trackRef.current = setInterval(() => {
      p += 0.018;
      if (p >= 1) { clearInterval(trackRef.current); return; }
      const total  = wps.length - 1;
      const si     = Math.min(Math.floor(p * total), total - 1);
      const sp     = (p * total) - si;
      const s = wps[si], e = wps[si + 1];
      setCurrentPos([s[0] + (e[0] - s[0]) * sp, s[1] + (e[1] - s[1]) * sp]);
    }, 1200);
  };

  // End trip → show feedback modal
  const handleEndTrip = async () => {
    clearInterval(trackRef.current);
    if (activeTrip?.id) await endTrip(activeTrip.id).catch(() => {});
    setStep(STEP.TRACKING); // keep tracking panel visible while modal is open
    setShowFeedback(true);
  };

  const handleFeedbackDone = () => {
    setShowFeedback(false);
    setStep(STEP.INPUT);
    setActiveTrip(null); setCurrentPos(null);
    setThreatResult(null); setLiveRisk('LOW');
    setRouteData(null); setSelected(null);
  };

  // Threat analysis with auto-escalation + modal
  const handleThreatAnalysis = async () => {
    if (!threatInput.trim()) return;
    setAnalyzing(true);
    try {
      const res = await analyzeThreat(
        threatInput,
        currentPos?.[0] ?? src.lat,
        currentPos?.[1] ?? src.lon,
        1, 'FeelSafe User', activeTrip?.id,
      );
      setThreatResult(res);
      const risk = res.risk_level || 'LOW';
      setLiveRisk(risk);

      if ((risk === 'HIGH' || risk === 'MEDIUM') && res.auto_escalated) {
        setEscalationData(res.escalation_result);
        setShowEscalation(true);
        if (risk === 'HIGH' && res.escalation_result?.whatsapp_link) {
          setTimeout(() => window.open(res.escalation_result.whatsapp_link, '_blank'), 2500);
        }
      }
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); setThreatInput(''); }
  };

  useEffect(() => () => clearInterval(trackRef.current), []);

  const routeColor = selectedRoute ? scoreColor(selectedRoute.safety_score) : '#00E5FF';
  const borderColor = RISK_COLOR[liveRisk];

  const allRoutes = routeData ? [
    routeData.safest_route   && { ...routeData.safest_route,  _tag: 'Safest',  _badge: '#00FF9D' },
    routeData.shortest_route && routeData.shortest_route?.name !== routeData.safest_route?.name
      && { ...routeData.shortest_route, _tag: 'Fastest', _badge: '#00E5FF' },
    ...(routeData.alternative_routes || []).slice(0, 1).map(r => ({ ...r, _tag: 'Option', _badge: '#7C4DFF' })),
  ].filter(Boolean) : [];

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">

      {/* Modals */}
      {showFeedback && (
        <FeedbackModal tripId={activeTrip?.id} onClose={handleFeedbackDone} onSubmitted={handleFeedbackDone} />
      )}
      {showEscalation && escalationData && (
        <EscalationModal riskLevel={liveRisk} escalationResult={escalationData}
          threatText={threatResult?.message || ''} onClose={() => setShowEscalation(false)} />
      )}

      {/* LEFT: Control panel */}
      <div className="w-full md:w-2/5 flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {step === STEP.INPUT && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} className="glass p-6 rounded-3xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-[#00E5FF]" /> Plan Safe Trip
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">From</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 w-4 h-4 text-[#00E5FF]" />
                    <select value={srcKey} onChange={e => setSrcKey(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00E5FF]">
                      {Object.keys(LOCATIONS).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#00FF9D]" />
                    <select value={dstKey} onChange={e => setDstKey(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00FF9D]">
                      {Object.keys(LOCATIONS).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleAnalyzeRoutes} disabled={loadingRoutes || srcKey === dstKey}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white disabled:opacity-50">
                {loadingRoutes
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing Routes...</>
                  : <><BrainCircuit className="w-5 h-5" />Analyze Safe Routes</>}
              </motion.button>
              <p className="text-xs text-gray-600 text-center mt-3">
                AI compares safety scores, police coverage & community reports
              </p>
            </motion.div>
          )}

          {step === STEP.ROUTES && routeData && (
            <motion.div key="routes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-3">
              <div className="glass p-5 rounded-3xl">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold">Choose Your Route</h2>
                  <button onClick={() => setStep(STEP.INPUT)} className="text-xs text-gray-500 hover:text-white">← Back</button>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{routeData.explanation}</p>
              </div>
              {allRoutes.map((route, i) => (
                <motion.div key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => handleStartTrip(route)}
                  className="cursor-pointer glass p-4 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full text-black"
                          style={{ background: route._badge }}>{route._tag}</span>
                        <span className="font-bold text-sm">{route.name}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        {route.distance_km && <span><TrendingDown className="inline w-3 h-3 mr-0.5" />{route.distance_km} km</span>}
                        {route.eta_minutes && <span><Clock className="inline w-3 h-3 mr-0.5" />{route.eta_minutes} min</span>}
                        <span><Shield className="inline w-3 h-3 mr-0.5" />{route.safety_label}</span>
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
            </motion.div>
          )}

          {step === STEP.TRACKING && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4">
              <div className="glass p-5 rounded-3xl border transition-all duration-500"
                style={{ borderColor: `${borderColor}55` }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Live Monitoring</h3>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ color: borderColor, background: `${borderColor}18`, border: `1px solid ${borderColor}44` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: borderColor }}></span>
                    {liveRisk} RISK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatMini label="ETA" value={`${activeTrip?.eta_minutes ?? 25}m`} color="#00E5FF" />
                  <StatMini label="Route" value={selectedRoute?.safety_label || 'Safe'} color="#00FF9D" />
                  <StatMini label="Score" value={selectedRoute?.safety_score ?? '—'} color="#7C4DFF" />
                </div>
              </div>

              <div className="glass p-5 rounded-3xl">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-[#FFC857]" /> AI Threat Analysis
                </h3>
                <textarea rows={2} value={threatInput} onChange={e => setThreatInput(e.target.value)}
                  placeholder={`Describe situation...\ne.g. "Someone is following me"`}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-[#FFC857] mb-2" />
                <button onClick={handleThreatAnalysis} disabled={analyzing || !threatInput.trim()}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-[#FFC857] text-black disabled:opacity-40 flex items-center justify-center gap-2">
                  {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : 'Analyze Threat'}
                </button>
                <AnimatePresence>
                  {threatResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className={`mt-3 p-3 rounded-xl border text-xs overflow-hidden ${
                        threatResult.risk_level === 'HIGH'   ? 'border-[#FF3B5C]/50 bg-[#FF3B5C]/10' :
                        threatResult.risk_level === 'MEDIUM' ? 'border-[#FFC857]/50 bg-[#FFC857]/10' :
                                                               'border-[#00FF9D]/50 bg-[#00FF9D]/10'}`}>
                      <span className="font-bold" style={{ color: RISK_COLOR[threatResult.risk_level] }}>
                        {threatResult.risk_level}
                      </span>
                      {' — '}{threatResult.message}
                      {threatResult.auto_escalated && (
                        <div className="text-[#FFC857] mt-1 font-bold">
                          ✓ Auto-alerted {threatResult.escalation_result?.contacts_count ?? 0} contact(s)
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleEndTrip} disabled={showFeedback}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF3B5C] to-red-700 text-white disabled:opacity-50">
                <Square className="w-5 h-5" fill="currentColor" /> End Trip Safely
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: Map */}
      <div className="w-full md:w-3/5">
        <div className="glass rounded-3xl overflow-hidden h-[480px] md:h-full relative border transition-all duration-700"
          style={{ borderColor: `${borderColor}44` }}>
          <MapView
            source={src ? [src.lat, src.lon] : null}
            destination={dest ? [dest.lat, dest.lon] : null}
            routeCoordinates={
              step === STEP.TRACKING ? wayptsRef.current :
              step === STEP.ROUTES && allRoutes[0]?.waypoints
                ? allRoutes[0].waypoints.map(w => [w.lat, w.lon])
                : []
            }
            currentPosition={currentPos}
            routeColor={routeColor}
            riskLevel={liveRisk}
          />
          {step === STEP.TRACKING && (
            <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
              <div className="w-[180%] h-[180%] rounded-full border animate-ping opacity-5"
                style={{ borderColor }} />
            </div>
          )}
          {step === STEP.ROUTES && routeData && (
            <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-xl text-xs border border-gray-700 z-[400]">
              Showing <span className="font-bold text-[#00E5FF]">{routeData.route_count}</span> route options
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded-xl p-2">
      <div className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</div>
      <div className="font-bold text-sm" style={{ color }}>{value}</div>
    </div>
  );
}
