import { motion } from 'framer-motion';
import { Phone, Share2, ShieldAlert, Activity } from 'lucide-react';
import SOSButton from '../components/SOSButton';

export default function Emergency() {
  return (
    <div className="min-h-screen bg-[#0B1020] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Alert Effects */}
      <div className="absolute inset-0 bg-red-900/10 z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF3B5C] rounded-full filter blur-[150px] opacity-10 z-0 pointer-events-none"></div>

      <div className="z-10 w-full max-w-lg">
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

        <div className="flex justify-center mb-16">
          <SOSButton onClick={() => alert('SOS Triggered! Fake alert sent.')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
  );
}
