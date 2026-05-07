import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Share2, ShieldAlert, Activity, Loader2, Search } from 'lucide-react';
import SOSButton from '../components/SOSButton';
import { emergencyAlert, analyzeThreat } from '../services/api';
import clsx from 'clsx';

export default function Emergency() {
  const [isAlerting, setIsAlerting] = useState(false);
  const [threatText, setThreatText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSOS = async () => {
    setIsAlerting(true);
    try {
      await emergencyAlert({
        location: { lat: 20.5937, lng: 78.9629 }, // Default India
        timestamp: new Date().toISOString()
      });
      alert('SOS Triggered! Emergency contacts & authorities notified.');
    } catch (err) {
      alert('Failed to send SOS, please dial emergency services manually.');
    } finally {
      setIsAlerting(false);
    }
  };

  const handleTestThreat = async () => {
    if (!threatText.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const data = await analyzeThreat(threatText);
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] relative overflow-hidden flex flex-col items-center p-6 md:p-12">
      {/* Dynamic Background Alert Effects based on Threat Analysis */}
      <div className={clsx(
        "absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none",
        analysis?.risk_level === 'High' ? 'bg-red-900/20 animate-pulse' : 'bg-transparent'
      )}></div>
      
      <div className={clsx(
        "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-[150px] z-0 pointer-events-none transition-all duration-1000",
        analysis?.risk_level === 'High' ? 'bg-[#FF3B5C] opacity-30 animate-ping' : 'bg-[#FF3B5C] opacity-10'
      )}></div>

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start mt-8">
        
        {/* Left Col: SOS */}
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

          <div className="flex justify-center mb-16 relative">
             {isAlerting && (
               <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 rounded-full">
                 <Loader2 className="w-12 h-12 text-white animate-spin" />
               </div>
             )}
            <SOSButton onClick={handleSOS} />
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 bg-black/50 border border-gray-700 p-6 rounded-3xl hover:border-[#00E5FF] transition-colors group"
            >
              <div className="bg-[#00E5FF]/20 p-4 rounded-full group-hover:bg-[#00E5FF] transition-colors">
                <Share2 className="w-6 h-6 text-[#00E5FF] group-hover:text-black" />
              </div>
              <span className="font-bold">Share Location</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 bg-black/50 border border-gray-700 p-6 rounded-3xl hover:border-[#FFC857] transition-colors group"
            >
              <div className="bg-[#FFC857]/20 p-4 rounded-full group-hover:bg-[#FFC857] transition-colors">
                <Phone className="w-6 h-6 text-[#FFC857] group-hover:text-black" />
              </div>
              <span className="font-bold">Call Police</span>
            </motion.button>
          </div>
        </div>

        {/* Right Col: Threat Analysis Panel */}
        <div className="w-full">
          <div className={clsx(
            "glass p-6 rounded-3xl border transition-colors duration-500",
            analysis?.risk_level === 'High' ? "border-[#FF3B5C]/80 shadow-[0_0_30px_rgba(255,59,92,0.3)]" : "border-[#00E5FF]/30"
          )}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Activity className={clsx("w-6 h-6", analysis?.risk_level === 'High' ? "text-[#FF3B5C]" : "text-[#00E5FF]")} />
              AI Threat Analysis
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Test the Natural Language Threat Analyzer API. Enter a situation (e.g. "HELP ME SOMEONE IS FOLLOWING ME")
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <textarea 
                value={threatText}
                onChange={(e) => setThreatText(e.target.value)}
                placeholder="Describe situation in detail... (multiline supported)"
                rows={4}
                className={clsx(
                  "w-full bg-black/50 border rounded-xl py-3 px-4 text-white focus:outline-none transition-colors resize-none",
                  analysis?.risk_level === 'High' ? "border-[#FF3B5C]/50 focus:border-[#FF3B5C]" : "border-gray-700 focus:border-[#00E5FF]"
                )}
              />
              <button 
                onClick={handleTestThreat}
                disabled={isAnalyzing || !threatText.trim()}
                className={clsx(
                  "w-full text-black py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50",
                  analysis?.risk_level === 'High' ? "bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white" : "bg-[#00E5FF] hover:bg-[#00FF9D]"
                )}
              >
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Threat...</> : <><Search className="w-5 h-5" /> Analyze</>}
              </button>
            </div>

            {analysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "p-5 rounded-2xl border backdrop-blur-md",
                  analysis.risk_level === 'High' ? "bg-[#FF3B5C]/10 border-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.5)]" : 
                  analysis.risk_level === 'Moderate' ? "bg-[#FFC857]/10 border-[#FFC857]/50" : 
                  "bg-[#00E5FF]/10 border-[#00E5FF]/50"
                )}
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <span className="text-sm text-gray-400 uppercase tracking-wider">Risk Level</span>
                  <span className={clsx(
                    "font-black text-2xl px-4 py-1 rounded-full uppercase",
                    analysis.risk_level === 'High' ? "bg-[#FF3B5C] text-white animate-pulse" : 
                    analysis.risk_level === 'Moderate' ? "bg-[#FFC857]/20 text-[#FFC857]" : 
                    "bg-[#00E5FF]/20 text-[#00E5FF]"
                  )}>
                    {analysis.risk_level}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Threat Score</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${analysis.threat_score}%` }}
                          className={clsx("h-full", analysis.risk_level === 'High' ? 'bg-[#FF3B5C]' : 'bg-[#00E5FF]')}
                        />
                      </div>
                      <span className="font-bold text-white w-8 text-right">{analysis.threat_score}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Confidence</span>
                    <span className="font-bold text-white">{(analysis.confidence * 100).toFixed(0)}%</span>
                  </div>

                  {analysis.explanation && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <span className="text-gray-400 text-xs block mb-1">AI Reasoning</span>
                      <p className="text-sm text-white leading-relaxed">{analysis.explanation}</p>
                    </div>
                  )}

                  {analysis.categories && analysis.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analysis.categories.map((c, i) => (
                        <span key={i} className="text-xs font-bold text-[#FFC857] bg-[#FFC857]/10 px-2 py-1 rounded-md border border-[#FFC857]/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-8 glass p-4 rounded-2xl border border-red-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-[#FF3B5C] animate-bounce" />
              <div>
                <div className="font-bold text-white text-sm">Fake Monitoring Active</div>
                <div className="text-xs text-red-400">Audio & Location being recorded</div>
              </div>
            </div>
            <div className="w-3 h-3 bg-[#FF3B5C] rounded-full animate-ping"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
