import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function ThreatBox({ threat }) {
  const getIcon = () => {
    switch (threat.type) {
      case 'danger': return <AlertCircle className="w-5 h-5 text-[#FF3B5C]" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-[#FFC857]" />;
      default: return <Info className="w-5 h-5 text-[#00E5FF]" />;
    }
  };

  const getBorderColor = () => {
    switch (threat.type) {
      case 'danger': return 'border-[#FF3B5C]/50';
      case 'warning': return 'border-[#FFC857]/50';
      default: return 'border-[#00E5FF]/50';
    }
  };

  const getBgColor = () => {
    switch (threat.type) {
      case 'danger': return 'bg-[#FF3B5C]/10';
      case 'warning': return 'bg-[#FFC857]/10';
      default: return 'bg-[#00E5FF]/10';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={clsx(
          "flex items-start gap-3 p-3 rounded-xl border backdrop-blur-md mb-3",
          getBorderColor(),
          getBgColor()
        )}
      >
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{threat.message}</p>
          <span className="text-xs text-gray-400 mt-1 block">{threat.time}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
