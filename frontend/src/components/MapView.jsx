import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

export default function MapView() {
  return (
    <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-[#00E5FF]/20 bg-[#0B1020]">
      {/* Mock Map Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#151B2F_1px,transparent_1px),linear-gradient(to_bottom,#151B2F_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-50"></div>
      
      {/* Mock Route Path */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M 50 250 C 150 250, 150 100, 250 100 S 350 200, 450 150"
          fill="transparent"
          stroke="url(#gradient)"
          strokeWidth="4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#00FF9D" />
          </linearGradient>
        </defs>
      </svg>

      {/* Markers */}
      <div className="absolute top-[250px] left-[50px] transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-[#00E5FF] rounded-full neon-glow animate-pulse"></div>
      </div>
      <div className="absolute top-[150px] left-[450px] transform -translate-x-1/2 -translate-y-1/2">
        <MapPin className="text-[#00FF9D] w-8 h-8 drop-shadow-[0_0_8px_rgba(0,255,157,0.8)] -mt-8" />
      </div>

      {/* Simulated Location Indicator */}
      <motion.div
        className="absolute top-[100px] left-[250px] transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Navigation className="text-white w-6 h-6 rotate-45 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      </motion.div>
    </div>
  );
}
