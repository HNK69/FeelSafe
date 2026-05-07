import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Play, UserPlus } from 'lucide-react';
import MapView from '../components/MapView';
import ThreatBox from '../components/ThreatBox';

export default function StartTrip() {
  const [isTracking, setIsTracking] = useState(false);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Sidebar Controls */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="glass p-6 rounded-3xl">
          <h2 className="text-2xl font-bold mb-6">Setup Trip</h2>
          
          <div className="space-y-4 mb-6">
            <div className="relative">
              <div className="absolute left-4 top-3 text-[#00E5FF]"><Navigation className="w-5 h-5" /></div>
              <input 
                type="text" 
                placeholder="Current Location" 
                className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#00E5FF] transition-colors"
                defaultValue="Downtown Metro Station"
              />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-3 text-[#00FF9D]"><MapPin className="w-5 h-5" /></div>
              <input 
                type="text" 
                placeholder="Destination" 
                className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#00FF9D] transition-colors"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsTracking(!isTracking)}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg transition-all ${
              isTracking 
                ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white neon-glow-danger' 
                : 'bg-gradient-to-r from-[#00E5FF] to-[#00FF9D] text-[#0B1020] neon-glow'
            }`}
          >
            {isTracking ? 'Stop Tracking' : <><Play className="w-5 h-5" fill="currentColor" /> Start Safe Trip</>}
          </motion.button>
        </div>

        {/* Status Card */}
        {isTracking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-3xl border border-[#00FF9D]/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Live Status</h3>
              <span className="flex items-center gap-2 text-xs font-bold text-[#00FF9D] bg-[#00FF9D]/10 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></span>
                MONITORING
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 p-4 rounded-xl">
                <div className="text-gray-400 text-xs uppercase mb-1">ETA</div>
                <div className="text-xl font-bold text-white">24 mins</div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl">
                <div className="text-gray-400 text-xs uppercase mb-1">Safety</div>
                <div className="text-xl font-bold text-[#00FF9D]">92%</div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#7C4DFF]" />
            Emergency Contacts
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-gray-800">
              <div>
                <div className="font-medium">Mom</div>
                <div className="text-xs text-gray-400">+1 234 567 890</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#00FF9D]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <div className="glass p-2 rounded-3xl border border-[#00E5FF]/20">
          <MapView />
        </div>
        
        {isTracking && (
          <div className="glass p-6 rounded-3xl">
            <h3 className="font-bold mb-4">AI Threat Radar</h3>
            <ThreatBox threat={{ type: 'info', message: 'Route clear. Lighting is optimal.', time: 'Live' }} />
            <ThreatBox threat={{ type: 'warning', message: 'Slight traffic ahead, alternative route calculated.', time: '1 min ago' }} />
          </div>
        )}
      </div>
    </div>
  );
}
