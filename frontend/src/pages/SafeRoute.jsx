import { useState, useEffect } from 'react';
import { BrainCircuit, SlidersHorizontal, Loader2 } from 'lucide-react';
import RouteCard from '../components/RouteCard';
import SafetyRating from '../components/SafetyRating';
import MapView from '../components/MapView';
import { safestRoute } from '../services/api';

export default function SafeRoute() {
  const [routeData, setRouteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delhi based coordinates for demonstration
  const sourceCoords = [28.6429, 77.2191]; // New Delhi Railway Station
  const destCoords = [28.5244, 77.1855];   // Qutub Minar
  
  const mainRoute = [
    sourceCoords, 
    [28.6139, 77.2090], // India Gate
    [28.5800, 77.2000], // AIIMS
    [28.5500, 77.1900], // Hauz Khas
    destCoords
  ];

  const markers = [
    { position: [28.6139, 77.2090], color: '#00E5FF', label: 'Safe Zone (CCTV Active)' },
    { position: [28.5500, 77.1900], color: '#FFC857', label: 'Caution: Heavy Traffic' },
    { position: [28.6492, 77.2050], color: '#FF3B5C', label: 'High Risk Area (Avoided)' } // Close to source but avoided
  ];

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const data = await safestRoute({
          source: sourceCoords,
          destination: destCoords,
          time: new Date().toISOString()
        });
        setRouteData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoute();
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Left Panel: Recommendations */}
      <div className="w-full lg:w-5/12 flex flex-col gap-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-[#00E5FF]" />
            AI SafeRoute
          </h1>
          <button className="p-2 glass rounded-full hover:bg-white/10 transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="glass p-12 rounded-3xl flex flex-col items-center justify-center border border-[#00E5FF]/20">
            <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin mb-4" />
            <p className="text-gray-400 font-bold">Analyzing optimal and safest routes...</p>
          </div>
        ) : (
          <>
            <div className="glass p-6 rounded-3xl border border-[#00E5FF]/20 relative overflow-hidden group shadow-[0_0_20px_rgba(0,229,255,0.05)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <h2 className="text-xl font-bold mb-4">AI Safety Analysis</h2>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                    {routeData?.explanation || "Based on current conditions, the safest route has been selected, actively avoiding known high-risk zones and poorly-lit areas."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs font-bold bg-[#00FF9D]/10 text-[#00FF9D] w-max px-3 py-1 rounded-full border border-[#00FF9D]/30">
                      CCTV Coverage High
                    </div>
                    <div className="text-xs font-bold bg-[#FFC857]/10 text-[#FFC857] w-max px-3 py-1 rounded-full border border-[#FFC857]/30">
                      2 Danger Zones Avoided
                    </div>
                  </div>
                </div>
                <div className="scale-75 origin-right">
                  <SafetyRating score={routeData?.safety_score || 85} />
                </div>
              </div>
            </div>

            <h3 className="font-bold text-lg mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></div> 
              AI Recommended Route
            </h3>
            <div className="flex flex-col gap-4">
              <RouteCard 
                title={routeData?.safest_route || "Main Highway"} 
                score={routeData?.safety_score || 85} 
                eta="45 mins" 
                distance="18 km" 
                isRecommended={true} 
              />
              
              <h3 className="font-bold text-lg mt-4 text-gray-400">Alternative Routes</h3>
              {(routeData?.alternative_routes || []).map((alt, idx) => (
                <RouteCard 
                  key={idx}
                  title={alt.name} 
                  score={alt.score} 
                  eta={alt.score > 60 ? "40 mins" : "35 mins"} 
                  distance={alt.score > 60 ? "15 km" : "14 km"} 
                  isRecommended={false} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Map */}
      <div className="w-full lg:w-7/12 flex flex-col gap-6">
        <div className="glass p-2 rounded-3xl h-[600px] border border-[#00E5FF]/20 relative z-0 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <MapView 
            source={sourceCoords}
            destination={destCoords}
            routeCoordinates={mainRoute}
            markers={markers}
          />
          
          <div className="absolute top-6 right-6 glass p-4 rounded-2xl border border-gray-700 flex flex-col gap-3 backdrop-blur-xl z-[400] shadow-xl">
            <div className="font-bold text-sm mb-1 text-white border-b border-gray-700 pb-2">Map Legend</div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#00FF9D] border border-[#00FF9D]/50 shadow-[0_0_5px_#00FF9D]"></div> Safest Zone
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#FFC857] border border-[#FFC857]/50 shadow-[0_0_5px_#FFC857]"></div> Caution
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 rounded-full bg-[#FF3B5C] border border-[#FF3B5C]/50 shadow-[0_0_5px_#FF3B5C]"></div> High Risk / Unsafe
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-4 h-1 bg-[#00E5FF] rounded-full shadow-[0_0_5px_#00E5FF]"></div> Recommended Route
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
