import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function SOSButton({ onClick, className = '' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative group ${className}`}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-[#FF3B5C] to-red-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
      <div className="relative flex items-center justify-center w-40 h-40 bg-gradient-to-br from-red-500 to-[#FF3B5C] rounded-full shadow-2xl border-4 border-red-400/50">
        <div className="flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-white mb-2" />
          <span className="text-white font-black text-2xl tracking-widest">SOS</span>
        </div>
      </div>
    </motion.button>
  );
}
