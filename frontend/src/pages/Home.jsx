// pages/Home.jsx
// Pulls real stats from backend — no fake counters
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Bell, Zap, Map, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCommunityStats } from '../services/api';

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getCommunityStats(1).then(r => { if (r?.success) setStats(r.stats); });
  }, []);

  return (
    <div className="min-h-screen px-6 pt-10 pb-24 md:px-20 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center mt-10 md:mt-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-[#00E5FF]/30 text-[#00E5FF] mb-8 text-sm font-medium">
          <Shield className="w-4 h-4" />
          <span>AI-Powered Personal Safety</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          Your AI Companion For <br />
          <span className="text-gradient">Safer Journeys</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Real-time threat detection, community intelligence, and smart routing —
          so you reach home safely, every time.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/start-trip"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00E5FF] to-[#00FF9D] text-[#0B1020] rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform neon-glow shadow-lg">
            Start Safe Trip <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/safe-route"
            className="w-full sm:w-auto px-8 py-4 glass border border-gray-600 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
            <Users className="w-5 h-5 text-[#7C4DFF]" /> Community Intelligence
          </Link>
        </motion.div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
        <FeatureCard icon={<Bell className="w-8 h-8 text-[#FFC857]" />}
          title="Live AI Threat Detection"
          desc="Describes your situation in natural language. AI instantly classifies risk and alerts your emergency contacts automatically."
          delay={0.4} />
        <FeatureCard icon={<Map className="w-8 h-8 text-[#00E5FF]" />}
          title="SafeRoute AI"
          desc="See the safest, fastest, and alternative routes — each scored with AI reasoning, police coverage, and community ratings."
          delay={0.5} />
        <FeatureCard icon={<Zap className="w-8 h-8 text-[#7C4DFF]" />}
          title="Auto Escalation"
          desc="MEDIUM or HIGH risk detected? Contacts are notified via WhatsApp instantly — no button press needed."
          delay={0.6} />
      </div>

      {/* Trust Section — REAL stats */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mt-32 text-center">
        <div className="glass rounded-3xl p-10 max-w-4xl mx-auto border border-[#00E5FF]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[100px] opacity-20" />
          <h2 className="text-3xl font-bold mb-2">Community Safety in Numbers</h2>
          <p className="text-gray-400 text-sm mb-8">Live data from FeelSafe database</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value={stats?.total_trips ?? '—'}      label="Total Trips" live />
            <Stat value={stats?.active_trips ?? '—'}     label="Active Now" live pulse />
            <Stat value={stats?.sos_alerts ?? '—'}       label="SOS Alerts" live />
            <Stat value={stats?.community_reports ?? '—'} label="Safety Reports" live />
          </div>
          {!stats && (
            <p className="text-xs text-gray-600 mt-4">
              Start the backend (<code>python app.py</code>) to see live stats
            </p>
          )}
        </div>
      </motion.div>

      {/* CTA Flow */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="mt-20 text-center">
        <h2 className="text-2xl font-bold text-gray-300 mb-6">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
          {[
            ['1', 'Enter destination', '#00E5FF'],
            ['2', 'AI picks safest route', '#7C4DFF'],
            ['3', 'Trip monitored live', '#FFC857'],
            ['4', 'Rate & help community', '#00FF9D'],
          ].map(([num, label, color], i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="glass p-4 rounded-2xl border border-gray-800 text-center min-w-[120px]">
                <div className="text-2xl font-black mb-1" style={{ color }}>{num}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
              {i < 3 && <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block flex-shrink-0" />}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay }}
      className="glass p-8 rounded-3xl border border-gray-800 hover:border-[#00E5FF]/50 transition-colors group">
      <div className="bg-black/30 p-4 rounded-2xl w-max mb-6 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function Stat({ value, label, live, pulse }) {
  return (
    <div>
      <div className={`text-4xl font-black text-white mb-2 text-gradient ${pulse ? 'animate-pulse' : ''}`}>
        {value}
      </div>
      <div className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse"></span>}
        {label}
      </div>
    </div>
  );
}
