import { useState, useEffect } from 'react';
import { Activity, MapPin, Shield, TrendingUp, Users, Loader2 } from 'lucide-react';
import SafetyRating from '../components/SafetyRating';
import ThreatBox from '../components/ThreatBox';
import { THREAT_FEED, COMMUNITY_ALERTS, RECENT_TRIPS } from '../utils/constants';
import { checkHealth } from '../services/api';

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState('Checking...');

  useEffect(() => {
    checkHealth().then(res => setApiStatus(res.status)).catch(() => setApiStatus('offline'));
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#7C4DFF]" />
          <h1 className="text-3xl font-black">Safety Command Center</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 glass rounded-full border border-gray-700">
          Backend: 
          <span className={apiStatus === 'offline' ? "text-[#FF3B5C]" : "text-[#00FF9D]"}>
            {apiStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#00FF9D] rounded-full mix-blend-screen filter blur-[50px] opacity-10"></div>
          <h3 className="font-bold text-gray-400 mb-4">Your Average Safety</h3>
          <SafetyRating score={88} />
          <p className="text-sm text-[#00FF9D] mt-4 flex items-center gap-1 font-bold">
            <TrendingUp className="w-4 h-4" /> +5% this week
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border border-gray-800 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatBox icon={<MapPin />} label="Total Trips" value="42" color="#00E5FF" />
           <StatBox icon={<Activity />} label="Threats Avoided" value="7" color="#FFC857" />
           <StatBox icon={<Users />} label="Community Helps" value="12" color="#00FF9D" />
           <StatBox icon={<Shield />} label="Trust Score" value="Top 5%" color="#7C4DFF" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-xl mb-6">Recent Trips</h3>
          <div className="space-y-4">
            {RECENT_TRIPS.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-gray-800 hover:border-gray-600 transition-colors">
                <div>
                  <div className="font-bold">{trip.to}</div>
                  <div className="text-xs text-gray-400">{trip.date}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Score</span>
                  <span className={`font-black ${trip.score >= 90 ? 'text-[#00FF9D]' : 'text-[#FFC857]'}`}>
                    {trip.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-[#7C4DFF]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[50px] opacity-10"></div>
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00E5FF]" />
            Live Intel Feed
          </h3>
          
          <div className="space-y-6 relative z-10">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">AI Threats</div>
              {THREAT_FEED.map(threat => <ThreatBox key={threat.id} threat={threat} />)}
            </div>
            
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 mt-6">Community Reports</div>
              <div className="space-y-3">
                {COMMUNITY_ALERTS.map(alert => (
                  <div key={alert.id} className="p-3 bg-black/40 rounded-xl border border-gray-800 text-sm backdrop-blur-md">
                    <span className="text-[#00E5FF] font-bold">{alert.area}:</span> {alert.issue}
                    <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div className="bg-black/30 p-4 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center group hover:border-[color:var(--hover-color)] transition-colors" style={{'--hover-color': color}}>
      <div style={{color}} className="mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
