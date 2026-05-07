import { motion } from 'framer-motion';

export default function SafetyRating({ score }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#00FF9D';
    if (score >= 60) return '#FFC857';
    return '#FF3B5C';
  };

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="40"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          fill="transparent"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="40"
          stroke={getColor()}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeLinecap: 'round' }}
          className="drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}
