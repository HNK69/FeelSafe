import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Clock, Map, Shield } from 'lucide-react';
import clsx from 'clsx';

/**
 * RouteCard — displays a full backend route object.
 * Accepts either a rich `route` object (from backend) OR legacy flat props.
 */
export default function RouteCard({ route, title, score, eta, distance, isRecommended, factors = [] }) {
  // Support both new (route obj) and old (flat props) calling conventions
  const name          = route?.name          ?? title      ?? 'Unknown Route';
  const safetyScore   = route?.safety_score  ?? score      ?? 0;
  const safetyLabel   = route?.safety_label  ?? '';
  const distKm        = route?.distance_km   ?? null;
  const desc          = route?.description   ?? null;
  const tags          = route?.tags          ?? [];
  const routeFactors  = route?.safety_factors ?? factors;
  const hasPolice     = route?.nearby_police    ?? false;
  const hasHospital   = route?.nearby_hospital  ?? false;

  const isHigh   = safetyScore >= 80;
  const isMedium = safetyScore >= 55 && safetyScore < 80;

  const scoreColor = isHigh ? 'text-[#00FF9D]' : isMedium ? 'text-[#FFC857]' : 'text-[#FF3B5C]';
  const barColor   = isHigh ? 'bg-[#00FF9D]'   : isMedium ? 'bg-[#FFC857]'   : 'bg-[#FF3B5C]';

  // Friendly tag labels
  const tagLabels = {
    well_lit:         '💡 Well Lit',
    cctv_present:     '📷 CCTV',
    busy_road:        '🚶 Busy Road',
    busy_market:      '🛍 Market Area',
    recommended:      '⭐ Recommended',
    isolated_stretch: '⚠ Isolated',
    poor_lighting:    '🌑 Poor Lighting',
    dark_stretch:     '🌑 Dark Stretch',
    late_night_risk:  '🌙 Night Risk',
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={clsx(
        'glass p-5 rounded-2xl border transition-all duration-300',
        isRecommended ? 'border-[#00E5FF] neon-glow bg-[#00E5FF]/5' : 'border-gray-800'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-2">
          <h3 className="text-base font-bold text-white leading-tight">{name}</h3>
          <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
            {eta && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {eta}</span>}
            {distKm && <span className="flex items-center gap-1"><Map className="w-3 h-3" /> {distKm} km</span>}
            {distance && !distKm && <span className="flex items-center gap-1"><Map className="w-3 h-3" /> {distance}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isRecommended && (
            <span className="bg-[#00E5FF]/20 text-[#00E5FF] text-xs px-2 py-0.5 rounded-full border border-[#00E5FF]/50 font-medium whitespace-nowrap">
              Recommended
            </span>
          )}
          {safetyLabel && (
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', scoreColor, 'bg-black/40 border border-white/10')}>
              {safetyLabel}
            </span>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            {isHigh
              ? <ShieldCheck className="w-4 h-4 text-[#00FF9D]" />
              : <ShieldAlert className={clsx('w-4 h-4', isMedium ? 'text-[#FFC857]' : 'text-[#FF3B5C]')} />
            }
            Safety Score
          </span>
          <span className={clsx('text-xl font-black', scoreColor)}>{safetyScore}</span>
        </div>
        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safetyScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={clsx('h-full rounded-full', barColor)}
          />
        </div>
      </div>

      {/* Police / Hospital badges */}
      {(hasPolice || hasHospital) && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {hasPolice && (
            <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Police nearby
            </span>
          )}
          {hasHospital && (
            <span className="text-xs bg-rose-900/40 text-rose-300 border border-rose-700/40 px-2 py-0.5 rounded-full">
              🏥 Hospital nearby
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full border font-medium',
                tag.includes('isolated') || tag.includes('poor') || tag.includes('dark') || tag.includes('risk')
                  ? 'text-[#FFC857] border-[#FFC857]/30 bg-[#FFC857]/10'
                  : 'text-[#00FF9D] border-[#00FF9D]/30 bg-[#00FF9D]/10'
              )}
            >
              {tagLabels[tag] ?? tag}
            </span>
          ))}
        </div>
      )}

      {/* Top safety factors */}
      {routeFactors.length > 0 && (
        <div className="space-y-1 border-t border-white/5 pt-3">
          {routeFactors.slice(0, 3).map((factor, i) => (
            <div key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
              <span className="text-[#00E5FF] mt-0.5">›</span>
              {factor}
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {desc && (
        <p className="text-xs text-gray-500 mt-2 italic leading-relaxed">{desc}</p>
      )}
    </motion.div>
  );
}
