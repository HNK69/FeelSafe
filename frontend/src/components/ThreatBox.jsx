import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function ThreatBox({ threat }) {
  const type = threat.type || 'info';

  const getIcon = () => {
    switch (type) {
      case 'danger':  return <AlertCircle className="w-5 h-5 text-[#FF3B5C]" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-[#FFC857]" />;
      default:        return <Info className="w-5 h-5 text-[#00E5FF]" />;
    }
  };

  const colors = {
    danger:  { border: 'border-[#FF3B5C]/50', bg: 'bg-[#FF3B5C]/10', ring: '#FF3B5C', text: 'text-[#FF3B5C]' },
    warning: { border: 'border-[#FFC857]/50', bg: 'bg-[#FFC857]/10', ring: '#FFC857', text: 'text-[#FFC857]' },
    info:    { border: 'border-[#00E5FF]/50', bg: 'bg-[#00E5FF]/10', ring: '#00E5FF', text: 'text-[#00E5FF]' },
  };
  const c = colors[type] || colors.info;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={clsx(
          'relative flex items-start gap-3 p-3 rounded-xl border backdrop-blur-md mb-3 overflow-hidden',
          c.border, c.bg
        )}
      >
        {/* Pulse ring for danger */}
        {type === 'danger' && (
          <span
            className="absolute -top-1 -left-1 w-3 h-3 rounded-full animate-ping opacity-60"
            style={{ backgroundColor: c.ring }}
          />
        )}

        <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug">{threat.message}</p>

          {/* reason from live API */}
          {threat.reason && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{threat.reason}</p>
          )}

          {/* action tips chips */}
          {threat.action_tips && threat.action_tips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {threat.action_tips.slice(0, 2).map((tip, i) => (
                <span
                  key={i}
                  className={clsx('text-xs px-2 py-0.5 rounded-full border flex items-center gap-1', c.text,
                    'bg-black/30 border-white/10')}
                >
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  {tip}
                </span>
              ))}
            </div>
          )}

          <span className="text-xs text-gray-500 mt-1 block">{threat.time}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
