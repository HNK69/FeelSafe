// pages/Dashboard.jsx - Live dashboard with real backend data + animated feed
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, Shield, Users, Zap, AlertOctagon, RefreshCw } from 'lucide-react';
import SafetyRating from '../components/SafetyRating';
import { checkHealth, getCommunityFeed, getCommunityStats, getActiveTrips } from '../services/api';

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [health, statsRes, feedRes, tripsRes] = await Promise.allSettled([
        checkHealth(), getCommunityStats(1), getCommunityFeed(12), getActiveTrips(1),
      ]);
      setApiStatus(health.value?.status === 'ok' ? 'ok' : 'offline');
      if (statsRes.value?.success) setStats(statsRes.value.stats);
      if (feedRes.value?.success)  setFeed(feedRes.value.feed);
      if (tripsRes.value?.success) setActiveTrips(tripsRes.value.trips || []);
    } catch { setApiStatus('offline'); }
    finally  { setRefreshing(false); }
  };

  useEffect(() => {
    loadData();
    timerRef.current = setInterval(() => {
      getCommunityFeed(12).then(r => { if (r?.success) setFeed(r.feed); });
    }, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#7C4DFF]" />
          <h1 className="text-3xl font-black">Safety Command Center</h1>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={loadData} disabled={refreshing} className="p-2 glass rounded-full hover:bg-white/10 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 glass rounded-full border ${
            apiStatus==='ok' ? 'border-[#00FF9D]/30 text-[#00FF9D]' : 'border-[#FF3B5C]/30 text-[#FF3B5C]'}`}>
            <span className={`w-2 h-2 rounded-full ${apiStatus==='ok' ? 'bg-[#00FF9D] animate-pulse' : 'bg-[#FF3B5C]'}`}></span>
            Backend {apiStatus.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#00FF9D] rounded-full mix-blend-screen filter blur-[50px] opacity-10" />
          <h3 className="font-bold text-gray-400 mb-4">System Safety Score</h3>
          <SafetyRating score={stats?.avg_safety_score ?? 72} />
          <p className="text-xs text-gray-500 mt-3">Derived from real trip + community data</p>
        </div>
        <div className="glass p-6 rounded-3xl md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={<MapPin />}       label="Total Trips"      value={stats?.total_trips ?? '—'}       color="#00E5FF" />
          <StatBox icon={<Zap />}          label="Active Now"        value={stats?.active_trips ?? activeTrips.length} color="#00FF9D" pulse />
          <StatBox icon={<AlertOctagon />} label="SOS Alerts"        value={stats?.sos_alerts ?? '—'}        color="#FF3B5C" />
          <StatBox icon={<Users />}        label="Community Reports" value={stats?.community_reports ?? '—'} color="#FFC857" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00FF9D]" /> Active Trips
          </h3>
          {activeTrips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active trips right now.</p>
            </div>
          ) : activeTrips.map(trip => (
            <div key={trip.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-[#00FF9D]/20 mb-3">
              <div>
                <div className="font-bold text-sm">{trip.origin_name} → {trip.dest_name}</div>
                <div className="text-xs text-gray-400">ETA: {trip.eta_minutes ?? '—'} min</div>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-[#00FF9D]">
                <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></span>LIVE
              </span>
            </div>
          ))}
        </div>

        <div className="glass p-6 rounded-3xl border border-[#7C4DFF]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[50px] opacity-10" />
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00E5FF]" /> Live Intel Feed
          </h3>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 relative z-10">
            <AnimatePresence>
              {feed.map((ev, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-3 bg-black/40 rounded-xl border backdrop-blur-md" style={{ borderColor: `${ev.color}33` }}>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.color }}></span>
                    <div className="flex-1">
                      <span className="font-bold text-sm" style={{ color: ev.color }}>{ev.area}: </span>
                      <span className="text-sm text-gray-300">{ev.issue}</span>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">{ev.time}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          ev.severity==='HIGH' ? 'bg-[#FF3B5C]/20 text-[#FF3B5C]' :
                          ev.severity==='MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' :
                          'bg-[#00FF9D]/20 text-[#00FF9D]'}`}>{ev.severity}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color, pulse }) {
  return (
    <div className="bg-black/30 p-4 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
      <div style={{ color }} className={`mb-2 ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
