// pages/Emergency.jsx — upgraded with mic recording + quick SOS + safety anchors
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Share2, ShieldAlert, Activity, Loader2,
  Search, UserPlus, Trash2, Check, Mic, MicOff,
  Square, MapPin, Zap
} from 'lucide-react';
import SOSButton from '../components/SOSButton';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  triggerEmergency, analyzeThreat, getContacts, addContact, deleteContact,
  analyzeVoice, quickSOS, getSafetyAnchors, getRecordingsForUser
} from '../services/api';
import clsx from 'clsx';

const RISK_COLOR = { HIGH: '#FF3B5C', MEDIUM: '#FFC857', LOW: '#00FF9D' };

export default function Emergency() {
  const [isAlerting, setIsAlerting]       = useState(false);
  const [threatText, setThreatText]       = useState('');
  const [analysis, setAnalysis]           = useState(null);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);
  const [contacts, setContacts]           = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact]       = useState({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true });
  const [addingContact, setAddingContact] = useState(false);
  const [userLocation, setUserLocation]   = useState({ lat: 28.6315, lon: 77.2167 });

  // ── Voice recorder state (hook-managed) ───────────────────────────────────
  const [transcript, setTranscript]       = useState('');
  const [micError, setMicError]           = useState('');

  // Emergency auto-recording state
  const [sosRecording, setSosRecording]   = useState(false);  // true while 30s SOS rec active
  const [sosTimer, setSosTimer]           = useState(0);      // countdown 30→0
  const [sosStatus, setSosStatus]         = useState('');     // status label
  const sosMediaRef  = useRef(null);
  const sosChunksRef = useRef([]);
  const sosTimerRef  = useRef(null);

  // Safety anchors
  const [anchors, setAnchors]             = useState(null);
  const [loadingAnchors, setLoadingAnchors] = useState(false);

  // Recordings
  const [recordings, setRecordings]       = useState([]);

  useEffect(() => {
    loadContacts();
    getRecordingsForUser(1, 5).then(r => { if (r?.success) setRecordings(r.recordings); });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserLocation(loc);
          loadAnchors(loc.lat, loc.lon);
        },
        () => loadAnchors(28.6315, 77.2167)
      );
    } else {
      loadAnchors(28.6315, 77.2167);
    }
  }, []);

  const loadContacts = async () => {
    const res = await getContacts(1);
    if (res?.success) setContacts(res.contacts);
  };

  const loadAnchors = async (lat, lon) => {
    setLoadingAnchors(true);
    setAnchors(null);  // clear stale data before each fetch
    try {
      const res = await getSafetyAnchors(lat, lon, 2000);
      if (res?.success && res.total_found > 0) {
        setAnchors(res);
      } else {
        // Widen and retry once
        const res2 = await getSafetyAnchors(lat, lon, 5000);
        setAnchors(res2?.success ? res2 : { success: true, anchors: {}, total_found: 0 });
      }
    } catch {
      setAnchors({ success: true, anchors: {}, total_found: 0 });
    } finally {
      setLoadingAnchors(false);
    }
  };

  // ── Auto emergency recording (30s) ─────────────────────────────────────────
  const startEmergencyRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      sosChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) sosChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setSosRecording(false);
        setSosStatus('Uploading & transcribing...');
        const blob = new Blob(sosChunksRef.current, { type: 'audio/webm' });
        const res  = await analyzeVoice(blob, { userId: 1, lat: userLocation.lat, lon: userLocation.lon });
        if (res.transcript) { setTranscript(res.transcript); setThreatText(res.transcript); }
        setAnalysis({
          risk_level: res.risk_level || 'HIGH',
          score: res.score ?? 80,
          message: res.message || 'SOS triggered — emergency contacts notified.',
          action_tips: res.action_tips || [],
          matched_keywords: [...(res.matched_keywords||[]), ...(res.panic_keywords||[])],
          auto_escalated: res.auto_escalated,
        });
        setSosStatus('Evidence saved');
        getRecordingsForUser(1, 5).then(r => { if (r?.success) setRecordings(r.recordings); });
      };
      mr.start();
      sosMediaRef.current = mr;
      setSosRecording(true);
      setSosTimer(30);
      setSosStatus('Emergency Recording Active');
      // countdown + auto-stop at 30s
      let t = 30;
      sosTimerRef.current = setInterval(() => {
        t -= 1;
        setSosTimer(t);
        if (t <= 0) { clearInterval(sosTimerRef.current); mr.stop(); }
      }, 1000);
    } catch { setSosStatus('Mic denied — recording skipped'); }
  };

  const handleSOS = async () => {
    setIsAlerting(true);
    // 1. Kick off auto-recording immediately (non-blocking)
    startEmergencyRecording();
    try {
      // 2. Trigger backend emergency + escalation
      const res = await triggerEmergency(userLocation.lat, userLocation.lon, 1, 'FeelSafe User', null, null, 'HIGH', 'SOS button pressed');
      setEscalationResult(res);
      if (res?.whatsapp_link) window.open(res.whatsapp_link, '_blank');
    } finally { setIsAlerting(false); }
  };

  const handleQuickSOS = async () => {
    setIsAlerting(true);
    try {
      const res = await quickSOS(userLocation.lat, userLocation.lon, 1, null, 'button');
      setEscalationResult(res);
      if (res?.whatsapp_link) window.open(res.whatsapp_link, '_blank');
    } finally { setIsAlerting(false); }
  };

  const handleAnalyzeThreat = async () => {
    if (!threatText.trim()) return;
    setIsAnalyzing(true); setAnalysis(null); setEscalationResult(null);
    const res = await analyzeThreat(threatText, userLocation.lat, userLocation.lon, 1, 'FeelSafe User');
    setAnalysis(res);
    if (res?.auto_escalated && res?.escalation_result) setEscalationResult(res.escalation_result);
    setIsAnalyzing(false);
  };

  // ── Microphone recording — VAD-powered auto-stop ─────────────────────────
  const processVoiceBlob = useCallback(async (blob) => {
    setMicError('');
    const res = await analyzeVoice(blob, { userId: 1, lat: userLocation.lat, lon: userLocation.lon });
    const tx = res.transcript || '';
    setTranscript(tx);
    if (tx) {
      setThreatText(tx);
      setIsAnalyzing(true);
      const threatRes = await analyzeThreat(tx, userLocation.lat, userLocation.lon, 1, 'FeelSafe User');
      setAnalysis(threatRes);
      if (threatRes?.risk_level === 'HIGH' || threatRes?.risk_level === 'MEDIUM') {
        if (threatRes?.auto_escalated && threatRes?.escalation_result) {
          setEscalationResult(threatRes.escalation_result);
        }
        if (threatRes?.risk_level === 'HIGH' && !threatRes?.auto_escalated) {
          const esc = await triggerEmergency(userLocation.lat, userLocation.lon, 1, 'FeelSafe User', null, null, 'HIGH', tx);
          setEscalationResult(esc);
          if (esc?.whatsapp_link) window.open(esc.whatsapp_link, '_blank');
        }
      }
      setIsAnalyzing(false);
    } else {
      setAnalysis({
        risk_level: res.risk_level || 'LOW', score: res.score ?? 0,
        message: res.message || 'No speech detected.',
        action_tips: res.action_tips || [],
        matched_keywords: [...(res.matched_keywords || []), ...(res.panic_keywords || [])],
        auto_escalated: res.auto_escalated,
      });
      if (res.auto_escalated && res.escalation_result) setEscalationResult(res.escalation_result);
    }
    getRecordingsForUser(1, 5).then(r => { if (r?.success) setRecordings(r.recordings); });
  }, [userLocation]);

  const { micState, audioLevel, startRecording, stopRecording } = useVoiceRecorder({
    onResult: processVoiceBlob,
  });




  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    setAddingContact(true);
    const res = await addContact(newContact.name, newContact.phone, newContact.relation, newContact.medium_alert_enabled, newContact.high_alert_enabled, 1);
    if (res?.success) { await loadContacts(); setNewContact({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true }); setShowAddContact(false); }
    setAddingContact(false);
  };

  const handleDeleteContact = async (id) => { await deleteContact(id); loadContacts(); };

  const riskLevel = analysis?.risk_level || 'LOW';
  const bgPulse   = riskLevel === 'HIGH';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center p-6 md:p-12">
      <div className={clsx('absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none', bgPulse ? 'bg-red-900/20 animate-pulse' : 'bg-transparent')} />
      <div className={clsx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-[150px] z-0 pointer-events-none transition-all duration-1000', bgPulse ? 'bg-[#FF3B5C] opacity-20' : 'bg-[#FF3B5C] opacity-10')} />

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">

        {/* ── LEFT: SOS + Contacts ── */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4 border border-[#FF3B5C]/50">
              <ShieldAlert className="w-10 h-10 text-[#FF3B5C]" />
            </motion.div>
            <h1 className="text-4xl font-black mb-1">EMERGENCY</h1>
            <p className="text-red-400 text-sm">Tap SOS to instantly alert contacts & authorities.</p>
          </div>

          {/* SOS Button */}
          <div className="relative flex justify-center">
            {isAlerting && <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 rounded-full"><Loader2 className="w-10 h-10 text-white animate-spin" /></div>}
            <SOSButton onClick={handleSOS} />
          </div>

          {/* SOS Recording Indicator */}
          <AnimatePresence>
            {(sosRecording || sosStatus) && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={clsx('w-full max-w-sm p-3 rounded-2xl border flex items-center gap-3',
                  sosRecording ? 'border-[#FF3B5C] bg-[#FF3B5C]/10' : 'border-gray-700 bg-black/40')}>
                {sosRecording ? (
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-3 h-3 rounded-full bg-[#FF3B5C] flex-shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-[#00FF9D] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">{sosStatus}</div>
                  {sosRecording && <div className="text-[10px] text-gray-400">Auto-stops in {sosTimer}s · uploading after</div>}
                </div>
                {sosRecording && (
                  <div className="text-sm font-black tabular-nums" style={{ color: '#FF3B5C' }}>{sosTimer}s</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick action grid */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <motion.a href="tel:112" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-4 rounded-2xl hover:border-[#FFC857] group">
              <div className="bg-[#FFC857]/20 p-3 rounded-full group-hover:bg-[#FFC857] transition-colors">
                <Phone className="w-5 h-5 text-[#FFC857] group-hover:text-black" />
              </div>
              <span className="font-bold text-sm">Call 112</span>
            </motion.a>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleQuickSOS}
              className="flex flex-col items-center gap-2 bg-[#FF3B5C]/10 border border-[#FF3B5C]/50 p-4 rounded-2xl hover:bg-[#FF3B5C]/20 group">
              <div className="bg-[#FF3B5C]/20 p-3 rounded-full">
                <Zap className="w-5 h-5 text-[#FF3B5C]" />
              </div>
              <span className="font-bold text-sm">Quick SOS</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { const link = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`; window.open(`https://wa.me/?text=${encodeURIComponent('HELP! ' + link)}`, '_blank'); }}
              className="flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-4 rounded-2xl hover:border-[#00E5FF] group">
              <div className="bg-[#00E5FF]/20 p-3 rounded-full group-hover:bg-[#00E5FF] transition-colors">
                <Share2 className="w-5 h-5 text-[#00E5FF] group-hover:text-black" />
              </div>
              <span className="font-bold text-sm">Share Live</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { if (loadingAnchors) return; loadAnchors(userLocation.lat, userLocation.lon); }}
              className="flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-4 rounded-2xl hover:border-[#00FF9D] group">
              <div className="bg-[#00FF9D]/20 p-3 rounded-full">
                <MapPin className="w-5 h-5 text-[#00FF9D]" />
              </div>
              <span className="font-bold text-sm">Find Safety</span>
            </motion.button>
          </div>

          {/* Escalation result */}
          <AnimatePresence>
            {escalationResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full glass p-4 rounded-2xl border border-[#FF3B5C]/40 bg-[#FF3B5C]/5">
                <div className="flex items-center gap-2 mb-2"><Check className="w-4 h-4 text-[#00FF9D]" /><span className="font-bold text-sm">Alert Sent!</span></div>
                <p className="text-xs text-gray-300 mb-2">{escalationResult.escalation_message || escalationResult.message}</p>
                <p className="text-xs text-[#FFC857]">{escalationResult.contacts_count ?? escalationResult.auto_contacts_notified?.length ?? 0} contact(s) notified automatically</p>
                {escalationResult.whatsapp_link && (
                  <a href={escalationResult.whatsapp_link} target="_blank" rel="noreferrer"
                    className="inline-block mt-2 text-xs bg-[#25D366] text-black px-3 py-1 rounded-full font-bold">
                    Open WhatsApp Alert
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Safety Anchors */}
          <AnimatePresence>
            {(loadingAnchors || anchors) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full glass p-4 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00FF9D]" />
                  <span className="text-[#00FF9D]">Nearby Safety</span>
                  {loadingAnchors && <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-auto" />}
                  {anchors && !loadingAnchors && (
                    <span className="ml-auto text-[10px] text-gray-500">{anchors.total_found} found</span>
                  )}
                </h3>
                {anchors && (
                  <div className="space-y-2">
                    {(['police','hospital','pharmacy','metro_station','public_safe_zone']).flatMap(type => {
                      const cfg = {
                        police:           { icon: '🚔', color: '#3B82F6', label: 'Police' },
                        hospital:         { icon: '🏥', color: '#EF4444', label: 'Hospital' },
                        pharmacy:         { icon: '💊', color: '#8B5CF6', label: 'Pharmacy' },
                        metro_station:    { icon: '🚇', color: '#F59E0B', label: 'Metro' },
                        public_safe_zone: { icon: '🛡', color: '#00FF9D', label: 'Safe Zone' },
                      }[type] || { icon: '📍', color: '#FFC857', label: type };
                      return (anchors.anchors?.[type] || []).slice(0, 2).map((item, i) => (
                        <div key={`${type}-${i}`}
                          className="p-2.5 bg-black/30 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{item.icon || cfg.icon}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{item.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                    style={{ background: `${cfg.color}22`, color: cfg.color }}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500">{item.distance_km} km</span>
                                  {item.open_24x7 && (
                                    <span className="text-[10px] text-[#00FF9D]">24/7</span>
                                  )}
                                </div>
                                {item.address && (
                                  <div className="text-[10px] text-gray-600 truncate mt-0.5">{item.address}</div>
                                )}
                              </div>
                            </div>
                            <a href={item.navigate_url || `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`}
                              target="_blank" rel="noreferrer"
                              className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                              style={{ background: '#00FF9D22', color: '#00FF9D', border: '1px solid #00FF9D44' }}
                              onMouseEnter={e => { e.target.style.background='#00FF9D'; e.target.style.color='#000'; }}
                              onMouseLeave={e => { e.target.style.background='#00FF9D22'; e.target.style.color='#00FF9D'; }}>
                              🧭 Go
                            </a>
                          </div>
                        </div>
                      ));
                    })}
                    {anchors.total_found === 0 && !loadingAnchors && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Searching wider area...
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* Emergency Contacts */}
          <div className="w-full glass p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm">Emergency Contacts ({contacts.length})</h3>
              <button onClick={() => setShowAddContact(v => !v)} className="flex items-center gap-1 text-xs text-[#00E5FF] hover:text-white">
                <UserPlus className="w-3 h-3" /> Add
              </button>
            </div>
            <AnimatePresence>
              {showAddContact && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                  <div className="space-y-2">
                    {['name', 'phone', 'relation'].map(f => (
                      <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                        value={newContact[f]} onChange={e => setNewContact(p => ({ ...p, [f]: e.target.value }))}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]" />
                    ))}
                    <div className="flex gap-2">
                      {[['medium_alert_enabled', 'MEDIUM'], ['high_alert_enabled', 'HIGH']].map(([key, label]) => (
                        <button key={key} onClick={() => setNewContact(p => ({ ...p, [key]: !p[key] }))}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${newContact[key] ? label === 'HIGH' ? 'bg-[#FF3B5C] border-[#FF3B5C] text-white' : 'bg-[#FFC857] border-[#FFC857] text-black' : 'bg-transparent border-gray-700 text-gray-500'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleAddContact} disabled={addingContact}
                      className="w-full py-2 bg-[#00E5FF] text-black rounded-lg text-sm font-bold disabled:opacity-50">
                      {addingContact ? 'Saving...' : 'Save Contact'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-2">
              {contacts.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No contacts yet.</p>}
              {contacts.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-black/30 rounded-xl border border-gray-800">
                  <div>
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.phone} · {c.relation}</div>
                    <div className="flex gap-1 mt-1">
                      {c.medium_alert_enabled ? <span className="text-[9px] bg-[#FFC857]/20 text-[#FFC857] px-1.5 py-0.5 rounded-full">MED</span> : null}
                      {c.high_alert_enabled ? <span className="text-[9px] bg-[#FF3B5C]/20 text-[#FF3B5C] px-1.5 py-0.5 rounded-full">HIGH</span> : null}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteContact(c.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Threat Analysis + Voice ── */}
        <div className="w-full space-y-6">

          {/* Voice Recorder */}
          <div className="glass p-5 rounded-3xl border border-[#7C4DFF]/40">
            <h2 className="text-lg font-black mb-1 flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#7C4DFF]" /> Voice Threat Analysis
            </h2>
            <p className="text-gray-400 text-xs mb-4">Speak — AI auto-stops when you're done & analyzes immediately</p>

            <div className="flex flex-col items-center gap-4">
              <AnimatePresence mode="wait">
                {(micState === 'listening' || micState === 'silence') ? (
                  <motion.div key="rec" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3 w-full">
                    {/* Animated waveform */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      {/* Outer glow ring */}
                      <motion.div className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: micState === 'silence' ? '#FFC857' : '#7C4DFF' }}
                        animate={{ scale: [1, 1 + audioLevel * 0.4, 1], opacity: [0.6, 0.9, 0.6] }}
                        transition={{ repeat: Infinity, duration: 0.4 }} />
                      {/* Inner fill */}
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: micState === 'silence' ? '#FFC85722' : '#7C4DFF22' }}>
                        <Mic className="w-7 h-7" style={{ color: micState === 'silence' ? '#FFC857' : '#7C4DFF' }} />
                      </div>
                      {/* Audio level bars */}
                      <div className="absolute bottom-[-18px] flex gap-0.5 items-end">
                        {[...Array(7)].map((_, i) => {
                          const h = Math.max(3, Math.round(audioLevel * 20 * (0.4 + Math.sin(i * 1.3 + Date.now() / 200) * 0.4)));
                          return <div key={i} className="w-1.5 rounded-full transition-all duration-75"
                            style={{ height: `${h}px`, background: micState === 'silence' ? '#FFC857' : '#7C4DFF' }} />;
                        })}
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-sm font-bold" style={{ color: micState === 'silence' ? '#FFC857' : '#7C4DFF' }}>
                        {micState === 'silence' ? 'Silence detected...' : 'Listening...'}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {micState === 'silence' ? 'Auto-stopping...' : 'Speak clearly — auto-stops when you finish'}
                      </div>
                    </div>
                    <button onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-gray-700 text-gray-300 rounded-xl text-xs hover:border-gray-500 transition-colors">
                      <Square className="w-3.5 h-3.5" /> Stop Manually
                    </button>
                  </motion.div>
                ) : micState === 'processing' ? (
                  <motion.div key="proc" className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-[#7C4DFF] animate-spin" />
                    <span className="text-xs text-gray-400">Transcribing with Whisper AI...</span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="flex flex-col items-center gap-3 w-full">
                    <button onClick={startRecording}
                      className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white flex items-center justify-center gap-2">
                      <Mic className="w-5 h-5" /> Start Voice Recording
                    </button>
                    {transcript && (
                      <div className="w-full p-3 bg-black/40 rounded-xl border border-gray-700 text-xs text-gray-300">
                        <span className="text-[#7C4DFF] font-bold block mb-1">Transcript:</span>
                        "{transcript}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {micError && <p className="text-xs text-[#FF3B5C]">{micError}</p>}
            </div>
          </div>

          {/* Text Threat Analysis */}
          <div className={clsx('glass p-6 rounded-3xl border transition-all duration-500',
            riskLevel === 'HIGH' ? 'border-[#FF3B5C]/80 shadow-[0_0_30px_rgba(255,59,92,0.25)]' : 'border-[#00E5FF]/30')}>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Activity className={clsx('w-6 h-6', riskLevel === 'HIGH' ? 'text-[#FF3B5C]' : 'text-[#00E5FF]')} />
              AI Threat Analysis
            </h2>
            <p className="text-gray-400 text-sm mb-4">Describe your situation. AI auto-alerts contacts if needed.</p>

            <div className="flex flex-col gap-3 mb-4">
              <textarea value={threatText} onChange={e => setThreatText(e.target.value)} rows={3}
                placeholder={'e.g. "Someone is following me on the street"'}
                className={clsx('w-full bg-black/50 border rounded-xl py-3 px-4 text-white focus:outline-none resize-none transition-colors',
                  riskLevel === 'HIGH' ? 'border-[#FF3B5C]/50 focus:border-[#FF3B5C]' : 'border-gray-700 focus:border-[#00E5FF]')} />
              <button onClick={handleAnalyzeThreat} disabled={isAnalyzing || !threatText.trim()}
                className={clsx('w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50',
                  riskLevel === 'HIGH' ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white' : 'bg-[#00E5FF] text-black')}>
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Search className="w-5 h-5" /> Analyze Threat</>}
              </button>
            </div>

            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={clsx('p-5 rounded-2xl border',
                    riskLevel === 'HIGH' ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]' :
                    riskLevel === 'MEDIUM' ? 'bg-[#FFC857]/10 border-[#FFC857]/50' :
                    'bg-[#00FF9D]/10 border-[#00FF9D]/50')}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <span className="text-sm text-gray-400 uppercase">Risk Level</span>
                    <span className={clsx('font-black text-2xl px-4 py-1 rounded-full uppercase',
                      riskLevel === 'HIGH' ? 'bg-[#FF3B5C] text-white animate-pulse' :
                      riskLevel === 'MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' : 'bg-[#00FF9D]/20 text-[#00FF9D]')}>
                      {riskLevel}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Threat Score</span>
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 bg-black/50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${analysis.score ?? 0}%` }}
                            className="h-full" style={{ background: RISK_COLOR[riskLevel] }} />
                        </div>
                        <span className="font-bold text-white w-6 text-right">{analysis.score ?? 0}</span>
                      </div>
                    </div>
                    {analysis.message && (
                      <div className="mt-2 pt-3 border-t border-white/10">
                        <span className="text-gray-400 text-xs block mb-1">AI Response</span>
                        <p className="text-sm text-white">{analysis.message}</p>
                      </div>
                    )}
                    {analysis.action_tips?.length > 0 && (
                      <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                        {analysis.action_tips.slice(0, 3).map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Emergency Evidence Panel */}
          <div className="glass p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#7C4DFF]" />
                <span className="text-[#7C4DFF]">Emergency Evidence</span>
              </h3>
              <button onClick={() => getRecordingsForUser(1, 10).then(r => { if (r?.success) setRecordings(r.recordings); })}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
                Refresh
              </button>
            </div>
            {recordings.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">No recordings yet — press SOS to auto-record</p>
            ) : (
              <div className="space-y-3">
                {recordings.slice(0, 5).map((rec, idx) => (
                  <div key={rec.id} className="p-3 bg-black/40 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-500 text-[10px] font-mono">#{idx + 1}</span>
                      <span className={clsx('text-[9px] font-bold px-2 py-0.5 rounded-full',
                        rec.threat_level === 'HIGH' ? 'bg-[#FF3B5C]/20 text-[#FF3B5C]' :
                        rec.threat_level === 'MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' :
                        'bg-[#00FF9D]/20 text-[#00FF9D]')}>
                        {rec.threat_level}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-auto">
                        {new Date(rec.recorded_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {rec.transcript ? (
                      <p className="text-xs text-gray-300 mb-2 italic">"{rec.transcript}"</p>
                    ) : (
                      <p className="text-xs text-gray-600 mb-2">No transcript available</p>
                    )}
                    {rec.audio_url && (
                      <audio controls src={rec.audio_url} className="w-full h-8 rounded" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
