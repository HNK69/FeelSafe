import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function SOSButton({ onClick, isActivating = false, className = '' }) {
  return (
    <motion.button
      whileHover={isActivating ? {} : { scale: 1.05 }}
      whileTap={isActivating ? {}  : { scale: 0.95 }}
      onClick={isActivating ? undefined : onClick}
      disabled={isActivating}
      className={`relative group ${className} ${isActivating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Outer pulse glow */}
      <div className={`absolute -inset-1 bg-gradient-to-r from-[#FF3B5C] to-red-600 rounded-full blur opacity-75
        ${isActivating ? 'opacity-100 animate-pulse' : 'group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse'}`}
      />

      {/* Concentric rings when activating */}
      {isActivating && (
        <>
          <span className="absolute -inset-4 rounded-full border-2 border-[#FF3B5C]/40 animate-ping" />
          <span className="absolute -inset-8 rounded-full border border-[#FF3B5C]/20 animate-ping" style={{ animationDelay: '0.3s' }} />
        </>
      )}

      {/* Main button body */}
      <div className="relative flex items-center justify-center w-40 h-40 bg-gradient-to-br from-red-500 to-[#FF3B5C] rounded-full shadow-2xl border-4 border-red-400/50">
        <div className="flex flex-col items-center">
          {isActivating ? (
            <>
              <Loader2 className="w-12 h-12 text-white mb-2 animate-spin" />
              <span className="text-white font-black text-sm tracking-widest">SENDING...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 text-white mb-2" />
              <span className="text-white font-black text-2xl tracking-widest">SOS</span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}
