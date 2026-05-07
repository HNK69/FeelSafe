import { BrainCircuit, SlidersHorizontal } from 'lucide-react';
import RouteCard from '../components/RouteCard';
import SafetyRating from '../components/SafetyRating';
import MapView from '../components/MapView';

export default function SafeRoute() {
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

        <div className="glass p-6 rounded-3xl border border-[#00E5FF]/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <h2 className="text-xl font-bold mb-4">Overall Safety Overview</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">Based on current time, lighting, and community reports, the safest route is <span className="text-[#00E5FF] font-bold">Route A</span>.</p>
              <div className="flex items-center gap-2 text-xs font-bold bg-[#FFC857]/10 text-[#FFC857] w-max px-3 py-1 rounded-full border border-[#FFC857]/30">
                1 Warning on Route B
              </div>
            </div>
            <div className="scale-75 origin-right">
              <SafetyRating score={92} />
            </div>
          </div>
        </div>

        <h3 className="font-bold text-lg mt-4">Available Routes</h3>
        <div className="flex flex-col gap-4">
          <RouteCard 
            title="Route A (Main Highway)" 
            score={95} 
            eta="24 mins" 
            distance="12 km" 
            isRecommended={true} 
          />
          <RouteCard 
            title="Route B (Downtown)" 
            score={75} 
            eta="20 mins" 
            distance="10 km" 
            isRecommended={false} 
          />
          <RouteCard 
            title="Route C (Backstreets)" 
            score={45} 
            eta="18 mins" 
            distance="9.5 km" 
            isRecommended={false} 
          />
        </div>
      </div>

      {/* Right Panel: Map */}
      <div className="w-full lg:w-7/12 flex flex-col gap-6">
        <div className="glass p-2 rounded-3xl h-[600px] border border-gray-800 relative">
          {/* Simulated overlays for safe/unsafe zones could go inside MapView, but we place MapView here */}
          <MapView />
          
          <div className="absolute top-6 right-6 glass p-4 rounded-2xl border border-gray-700 flex flex-col gap-3 backdrop-blur-xl">
            <div className="font-bold text-sm mb-1">Map Legend</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-[#00FF9D]"></div> Safest Zone</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-[#FFC857]"></div> Caution</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-[#FF3B5C]"></div> High Risk</div>
          </div>
        </div>
      </div>
    </div>
  );
}
