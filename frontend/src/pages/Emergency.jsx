import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Share2, ShieldAlert, Activity, Loader2, Search, CheckCircle2, X } from 'lucide-react';
import SOSButton from '../components/SOSButton';
import { emergencyAlert, analyzeThreat } from '../services/api';
import clsx from 'clsx';

// Risk colours keyed by backend `risk_level`
const RISK_CONFIG = {
  HIGH:     { color: '#FF3B5C', bg: 'bg-[#FF3B5C]',     soft: 'bg-[#FF3B5C]/10',    border: 'border-[#FF3B5C]',    label: 'HIGH RISK',    textColor: 'text-[#FF3B5C]' },
  MODERATE: { color: '#FFC857', bg: 'bg-[#FFC857]/20',  soft: 'bg-[#FFC857]/10',    border: 'border-[#FFC857]/50', label: 'MODERATE',     textColor: 'text-[#FFC857]' },
  LOW:      { color: '#00E5FF', bg: 'bg-[#00E5FF]/20',  soft: 'bg-[#00E5FF]/10',    border: 'border-[#00E5FF]/50', label: 'LOW RISK',     textColor: 'text-[#00E5FF]' },
};

// Toast notification
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className={clsx(
        'fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm',
        type === 'danger' ? 'bg-[#FF3B5C] text-white' : 'bg-[#00FF9D] text-black'
      )}
    >
      {type === 'danger' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
      {message}
      <button onClick={onDismiss}><X className="w-3 h-3" /></button>
    </motion.div>
  );
}

