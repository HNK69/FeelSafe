// pages/StartTrip.jsx
// THE main trip page — 3-step unified flow with FeedbackModal + EscalationModal
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Play, Square, Loader2,
  BrainCircuit, AlertTriangle, ChevronRight, Shield, Clock, TrendingDown, Mic
} from 'lucide-react';
import MapView from '../components/MapView';
import FeedbackModal from '../components/FeedbackModal';
import EscalationModal from '../components/EscalationModal';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { getSafestRoute, startTrip, endTrip, analyzeThreat, analyzeVoice, getSafetyAnchors } from '../services/api';

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_KEY = 'feelsafe_trip_state';

function loadTripState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveTripState(patch) {
  try {
    const current = loadTripState() || {};
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch, _savedAt: Date.now() }));
  } catch {}
}

function clearTripState() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────
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

const STEP = { INPUT: 'INPUT', ROUTES: 'ROUTES', TRACKING: 'TRACKING', ENDED: 'ENDED' };
const RISK_COLOR = { LOW: '#00FF9D', MEDIUM: '#FFC857', HIGH: '#FF3B5C' };
const scoreColor = s => s >= 65 ? '#00FF9D' : s >= 40 ? '#FFC857' : '#FF3B5C';

export default function StartTrip() {
  // ── Hydrate from localStorage on first render ──────────────────────────────
  const _cached = loadTripState();

  const [step, setStep]             = useState(_cached?.step || STEP.INPUT);
  const [srcKey, setSrcKey]         = useState(_cached?.srcKey || 'New Delhi Station');
  const [dstKey, setDstKey]         = useState(_cached?.dstKey || 'Lajpat Nagar');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeData, setRouteData]   = useState(_cached?.routeData || null);
  const [selectedRoute, setSelected] = useState(_cached?.selectedRoute || null);
  const [activeTrip, setActiveTrip] = useState(_cached?.activeTrip || null);
  // currentPos: don't restore simulated position — it would be stale
  const [currentPos, setCurrentPos] = useState(null);
  const [liveRisk, setLiveRisk]     = useState(_cached?.liveRisk || 'LOW');
  const [threatInput, setThreatInput] = useState('');
  const [threatResult, setThreatResult] = useState(_cached?.threatResult || null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationData, setEscalationData] = useState(null);
  const [micTranscript, setMicTranscript]   = useState('');
  const [dangerZones, setDangerZones]       = useState(_cached?.dangerZones || []);
  const [safetyAnchors, setSafetyAnchors]   = useState(_cached?.safetyAnchors || {});
  const [escapePoint, setEscapePoint]       = useState(_cached?.escapePoint || null);
  // Resume banner: show when returning mid-trip
  const [showResumeBanner, setShowResumeBanner] = useState(
    !!_cached && (_cached.step === STEP.ROUTES || _cached.step === STEP.TRACKING)
  );

  const trackRef   = useRef(null);
  const wayptsRef  = useRef(_cached?.waypoints || []);

  // ── Auto-save on key state changes ────────────────────────────────────────
  useEffect(() => {
    saveTripState({ step, srcKey, dstKey });
  }, [step, srcKey, dstKey]);

  useEffect(() => {
    if (routeData) saveTripState({ routeData });
  }, [routeData]);

  useEffect(() => {
    if (selectedRoute) saveTripState({ selectedRoute });
  }, [selectedRoute]);

  useEffect(() => {
    if (activeTrip) saveTripState({ activeTrip });
  }, [activeTrip]);

  useEffect(() => {
    saveTripState({ liveRisk });
  }, [liveRisk]);

  useEffect(() => {
    if (dangerZones.length) saveTripState({ dangerZones });
  }, [dangerZones]);

  useEffect(() => {
    if (Object.keys(safetyAnchors).length) saveTripState({ safetyAnchors });
  }, [safetyAnchors]);

  useEffect(() => {
    if (escapePoint) saveTripState({ escapePoint });
  }, [escapePoint]);

  useEffect(() => {
    if (threatResult) saveTripState({ threatResult });
  }, [threatResult]);

  // Restore waypoints ref when returning to TRACKING step
  useEffect(() => {
    if (step === STEP.TRACKING && _cached?.waypoints?.length && !currentPos) {
      wayptsRef.current = _cached.waypoints;
      setCurrentPos(_cached.waypoints[0]);
      startSimulation(_cached.waypoints);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const src  = LOCATIONS[srcKey];
  const dest = LOCATIONS[dstKey];

  // ── Step 1 → 2: Fetch all route options ───────────────────────────────────
  const handleAnalyzeRoutes = async () => {
    if (srcKey === dstKey) return;
    setLoadingRoutes(true);
    // Clear all stale data so UI resets completely
    setRouteData(null);
    setSelected(null);
    setDangerZones([]);
    setSafetyAnchors({});
    setEscapePoint(null);
    setThreatResult(null);
    setLiveRisk('LOW');
    wayptsRef.current = [];
    try {
      const data = await getSafestRoute(src.lat, src.lon, dest.lat, dest.lon);
      setRouteData(data);
      setStep(STEP.ROUTES);

      // Always fetch safety anchors for the route midpoint (not just low-score)
      const best = data?.safest_route;
      if (best) {
        // Set danger zones immediately for heatmap
        setDangerZones(best.danger_segments || []);
        // Midpoint between src and dest
        const midLat = (src.lat + dest.lat) / 2;
        const midLon = (src.lon + dest.lon) / 2;
        const anchorsRes = await getSafetyAnchors(midLat, midLon, 2000);
        if (anchorsRes?.success) {
          setSafetyAnchors(anchorsRes.anchors || {});
          const bestAnchor = [
            ...(anchorsRes.anchors?.police   || []),
            ...(anchorsRes.anchors?.hospital || []),
          ].sort((a, b) => a.distance_km - b.distance_km)[0];
          if (bestAnchor) setEscapePoint({ ...bestAnchor, category: bestAnchor.type || 'safety' });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleStartTrip = async (route) => {
    setSelected(route);
    // Update danger zones for the chosen route immediately
    setDangerZones(route.danger_segments || []);
    try {
      const res = await startTrip(src.lat, src.lon, dest.lat, dest.lon, srcKey, dstKey, 1);
      setActiveTrip(res?.trip || { id: null, eta_minutes: 25 });
      // Always bookend with actual selected src/dest, use route intermediates in between
      const intermediates = route?.waypoints?.map(w => [w.lat, w.lon]) || [];
      const wps = [
        [src.lat, src.lon],
        ...intermediates,
        [dest.lat, dest.lon],
      ];
      wayptsRef.current = wps;
      setCurrentPos(wps[0]);
      setStep(STEP.TRACKING);
      startSimulation(wps);
      saveTripState({ waypoints: wps, selectedRoute: route, dangerZones: route.danger_segments || [] });
      // Always fetch anchors around selected route midpoint
      const mid = wps[Math.floor(wps.length / 2)];
      const anchorsRes = await getSafetyAnchors(mid[0], mid[1], 2000);
      if (anchorsRes?.success) {
        setSafetyAnchors(anchorsRes.anchors || {});
        const bestAnchor = [
          ...(anchorsRes.anchors?.police   || []),
          ...(anchorsRes.anchors?.hospital || []),
        ].sort((a, b) => a.distance_km - b.distance_km)[0];
        if (bestAnchor) setEscapePoint({ ...bestAnchor, category: bestAnchor.type || 'safety' });
      }
    } catch (e) { console.error(e); }
  };


  // ── Animated position simulation ───────────────────────────────────────────
  const startSimulation = (wps) => {
    let progress = 0;
    clearInterval(trackRef.current);
    trackRef.current = setInterval(() => {
      progress += 0.018;
      if (progress >= 1) { clearInterval(trackRef.current); return; }
      const total  = wps.length - 1;
      const segIdx = Math.min(Math.floor(progress * total), total - 1);
      const segProg = (progress * total) - segIdx;
      const s = wps[segIdx], e = wps[segIdx + 1];
      setCurrentPos([s[0] + (e[0] - s[0]) * segProg, s[1] + (e[1] - s[1]) * segProg]);
    }, 1200);
  };

  // ── End trip → show feedback ───────────────────────────────────────────────
  const handleEndTrip = async () => {
    clearInterval(trackRef.current);
    if (activeTrip?.id) await endTrip(activeTrip.id).catch(() => {});
    setStep(STEP.ENDED);
    setShowFeedback(true);
  };

  const handleFeedbackDone = () => {
    clearTripState();  // wipe cached trip so next visit starts fresh
    setShowFeedback(false);
    setStep(STEP.INPUT);
    setActiveTrip(null); setCurrentPos(null);
    setThreatResult(null); setLiveRisk('LOW');
    setRouteData(null); setSelected(null);
    setDangerZones([]); setSafetyAnchors({}); setEscapePoint(null);
    setShowResumeBanner(false);
  };

  // ── Threat analysis with auto-escalation ──────────────────────────────────
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

      // For MEDIUM/HIGH: show escalation modal THEN auto-open WhatsApp
      if ((risk === 'HIGH' || risk === 'MEDIUM') && res.auto_escalated) {
        setEscalationData(res.escalation_result);
        setShowEscalation(true);
        // Auto-open WA link after 2.5s for HIGH risk
        if (risk === 'HIGH' && res.escalation_result?.whatsapp_link) {
          setTimeout(() => {
            window.open(res.escalation_result.whatsapp_link, '_blank');
          }, 2500);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
      setThreatInput('');
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  // ── Mic: VAD-powered auto-stop ──────────────────────────────────────────────
  const handleVoiceResult = useCallback(async (blob) => {
    const voiceRes = await analyzeVoice(blob, {
      tripId: activeTrip?.id,
      userId: 1,
      lat: currentPos?.[0] ?? src?.lat,
      lon: currentPos?.[1] ?? src?.lon,
    });
    const tx = voiceRes.transcript || '';
    if (tx) {
      setMicTranscript(tx);
      setThreatInput(tx);
      const threatRes = await analyzeThreat(tx,
        currentPos?.[0] ?? src?.lat,
        currentPos?.[1] ?? src?.lon,
        1, 'FeelSafe User', activeTrip?.id,
      );
      setThreatResult(threatRes);
      const risk = threatRes.risk_level || 'LOW';
      setLiveRisk(risk);
      if (risk === 'HIGH' || risk === 'MEDIUM') {
        if (threatRes.auto_escalated) {
          setEscalationData(threatRes.escalation_result);
          setShowEscalation(true);
        }
        if (risk === 'HIGH') {
          const lat = currentPos?.[0] ?? src?.lat;
          const lon = currentPos?.[1] ?? src?.lon;
          const anchorsRes = await getSafetyAnchors(lat, lon, 1000);
          if (anchorsRes?.success) {
            setSafetyAnchors(anchorsRes.anchors || {});
            const best = [
              ...(anchorsRes.anchors?.police   || []),
              ...(anchorsRes.anchors?.hospital || []),
            ].sort((a, b) => a.distance_km - b.distance_km)[0];
            if (best) setEscapePoint({ ...best, category: 'emergency' });
          }
          if (threatRes.escalation_result?.whatsapp_link) {
            setTimeout(() => window.open(threatRes.escalation_result.whatsapp_link, '_blank'), 2500);
          }
        }
      }
    }
  }, [activeTrip, currentPos, src]);

  const { micState, audioLevel, startRecording: startMic, stopRecording: stopMic } =
    useVoiceRecorder({ onResult: handleVoiceResult });

  useEffect(() => () => clearInterval(trackRef.current), []);

  const routeColor = selectedRoute
    ? scoreColor(selectedRoute.safety_score)
    : '#00E5FF';

  const allRoutes = routeData ? [
    routeData.safest_route   && { ...routeData.safest_route,  _tag: 'Safest',   _badge: '#00FF9D' },
    routeData.shortest_route && routeData.shortest_route?.name !== routeData.safest_route?.name
      && { ...routeData.shortest_route, _tag: 'Fastest',  _badge: '#00E5FF' },
    ...(routeData.alternative_routes || []).slice(0, 1).map(r => ({ ...r, _tag: 'Option', _badge: '#7C4DFF' })),
  ].filter(Boolean) : [];

  const borderColor = liveRisk === 'HIGH' ? '#FF3B5C' :
                      liveRisk === 'MEDIUM' ? '#FFC857' : '#00E5FF';

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {showFeedback && (
        <FeedbackModal
          tripId={activeTrip?.id}
          onClose={handleFeedbackDone}
          onSubmitted={handleFeedbackDone}
        />
      )}
      {showEscalation && escalationData && (
        <EscalationModal
          riskLevel={liveRisk}
          escalationResult={escalationData}
          threatText={threatResult?.text || ''}
          onClose={() => setShowEscalation(false)}
        />
      )}

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className="w-full md:w-2/5 flex flex-col gap-4">

        {/* Resume banner */}
        <AnimatePresence>
          {showResumeBanner && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex items-center gap-3 p-3 rounded-2xl border border-[#00FF9D]/40 bg-[#00FF9D]/5">
              <Shield className="w-5 h-5 text-[#00FF9D] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#00FF9D]">Resume Active Safe Trip</div>
                <div className="text-[11px] text-gray-400 truncate">
                  {srcKey} → {dstKey}
                  {selectedRoute ? ` · Score ${selectedRoute.safety_score}/100` : ''}
                </div>
              </div>
              <button onClick={() => setShowResumeBanner(false)}
                className="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">


          {/* STEP 1: Source / Destination input */}
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
                onClick={handleAnalyzeRoutes}
                disabled={loadingRoutes || srcKey === dstKey}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white disabled:opacity-50">
                {loadingRoutes
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Routes...</>
                  : <><BrainCircuit className="w-5 h-5" /> Analyze Safe Routes</>}
              </motion.button>
              <p className="text-xs text-gray-600 text-center mt-3">
                AI will compare safety scores, police coverage & community reports
              </p>
            </motion.div>
          )}

          {/* STEP 2: Route selection */}
          {step === STEP.ROUTES && routeData && (
            <motion.div key="routes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-3">
              <div className="glass p-5 rounded-3xl">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Choose Your Route</h2>
                <button onClick={() => {
                  setStep(STEP.INPUT);
                  setRouteData(null);
                  setDangerZones([]);
                  setSafetyAnchors({});
                  setEscapePoint(null);
                  wayptsRef.current = [];
                }} className="text-xs text-gray-500 hover:text-white">← Back</button>
              </div>
              <p className="text-xs text-[#00E5FF] font-bold mb-1">
                {srcKey} → {dstKey}
              </p>
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

          {/* STEP 3: Active trip monitoring */}
          {step === STEP.TRACKING && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4">
              {/* Live Status */}
              <div className="glass p-5 rounded-3xl border transition-all duration-500"
                style={{ borderColor: `${RISK_COLOR[liveRisk]}55` }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Live Monitoring</h3>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ color: RISK_COLOR[liveRisk], background: `${RISK_COLOR[liveRisk]}18`, border: `1px solid ${RISK_COLOR[liveRisk]}44` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: RISK_COLOR[liveRisk] }}></span>
                    {liveRisk} RISK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatMini label="ETA" value={`${activeTrip?.eta_minutes ?? 25}m`} color="#00E5FF" />
                  <StatMini label="Route" value={selectedRoute?.safety_label || 'Safe'} color="#00FF9D" />
                  <StatMini label="Score" value={selectedRoute?.safety_score ?? '—'} color="#7C4DFF" />
                </div>
              </div>

              {/* Threat Analysis */}
              <div className="glass p-5 rounded-3xl">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-[#FFC857]" /> AI Threat Analysis
                </h3>
                {micTranscript && (
                  <div className="mb-2 p-2 bg-[#7C4DFF]/10 border border-[#7C4DFF]/30 rounded-xl text-xs text-gray-300">
                    <span className="text-[#7C4DFF] font-bold">Voice: </span>
                    "{micTranscript.slice(0, 80)}{micTranscript.length > 80 ? '…' : ''}"
                  </div>
                )}
                <textarea rows={2} value={threatInput} onChange={e => setThreatInput(e.target.value)}
                  placeholder={`Describe situation...\ne.g. "Someone is following me"`}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-[#FFC857] mb-2" />
                <div className="flex gap-2">
                  <button onClick={handleThreatAnalysis} disabled={analyzing || !threatInput.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-[#FFC857] text-black disabled:opacity-40 flex items-center justify-center gap-2">
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Analyze'}
                  </button>
                  {/* Mic button — VAD auto-stop */}
                  {(micState === 'listening' || micState === 'silence') ? (
                    <button onClick={stopMic}
                      title="Stop recording"
                      className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      style={{ background: micState === 'silence' ? '#FFC85722' : '#7C4DFF22', color: micState === 'silence' ? '#FFC857' : '#7C4DFF', border: `1px solid ${micState === 'silence' ? '#FFC85766' : '#7C4DFF66'}` }}>
                      {/* Mini waveform */}
                      <span className="flex gap-0.5 items-end h-4">
                        {[...Array(4)].map((_, i) => (
                          <span key={i} className="w-1 rounded-full transition-all duration-100"
                            style={{ height: `${Math.max(3, Math.round(audioLevel * 14 * (0.5 + Math.random() * 0.5)))}px`,
                              background: micState === 'silence' ? '#FFC857' : '#7C4DFF' }} />
                        ))}
                      </span>
                      {micState === 'silence' ? 'Finishing…' : 'Stop'}
                    </button>
                  ) : micState === 'processing' ? (
                    <button disabled className="px-4 py-2 rounded-xl text-sm bg-gray-700 text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </button>
                  ) : (
                    <button onClick={startMic}
                      title="Record voice"
                      className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 bg-[#7C4DFF]/20 border border-[#7C4DFF]/50 text-[#7C4DFF] hover:bg-[#7C4DFF]/30 transition-all">
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {threatResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className={`mt-3 p-3 rounded-xl border text-xs overflow-hidden ${
                        threatResult.risk_level === 'HIGH' ? 'border-[#FF3B5C]/50 bg-[#FF3B5C]/10' :
                        threatResult.risk_level === 'MEDIUM' ? 'border-[#FFC857]/50 bg-[#FFC857]/10' :
                        'border-[#00FF9D]/50 bg-[#00FF9D]/10'}`}>
                      <span className="font-bold" style={{ color: RISK_COLOR[threatResult.risk_level] }}>
                        {threatResult.risk_level}
                      </span>
                      {' — '}{threatResult.message}
                      {threatResult.auto_escalated && (
                        <div className="text-[#FFC857] mt-1 font-bold">
                          Auto-alerted {threatResult.escalation_result?.contacts_count ?? 0} contact(s)
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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

      {/* ── RIGHT PANEL: Map ────────────────────────────────────────────────── */}
      <div className="w-full md:w-3/5">
        <div className="glass rounded-3xl overflow-hidden h-[480px] md:h-full relative border transition-all duration-700"
          style={{ borderColor: `${borderColor}44` }}>
          <MapView
            source={src ? [src.lat, src.lon] : null}
            destination={dest ? [dest.lat, dest.lon] : null}
            routeCoordinates={(() => {
              const srcPt  = src  ? [src.lat,  src.lon]  : null;
              const dstPt  = dest ? [dest.lat, dest.lon] : null;
              if (step === STEP.TRACKING) {
                // Use waypoints from simulation (already bookended)
                return wayptsRef.current;
              }
              if (step === STEP.ROUTES && allRoutes[0]) {
                // Use intermediate waypoints from matched route, but ALWAYS
                // bookend with the actual selected src/dest coordinates
                const intermediates = (allRoutes[0].waypoints || [])
                  .map(w => [w.lat, w.lon])
                  .filter(c => c[0] != null);
                const pts = [
                  srcPt,
                  ...intermediates,
                  dstPt,
                ].filter(Boolean);
                return pts.length >= 2 ? pts : [srcPt, dstPt].filter(Boolean);
              }
              // INPUT step: just show src→dest straight line
              return srcPt && dstPt ? [srcPt, dstPt] : [];
            })()}
            altRoutes={
              step === STEP.ROUTES
                ? allRoutes.slice(1).map((r, i) => ({
                    coords: r.waypoints?.map(w => [w.lat, w.lon]) || [],
                    color: r._badge || '#888',
                    label: r._tag || `Option ${i + 2}`,
                  }))
                : []
            }
            currentPosition={currentPos}
            routeColor={routeColor}
            riskLevel={liveRisk}
            dangerZones={dangerZones}
            safetyAnchors={safetyAnchors}
            escapePoint={liveRisk === 'HIGH' ? escapePoint : null}
            escapeRoute={
              liveRisk === 'HIGH' && currentPos && escapePoint
                ? [[currentPos[0], currentPos[1]], [escapePoint.lat, escapePoint.lon]]
                : null
            }
            focusEscape={liveRisk === 'HIGH' && !!escapePoint}
          />
          {/* Radar ring during tracking */}
          {step === STEP.TRACKING && (
            <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
              <div className="w-[180%] h-[180%] rounded-full border animate-ping opacity-5"
                style={{ borderColor: RISK_COLOR[liveRisk] }} />
            </div>
          )}
          {/* Route info overlay during selection */}
          {step === STEP.ROUTES && allRoutes[0] && (
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
