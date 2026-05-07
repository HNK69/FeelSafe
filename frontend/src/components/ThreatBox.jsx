// components/ThreatBox.jsx
// Animated threat indicator card — supports dynamic risk levels
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';

const CONFIG = {
  HIGH: {
    icon: AlertOctagon,
    color: '#FF3B5C',
    bg: 'bg-[#FF3B5C]/10',
    border: 'border-[#FF3B5C]/40',
    label: 'HIGH RISK',
  },
  MEDIUM: {
    icon: AlertTriangle,
    color: '#FFC857',
    bg: 'bg-[#FFC857]/10',
    border: 'border-[#FFC857]/40',
    label: 'MEDIUM RISK',
  },
  LOW: {
    icon: CheckCircle,
    color: '#00FF9D',
    bg: 'bg-[#00FF9D]/10',
    border: 'border-[#00FF9D]/40',
    label: 'CLEAR',
  },
  // Legacy type prop support
  warning: {
    icon: AlertTriangle,
    color: '#FFC857',
    bg: 'bg-[#FFC857]/10',
    border: 'border-[#FFC857]/40',
    label: 'CAUTION',
  },
  danger: {
    icon: AlertOctagon,
    color: '#FF3B5C',
    bg: 'bg-[#FF3B5C]/10',
    border: 'border-[#FF3B5C]/40',
    label: 'DANGER',
  },
  info: {
    icon: CheckCircle,
    color: '#00E5FF',
    bg: 'bg-[#00E5FF]/10',
    border: 'border-[#00E5FF]/40',
    label: 'INFO',
  },
};

/**
 * ThreatBox — displays one threat/status item.
 *
 * Props:
 *   threat: {
 *     risk_level?: 'HIGH'|'MEDIUM'|'LOW'   ← preferred
 *     type?:       'warning'|'danger'|'info' ← legacy fallback
 *     message:     string
 *     time?:       string
 *     score?:      number (0–10)
 *   }
 */
export default function ThreatBox({ threat }) {
  if (!threat) return null;

  const level   = threat.risk_level || threat.type || 'info';
  const cfg     = CONFIG[level] || CONFIG.info;
  const Icon    = cfg.icon;
  const isHigh  = level === 'HIGH' || level === 'danger';
  const score   = threat.score ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className={`flex items-start gap-3 p-3 rounded-xl border mb-2 last:mb-0 ${cfg.bg} ${cfg.border} transition-all duration-500`}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${isHigh ? 'animate-pulse' : ''}`}>
        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          {threat.time && (
            <span className="text-xs text-gray-500 flex-shrink-0">{threat.time}</span>
          )}
        </div>
        <p className="text-sm text-gray-200 leading-snug">{threat.message}</p>

        {/* Score bar */}
        {score !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(score / 10) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: cfg.color }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: cfg.color }}>{score}/10</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
