// components/FeedbackModal.jsx
// Post-trip star rating + text feedback modal
// Saves to backend via /api/submit-route-feedback

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, CheckCircle, Loader2, X } from 'lucide-react';
import { submitRouteFeedback } from '../services/api';

const PROMPTS = [
  '',
  'Felt very unsafe the entire journey.',
  'A couple of uncomfortable moments, but ok.',
  'Generally safe, minor concerns.',
  'Felt safe, well-lit and populated.',
  'Completely safe and comfortable journey!',
];

export default function FeedbackModal({ tripId, routeId, onClose, onSubmitted }) {
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [feedback, setFeedback]   = useState('');
  const [isUnsafe, setIsUnsafe]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  const effectiveRouteId = routeId || (tripId ? `trip_${tripId}` : 'general');

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await submitRouteFeedback(
        effectiveRouteId,
        rating,
        isUnsafe,
        feedback.trim() || PROMPTS[rating],
      );
      setDone(true);
      setTimeout(() => {
        onSubmitted?.();
        onClose?.();
      }, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const display = hovered || rating;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        style={{ background: 'rgba(11,16,32,0.85)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="glass p-8 rounded-3xl border border-[#00FF9D]/30 w-full max-w-md relative shadow-[0_0_40px_rgba(0,255,157,0.1)]"
        >
          <button onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4">
                <CheckCircle className="w-16 h-16 text-[#00FF9D] mb-4" />
                <h3 className="text-2xl font-black text-[#00FF9D] mb-2">Thank You!</h3>
                <p className="text-gray-400 text-sm">Your rating helps the community stay safer.</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-[#00FF9D]/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#00FF9D]/30">
                    <Star className="w-6 h-6 text-[#00FF9D]" />
                  </div>
                  <h3 className="text-xl font-black">How Safe Was Your Journey?</h3>
                  <p className="text-gray-400 text-sm mt-1">Your rating trains our community safety AI</p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-3 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.button key={s} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}>
                      <Star className={`w-10 h-10 transition-all duration-150 ${
                        s <= display
                          ? 'text-[#FFC857] fill-[#FFC857] drop-shadow-[0_0_8px_rgba(255,200,87,0.8)]'
                          : 'text-gray-600'
                      }`} />
                    </motion.button>
                  ))}
                </div>

                {/* Prompt text */}
                <AnimatePresence mode="wait">
                  {display > 0 && (
                    <motion.p key={display} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-sm text-gray-400 mb-5 min-h-[20px]">
                      {PROMPTS[display]}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Text feedback */}
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder='Optional: "Dark road near metro", "Well lit and safe", ...'
                  rows={3}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-[#00FF9D] mb-4"
                />

                {/* Unsafe toggle */}
                <button
                  onClick={() => setIsUnsafe(v => !v)}
                  className={`w-full py-2 rounded-xl text-sm font-bold border mb-4 transition-all ${
                    isUnsafe
                      ? 'bg-[#FF3B5C]/20 border-[#FF3B5C]/60 text-[#FF3B5C]'
                      : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}>
                  {isUnsafe ? '⚠ Marked as Unsafe Report' : 'Report as Unsafe Area'}
                </button>

                {/* Submit */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[#00FF9D] to-[#00E5FF] text-black disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {submitting ? 'Saving...' : 'Submit Safety Rating'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
