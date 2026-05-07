import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, Shield, TrendingUp, Users, Loader2, Wifi } from 'lucide-react';
import SafetyRating from '../components/SafetyRating';
import ThreatBox from '../components/ThreatBox';
import { THREAT_FEED_POOL, COMMUNITY_ALERTS_POOL, RECENT_TRIPS } from '../utils/constants';
import { checkHealth } from '../services/api';

// ── Animated counter hook ──
function useCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ── StatBox with animated counter ──
function StatBox({ icon, label, value, color, isString = false }) {
  const numericValue = isString ? 0 : parseInt(value);
  const animated = useCounter(isString ? 0 : numericValue);
  const displayValue = isString ? value : animated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/30 p-4 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center group hover:border-[color:var(--hc)] transition-all"
      style={{ '--hc': color }}
    >
      <div style={{ color }} className="mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{displayValue}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [apiStatus, setApiStatus]   = useState('checking');
  const [liveFeed, setLiveFeed]     = useState(() => THREAT_FEED_POOL.slice(0, 3));
  const [communityFeed, setCommunityFeed] = useState(() => COMMUNITY_ALERTS_POOL.slice(0, 3));
  const feedIndexRef = useRef(3);
  const communityRef = useRef(3);

  // Health check
  useEffect(() => {
    checkHealth()
      .then(res => setApiStatus(res.status === 'offline' ? 'offline' : 'online'))
      .catch(() => setApiStatus('offline'));
  }, []);

  // Rotate AI threat feed every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIdx = feedIndexRef.current % THREAT_FEED_POOL.length;
      const newItem = {
        ...THREAT_FEED_POOL[nextIdx],
        id:   Date.now(),
        time: 'Just now',
      };
      setLiveFeed(prev => [newItem, ...prev.slice(0, 2)]);
      feedIndexRef.current++;
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Rotate community alerts every 9 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const nextIdx = communityRef.current % COMMUNITY_ALERTS_POOL.length;
      const newItem = {
        ...COMMUNITY_ALERTS_POOL[nextIdx],
        id:   Date.now(),
        time: 'Just now',
      };
      setCommunityFeed(prev => [newItem, ...prev.slice(0, 2)]);
      communityRef.current++;
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#7C4DFF]" />
          <h1 className="text-3xl font-black">Safety Command Center</h1>
        </div>
        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 glass rounded-full border
          ${apiStatus === 'online' ? 'border-[#00FF9D]/40 text-[#00FF9D]' : apiStatus === 'offline' ? 'border-[#FF3B5C]/40 text-[#FF3B5C]' : 'border-gray-700 text-gray-400'}`}
        >
          {apiStatus === 'checking'
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</>
            : apiStatus === 'online'
            ? <><span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse" /> Backend ONLINE</>
            : <><span className="w-2 h-2 rounded-full bg-[#FF3B5C]" /> Backend OFFLINE</>
          }
        </div>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#00FF9D] rounded-full mix-blend-screen filter blur-[50px] opacity-10" />
          <h3 className="font-bold text-gray-400 mb-4">Your Safety Score</h3>
          <SafetyRating score={88} />
          <p className="text-sm text-[#00FF9D] mt-4 flex items-center gap-1 font-bold">
            <TrendingUp className="w-4 h-4" /> +5% this week
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border border-gray-800 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={<MapPin />}    label="Total Trips"      value="42"     color="#00E5FF" />
          <StatBox icon={<Activity />}  label="Threats Avoided"  value="7"      color="#FFC857" />
          <StatBox icon={<Users />}     label="Community Helps"  value="12"     color="#00FF9D" />
          <StatBox icon={<Shield />}    label="Trust Score"      value="Top 5%" color="#7C4DFF" isString />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Recent Trips */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-xl mb-5">Recent Trips</h3>
          <div className="space-y-3">
            {RECENT_TRIPS.map((trip) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-gray-800 hover:border-gray-600 transition-colors"
              >
                <div>
                  <div className="font-bold">{trip.to}</div>
                  <div className="text-xs text-gray-400">{trip.date}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${trip.score}%`,
                        backgroundColor: trip.score >= 90 ? '#00FF9D' : trip.score >= 75 ? '#FFC857' : '#FF3B5C'
                      }}
                    />
                  </div>
                  <span className={`font-black text-sm ${trip.score >= 90 ? 'text-[#00FF9D]' : 'text-[#FFC857]'}`}>
                    {trip.score}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Intel Feed */}
        <div className="glass p-6 rounded-3xl border border-[#7C4DFF]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[50px] opacity-10" />
          <h3 className="font-bold text-xl mb-5 flex items-center gap-2 relative z-10">
            <Activity className="w-5 h-5 text-[#00E5FF]" />
            Live Intel Feed
            <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#FF3B5C] bg-[#FF3B5C]/10 px-2 py-0.5 rounded-full border border-[#FF3B5C]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-pulse" />
              LIVE
            </span>
          </h3>

          <div className="space-y-5 relative z-10">
            {/* AI Threat section */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wifi className="w-3 h-3" /> AI Threat Signals
              </div>
              <AnimatePresence mode="popLayout">
                {liveFeed.map(threat => (
                  <ThreatBox key={threat.id} threat={threat} />
                ))}
              </AnimatePresence>
            </div>

            {/* Community section */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Community Reports</div>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {communityFeed.map(alert => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-black/40 rounded-xl border border-gray-800 text-sm backdrop-blur-md"
                    >
                      <span className="text-[#00E5FF] font-bold">{alert.area}:</span> {alert.issue}
                      <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
