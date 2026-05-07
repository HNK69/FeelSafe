// pages/Emergency.jsx - Upgraded: auto-escalation, real contacts, WhatsApp deep links
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Share2, ShieldAlert, Activity, Loader2, Search, UserPlus, Trash2, Check } from 'lucide-react';
import SOSButton from '../components/SOSButton';
import { triggerEmergency, analyzeThreat, getContacts, addContact, deleteContact } from '../services/api';
import clsx from 'clsx';

const RISK_COLOR = { HIGH: '#FF3B5C', MEDIUM: '#FFC857', LOW: '#00FF9D' };

export default function Emergency() {
  const [isAlerting, setIsAlerting] = useState(false);
  const [threatText, setThreatText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true });
  const [addingContact, setAddingContact] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 28.6315, lon: 77.2167 }); // default Delhi CP

  useEffect(() => {
    loadContacts();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const loadContacts = async () => {
    const res = await getContacts(1);
    if (res?.success) setContacts(res.contacts);
  };

  const handleSOS = async () => {
    setIsAlerting(true);
    try {
      const res = await triggerEmergency(
        userLocation.lat, userLocation.lon,
        1, 'FeelSafe User', null, null, 'HIGH', 'SOS button pressed'
      );
      setEscalationResult(res);
      if (res?.whatsapp_link) window.open(res.whatsapp_link, '_blank');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAlerting(false);
    }
  };

  const handleAnalyzeThreat = async () => {
    if (!threatText.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setEscalationResult(null);
    try {
      const res = await analyzeThreat(threatText, userLocation.lat, userLocation.lon, 1, 'FeelSafe User');
      setAnalysis(res);
      if (res?.auto_escalated && res?.escalation_result) {
        setEscalationResult(res.escalation_result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    setAddingContact(true);
    try {
      const res = await addContact(newContact.name, newContact.phone, newContact.relation,
        newContact.medium_alert_enabled, newContact.high_alert_enabled, 1);
      if (res?.success) {
        await loadContacts();
        setNewContact({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true });
        setShowAddContact(false);
      }
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (id) => {
    await deleteContact(id);
    loadContacts();
  };

  const riskLevel = analysis?.risk_level || 'LOW';
  const bgPulse   = riskLevel === 'HIGH';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center p-6 md:p-12">
      {/* Background */}
      <div className={clsx('absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none',
        bgPulse ? 'bg-red-900/20 animate-pulse' : 'bg-transparent')} />
      <div className={clsx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-[150px] z-0 pointer-events-none transition-all duration-1000',
        bgPulse ? 'bg-[#FF3B5C] opacity-20 animate-ping' : 'bg-[#FF3B5C] opacity-10')} />

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">

        {/* ── LEFT: SOS + Contacts ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4 border border-[#FF3B5C]/50">
              <ShieldAlert className="w-10 h-10 text-[#FF3B5C]" />
            </motion.div>
            <h1 className="text-4xl font-black mb-1">EMERGENCY</h1>
            <p className="text-red-400 text-sm">Tap SOS to instantly alert contacts & authorities.</p>
          </div>

          <div className="relative flex justify-center">
            {isAlerting && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 rounded-full">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
            <SOSButton onClick={handleSOS} />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            <motion.a href="tel:112" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-5 rounded-2xl hover:border-[#FFC857] group">
              <div className="bg-[#FFC857]/20 p-3 rounded-full group-hover:bg-[#FFC857] transition-colors">
                <Phone className="w-5 h-5 text-[#FFC857] group-hover:text-black" />
              </div>
              <span className="font-bold text-sm">Call 112</span>
            </motion.a>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                const link = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lon}`;
                const msg  = encodeURIComponent(`HELP! I need assistance. My location: ${link}`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              className="flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-5 rounded-2xl hover:border-[#00E5FF] group">
              <div className="bg-[#00E5FF]/20 p-3 rounded-full group-hover:bg-[#00E5FF] transition-colors">
                <Share2 className="w-5 h-5 text-[#00E5FF] group-hover:text-black" />
              </div>
              <span className="font-bold text-sm">Share Live</span>
            </motion.button>
          </div>

          {/* Auto-escalation result */}
          <AnimatePresence>
            {escalationResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full glass p-4 rounded-2xl border border-[#FF3B5C]/40 bg-[#FF3B5C]/5">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-[#00FF9D]" />
                  <span className="font-bold text-sm">Alert Sent!</span>
                </div>
                <p className="text-xs text-gray-300 mb-2">{escalationResult.escalation_message}</p>
                <p className="text-xs text-[#FFC857]">
                  {escalationResult.contacts_count} contact(s) notified automatically
                </p>
                {escalationResult.whatsapp_link && (
                  <a href={escalationResult.whatsapp_link} target="_blank" rel="noreferrer"
                    className="inline-block mt-2 text-xs bg-[#25D366] text-black px-3 py-1 rounded-full font-bold">
                    Open WhatsApp Alert
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emergency Contacts */}
          <div className="w-full glass p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm">Emergency Contacts ({contacts.length})</h3>
              <button onClick={() => setShowAddContact(v => !v)}
                className="flex items-center gap-1 text-xs text-[#00E5FF] hover:text-white">
                <UserPlus className="w-3 h-3" /> Add
              </button>
            </div>

            <AnimatePresence>
              {showAddContact && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                  <div className="space-y-2">
                    {['name', 'phone', 'relation'].map(f => (
                      <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                        value={newContact[f]} onChange={e => setNewContact(p => ({ ...p, [f]: e.target.value }))}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]" />
                    ))}
                    <div className="flex gap-2">
                      {[['medium_alert_enabled', 'MEDIUM'], ['high_alert_enabled', 'HIGH']].map(([key, label]) => (
                        <button key={key} onClick={() => setNewContact(p => ({ ...p, [key]: !p[key] }))}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            newContact[key]
                              ? label === 'HIGH' ? 'bg-[#FF3B5C] border-[#FF3B5C] text-white' : 'bg-[#FFC857] border-[#FFC857] text-black'
                              : 'bg-transparent border-gray-700 text-gray-500'}`}>
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

        {/* ── RIGHT: Threat Analysis ────────────────────────────────────────── */}
        <div className="w-full">
          <div className={clsx('glass p-6 rounded-3xl border transition-all duration-500',
            riskLevel === 'HIGH' ? 'border-[#FF3B5C]/80 shadow-[0_0_30px_rgba(255,59,92,0.25)]' : 'border-[#00E5FF]/30')}>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Activity className={clsx('w-6 h-6', riskLevel === 'HIGH' ? 'text-[#FF3B5C]' : 'text-[#00E5FF]')} />
              AI Threat Analysis
            </h2>
            <p className="text-gray-400 text-sm mb-5">Describe your situation. AI analyzes and auto-alerts contacts if needed.</p>

            <div className="flex flex-col gap-3 mb-5">
              <textarea value={threatText} onChange={e => setThreatText(e.target.value)} rows={4}
                placeholder={'Describe the situation...\ne.g. "Someone is following me on the street"'}
                className={clsx('w-full bg-black/50 border rounded-xl py-3 px-4 text-white focus:outline-none resize-none transition-colors',
                  riskLevel === 'HIGH' ? 'border-[#FF3B5C]/50 focus:border-[#FF3B5C]' : 'border-gray-700 focus:border-[#00E5FF]')} />
              <button onClick={handleAnalyzeThreat} disabled={isAnalyzing || !threatText.trim()}
                className={clsx('w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors',
                  riskLevel === 'HIGH' ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white' : 'bg-[#00E5FF] text-black hover:bg-[#00FF9D]')}>
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Search className="w-5 h-5" /> Analyze Threat</>}
              </button>
            </div>

            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={clsx('p-5 rounded-2xl border',
                    riskLevel === 'HIGH' ? 'bg-[#FF3B5C]/10 border-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.4)]' :
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
                    {analysis.auto_escalated && (
                      <div className="p-2 rounded-lg bg-[#FFC857]/10 border border-[#FFC857]/30 text-xs text-[#FFC857] font-bold">
                        Auto-escalated to {escalationResult?.contacts_count ?? 0} contact(s)
                      </div>
                    )}
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
        </div>
      </div>
    </div>
  );
}