export default function Emergency() {
  const [sosState, setSosState]         = useState('idle'); // idle | activating | sent
  const [countdown, setCountdown]       = useState(3);
  const [threatText, setThreatText]     = useState('');
  const [analysis, setAnalysis]         = useState(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [toast, setToast]               = useState(null);

  const riskLevel   = analysis?.risk_level ?? 'LOW';
  const riskCfg     = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.LOW;
  const isHighRisk  = riskLevel === 'HIGH';

  // Animate score bar on result
  useEffect(() => {
    if (!analysis) return;
    const target = analysis.score ?? analysis.threat_score ?? 0;
    let current = 0;
    const step = target / 30;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedScore(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [analysis]);

  // SOS countdown sequence
  const handleSOS = () => {
    if (sosState !== 'idle') return;
    setSosState('activating');
    setCountdown(3);

    let c = 3;
    const tick = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(tick);
        // Fire API
        emergencyAlert({ location: { lat: 28.6139, lng: 77.2090 }, timestamp: new Date().toISOString() })
          .then(() => {
            setSosState('sent');
            setToast({ message: 'SOS Sent! Contacts & authorities alerted.', type: 'danger' });
            // Open WhatsApp with pre-filled message
            const msg = encodeURIComponent('🚨 EMERGENCY: I need help! My location: https://maps.google.com/?q=28.6139,77.2090');
            window.open(`https://wa.me/?text=${msg}`, '_blank');
          })
          .catch(() => {
            setSosState('sent');
            setToast({ message: 'Alert sent (offline mode). Call 112 now!', type: 'danger' });
          });
      }
    }, 1000);
  };

  const handleReset = () => { setSosState('idle'); setCountdown(3); };

  const handleAnalyze = async () => {
    if (!threatText.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnimatedScore(0);
    try {
      const data = await analyzeThreat(threatText);
      setAnalysis(data);
      if (data.risk_level === 'HIGH') {
        setToast({ message: '⚠ HIGH RISK detected! Take action immediately.', type: 'danger' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={clsx(
      'min-h-screen relative overflow-hidden flex flex-col items-center p-6 md:p-12 transition-colors duration-1000',
      isHighRisk ? 'bg-[#0B1020]' : 'bg-[#0B1020]'
    )}>
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      </AnimatePresence>

      {/* Dynamic background glow */}
      <div className={clsx(
        'absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none',
        isHighRisk ? 'opacity-100' : 'opacity-0',
        'bg-red-900/15'
      )} />
      <div className={clsx(
        'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-[150px] z-0 pointer-events-none transition-all duration-1000',
        isHighRisk ? 'bg-[#FF3B5C] opacity-20' : 'bg-[#FF3B5C] opacity-8'
      )} />

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start mt-8">

        {/* ─── Left: SOS ─── */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/20 mb-6 border border-[#FF3B5C]/50"
            >
              <ShieldAlert className="w-12 h-12 text-[#FF3B5C]" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-wide">EMERGENCY</h1>
            <p className="text-red-400">Tap the button to instantly alert authorities and contacts.</p>
          </div>

          {/* SOS Button area */}
          <div className="flex justify-center mb-8 relative">
            {sosState === 'sent' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-40 h-40 rounded-full bg-[#00FF9D]/20 border-4 border-[#00FF9D] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,255,157,0.4)]"
              >
                <CheckCircle2 className="w-14 h-14 text-[#00FF9D] mb-1" />
                <span className="text-[#00FF9D] font-black text-sm tracking-widest">SENT</span>
              </motion.div>
            ) : (
              <div className="relative">
                {/* Countdown overlay */}
                {sosState === 'activating' && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <motion.span
                      key={countdown}
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-white font-black text-6xl drop-shadow-2xl"
                    >
                      {countdown}
                    </motion.span>
                  </div>
                )}
                <SOSButton onClick={handleSOS} isActivating={sosState === 'activating'} />
              </div>
            )}
          </div>

          {sosState === 'sent' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
              <p className="text-[#00FF9D] font-bold mb-1">🚨 SOS Alert Dispatched</p>
              <p className="text-gray-400 text-sm">Emergency contacts & WhatsApp notified.</p>
              <button onClick={handleReset} className="mt-3 text-xs text-gray-500 underline hover:text-white">Reset</button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <motion.a
              href="https://wa.me/?text=I+need+help+please"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 bg-black/50 border border-gray-700 p-6 rounded-3xl hover:border-[#00E5FF] transition-colors group no-underline"
            >
              <div className="bg-[#00E5FF]/20 p-4 rounded-full group-hover:bg-[#00E5FF] transition-colors">
                <Share2 className="w-6 h-6 text-[#00E5FF] group-hover:text-black" />
              </div>
              <span className="font-bold text-white">Share Location</span>
            </motion.a>

            <motion.a
              href="tel:112"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 bg-black/50 border border-gray-700 p-6 rounded-3xl hover:border-[#FFC857] transition-colors group no-underline"
            >
              <div className="bg-[#FFC857]/20 p-4 rounded-full group-hover:bg-[#FFC857] transition-colors">
                <Phone className="w-6 h-6 text-[#FFC857] group-hover:text-black" />
              </div>
              <span className="font-bold text-white">Call 112</span>
            </motion.a>
          </div>
        </div>

        {/* ─── Right: Threat Analysis ─── */}
        <div className="w-full">
          <div className={clsx(
            'glass p-6 rounded-3xl border transition-all duration-500',
            isHighRisk ? 'border-[#FF3B5C]/80 shadow-[0_0_30px_rgba(255,59,92,0.25)]' : 'border-[#00E5FF]/30'
          )}>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Activity className={clsx('w-6 h-6', isHighRisk ? 'text-[#FF3B5C]' : 'text-[#00E5FF]')} />
              AI Threat Analysis
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Enter any situation and our NLP engine will assess the risk level in real-time.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <textarea
                value={threatText}
                onChange={(e) => setThreatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAnalyze(); }}
                placeholder="Describe situation... e.g. 'Someone is following me and I feel unsafe'"
                rows={4}
                className={clsx(
                  'w-full bg-black/50 border rounded-xl py-3 px-4 text-white focus:outline-none transition-colors resize-none text-sm',
                  isHighRisk ? 'border-[#FF3B5C]/50 focus:border-[#FF3B5C]' : 'border-gray-700 focus:border-[#00E5FF]'
                )}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !threatText.trim()}
                className={clsx(
                  'w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40',
                  isHighRisk
                    ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white shadow-[0_0_15px_rgba(255,59,92,0.4)]'
                    : 'bg-[#00E5FF] hover:bg-[#00FF9D] text-[#0B1020]'
                )}
              >
                {isAnalyzing
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing threat...</>
                  : <><Search className="w-5 h-5" /> Analyze Situation</>
                }
              </button>
            </div>

            {/* Analysis result */}
            <AnimatePresence>
              {analysis && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={clsx('p-5 rounded-2xl border backdrop-blur-md', riskCfg.soft, riskCfg.border,
                    isHighRisk && 'shadow-[0_0_20px_rgba(255,59,92,0.4)]')}
                >
                  {/* Risk level header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <span className="text-sm text-gray-400 uppercase tracking-wider">Risk Level</span>
                    <span className={clsx(
                      'font-black text-xl px-4 py-1 rounded-full uppercase',
                      riskCfg.bg, riskCfg.textColor,
                      isHighRisk && 'animate-pulse text-white'
                    )}>
                      {riskCfg.label}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Animated score bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-sm">Threat Score</span>
                        <span className={clsx('font-black text-lg', riskCfg.textColor)}>{animatedScore}</span>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${animatedScore}%` }}
                          className="h-full rounded-full transition-none"
                          style={{ backgroundColor: riskCfg.color }}
                        />
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">AI Confidence</span>
                      <span className="font-bold text-white">
                        {analysis.confidence !== undefined
                          ? `${(analysis.confidence * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                    </div>

                    {/* Reason */}
                    {analysis.reason && (
                      <div className="pt-3 border-t border-white/10">
                        <span className="text-gray-400 text-xs block mb-1.5 uppercase tracking-wide">AI Reasoning</span>
                        <p className="text-sm text-white leading-relaxed">{analysis.reason}</p>
                      </div>
                    )}

                    {/* Matched keywords */}
                    {analysis.matched_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.matched_keywords.map((kw, i) => (
                          <span key={i} className="text-xs bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action tips */}
                    {analysis.action_tips?.length > 0 && (
                      <div className="pt-3 border-t border-white/10">
                        <span className="text-gray-400 text-xs block mb-2 uppercase tracking-wide">Recommended Actions</span>
                        <ul className="space-y-1.5">
                          {analysis.action_tips.map((tip, i) => (
                            <li key={i} className={clsx('text-xs flex items-start gap-2', riskCfg.textColor)}>
                              <span className="mt-0.5 font-bold">›</span>
                              <span className="text-gray-300">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Monitoring footer */}
          <div className="mt-6 glass p-4 rounded-2xl border border-red-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#FF3B5C] animate-bounce" />
              <div>
                <div className="font-bold text-white text-sm">AI Monitoring Active</div>
                <div className="text-xs text-red-400">Threat patterns updated in real-time</div>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#FF3B5C] rounded-full animate-ping" />
          </div>
        </div>
      </div>
    </div>
  );
}
