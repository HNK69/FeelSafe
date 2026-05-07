import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Clock, Map } from 'lucide-react';
import clsx from 'clsx';

export default function RouteCard({ title, score, eta, distance, isRecommended }) {
  const isHighSafety = score >= 85;
  const isMediumSafety = score < 85 && score >= 60;
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={clsx(
        "glass p-5 rounded-2xl border transition-all duration-300",
        isRecommended ? "border-[#00E5FF] neon-glow bg-[#00E5FF]/5" : "border-gray-800"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
          <div className="flex gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {eta}</span>
            <span className="flex items-center gap-1"><Map className="w-4 h-4" /> {distance}</span>
          </div>
        </div>
        {isRecommended && (
          <span className="bg-[#00E5FF]/20 text-[#00E5FF] text-xs px-2 py-1 rounded-full border border-[#00E5FF]/50 font-medium">
            Recommended
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 p-3 bg-black/30 rounded-xl">
        <div className="flex items-center gap-2">
          {isHighSafety ? (
            <ShieldCheck className="w-6 h-6 text-[#00FF9D]" />
          ) : (
            <ShieldAlert className={clsx("w-6 h-6", isMediumSafety ? "text-[#FFC857]" : "text-[#FF3B5C]")} />
          )}
          <span className="text-sm text-gray-300">Safety Score</span>
        </div>
        <span className={clsx(
          "text-2xl font-black",
          isHighSafety ? "text-[#00FF9D]" : isMediumSafety ? "text-[#FFC857]" : "text-[#FF3B5C]"
        )}>
          {score}%
        </span>
      </div>
    </motion.div>
  );
}
