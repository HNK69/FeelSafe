import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Play, UserPlus, Loader2 } from 'lucide-react';
import MapView from '../components/MapView';
import ThreatBox from '../components/ThreatBox';
import { startTrip } from '../services/api';

export default function StartTrip() {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tripData, setTripData] = useState(null);

  const [sourceInput, setSourceInput] = useState('New Delhi Station');
  const [destInput, setDestInput] = useState('Connaught Place');

  // Hardcoded coordinates for the simulation since we don't have a geocoder API right now
  const sourceCoords = [28.6429, 77.2191]; // New Delhi
  const destCoords = [28.6304, 77.2177];   // Connaught Place
  const routeCoords = [
    sourceCoords,
    [28.6400, 77.2185],
    [28.6380, 77.2180],
    [28.6350, 77.2175],
    destCoords
  ];

  const [currentPosition, setCurrentPosition] = useState(null);

  // Animation logic
  useEffect(() => {
    let interval;
    if (isTracking) {
      let progress = 0;
      setCurrentPosition(routeCoords[0]);
      
      interval = setInterval(() => {
        progress += 0.05; // 5% per tick
        if (progress >= 1) {
          progress = 1;
          clearInterval(interval);
        }
        
        // Simple linear interpolation across the whole route 
        // (for a hackathon this creates a realistic enough moving effect)
        const totalSegments = routeCoords.length - 1;
        const segmentIndex = Math.floor(progress * totalSegments);
        const segmentProgress = (progress * totalSegments) - segmentIndex;
        
        if (segmentIndex < totalSegments) {
          const startPt = routeCoords[segmentIndex];
          const endPt = routeCoords[segmentIndex + 1];
          const lat = startPt[0] + (endPt[0] - startPt[0]) * segmentProgress;
          const lng = startPt[1] + (endPt[1] - startPt[1]) * segmentProgress;
          setCurrentPosition([lat, lng]);
        } else {
          setCurrentPosition(routeCoords[routeCoords.length - 1]);
        }
      }, 1000); // Update every second
    } else {
      setCurrentPosition(null);
    }

    return () => clearInterval(interval);
  }, [isTracking]);

  const handleStartTrip = async () => {
    if (isTracking) {
      setIsTracking(false);
      setTripData(null);
      setCurrentPosition(null);
      return;
    }

    if (!sourceInput || !destInput) {
      alert("Please enter both source and destination.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await startTrip({
        source: sourceInput,
        destination: destInput,
        user_id: 'user-123'
      });
      setTripData(data);
      setIsTracking(true);
    } catch (error) {
      console.error(error);
      alert('Failed to start trip.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="glass p-6 rounded-3xl">
          <h2 className="text-2xl font-bold mb-6">Setup Trip</h2>
          
          <div className="space-y-4 mb-6">
            <div className="relative">
              <div className="absolute left-4 top-3 text-[#00E5FF]"><Navigation className="w-5 h-5" /></div>
              <input 
                type="text" 
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                placeholder="Current Location" 
                disabled={isTracking}
                className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#00E5FF] transition-colors disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-3 text-[#00FF9D]"><MapPin className="w-5 h-5" /></div>
              <input 
                type="text" 
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                placeholder="Destination" 
                disabled={isTracking}
                className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#00FF9D] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartTrip}
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg transition-all ${
              isTracking 
                ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white neon-glow-danger' 
                : 'bg-gradient-to-r from-[#00E5FF] to-[#00FF9D] text-[#0B1020] neon-glow'
            } disabled:opacity-50`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             isTracking ? 'Stop Tracking' : <><Play className="w-5 h-5" fill="currentColor" /> Start Safe Trip</>}
          </motion.button>
        </div>

        {isTracking && tripData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-3xl border border-[#00FF9D]/30 shadow-[0_0_15px_rgba(0,255,157,0.1)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Live Status</h3>
              <span className="flex items-center gap-2 text-xs font-bold text-[#00FF9D] bg-[#00FF9D]/10 px-3 py-1 rounded-full border border-[#00FF9D]/20">
                <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></span>
                MONITORING
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <div className="text-gray-400 text-xs uppercase mb-1">ETA</div>
                <div className="text-xl font-bold text-white">{tripData.eta || '24 mins'}</div>
              </div>
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <div className="text-gray-400 text-xs uppercase mb-1">Safety</div>
                <div className="text-xl font-bold text-[#00FF9D]">{tripData.safety_score || 92}%</div>
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
                <div className="text-xs text-gray-400">+91 98765 43210</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#00FF9D]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <div className="glass rounded-3xl border border-[#00E5FF]/20 overflow-hidden h-[400px] md:h-auto md:flex-1 relative">
          <MapView 
            source={isTracking ? sourceCoords : null} 
            destination={isTracking ? destCoords : null}
            routeCoordinates={isTracking ? routeCoords : []}
            currentPosition={isTracking ? currentPosition : null}
          />
          {/* Radar Overlay Effect */}
          {isTracking && (
             <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
                <div className="w-[150%] h-[150%] rounded-full border border-[#00E5FF]/10 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
             </div>
          )}
        </div>
        
        {isTracking && (
          <div className="glass p-6 rounded-3xl">
            <h3 className="font-bold mb-4">AI Threat Radar</h3>
            <ThreatBox threat={{ type: 'info', message: 'Route clear. Lighting is optimal.', time: 'Live' }} />
            <ThreatBox threat={{ type: 'warning', message: 'Moderate risk zone ahead, alternative route suggested.', time: '1 min ago' }} />
          </div>
        )}
      </div>
    </div>
  );
}
