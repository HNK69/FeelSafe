// pages/SafeRoute.jsx
// Community Safety Hub — Live Intel Feed + Trip History + inline rating
// This is NOT a duplicate of StartTrip — it's community intelligence + history

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MapPin, Star, Activity, Clock,
  Shield, RefreshCw
} from 'lucide-react';
import { getCommunityFeed, getTripHistory, submitRouteFeedback } from '../services/api';

export default function SafeRoute() {
  const [feed, setFeed]               = useState([]);
  const [history, setHistory]         = useState([]);
  const [activeTab, setActiveTab]     = useState('feed');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [quickRating, setQuickRating] = useState({}); // tripId → rating

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true);
    const [feedRes, histRes] = await Promise.allSettled([
      getCommunityFeed(15),
      getTripHistory(1, 10),
    ]);
    if (feedRes.value?.success)  setFeed(feedRes.value.feed || []);
    if (histRes.value?.success)  setHistory(histRes.value.trips || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, []);

  const handleQuickRate = async (tripId, rating) => {
    await submitRouteFeedback(`trip_${tripId}`, rating, false, '').catch(() => {});
    setQuickRating(prev => ({ ...prev, [tripId]: rating }));
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Users className="w-8 h-8 text-[#7C4DFF]" />
            Community Safety
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real reports from users · Powers AI route scoring
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => load()} disabled={refreshing}
          className="p-2.5 glass rounded-full border border-gray-700 hover:border-gray-500 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7C4DFF]' : ''}`} />
        </motion.button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {[
          ['feed',    'Live Intel Feed',  <Activity className="w-4 h-4" />],
          ['history', 'My Trip History',  <Clock    className="w-4 h-4" />],
        ].map(([id, label, icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === id
                ? 'bg-[#7C4DFF]/20 text-[#7C4DFF] border border-[#7C4DFF]/40'
                : 'glass text-gray-400 border border-gray-800 hover:text-white'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Live Intel Feed ──────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <motion.div key="feed" initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {loading ? (
              <div className="glass p-10 rounded-3xl text-center">
                <RefreshCw className="w-8 h-8 text-[#7C4DFF] animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading community intelligence...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feed.map((ev, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass p-4 rounded-2xl border hover:border-gray-600 transition-all"
                    style={{ borderColor: `${ev.color}33` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: ev.color, boxShadow: `0 0 6px ${ev.color}` }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color: ev.color }}>
                          {ev.area}
                        </div>
                        <p className="text-gray-300 text-sm mt-0.5">{ev.issue}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">{ev.time}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            ev.severity === 'HIGH'   ? 'bg-[#FF3B5C]/20 text-[#FF3B5C]' :
                            ev.severity === 'MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' :
                                                       'bg-[#00FF9D]/20 text-[#00FF9D]'}`}>
                            {ev.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* How it works */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 glass p-5 rounded-3xl border border-[#7C4DFF]/20">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-[#7C4DFF]">
                <Shield className="w-4 h-4" /> How Community Intelligence Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  ['You rate a route',     'After every trip, rate your safety experience (1–5 stars)'],
                  ['AI learns patterns',   'Our model weighs ratings by trust score and recency'],
                  ['Routes get smarter',   'Future users see updated safety scores for that area'],
                ].map(([title, desc], i) => (
                  <div key={i} className="bg-black/30 p-3 rounded-xl">
                    <div className="text-xs font-black text-[#7C4DFF] mb-1">{i + 1}. {title}</div>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Trip History ─────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {loading ? (
              <div className="glass p-10 rounded-3xl text-center">
                <RefreshCw className="w-8 h-8 text-[#7C4DFF] animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading trip history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="glass p-12 rounded-3xl text-center border border-gray-800">
                <MapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-bold">No completed trips yet.</p>
                <p className="text-gray-600 text-sm mt-1">
                  Complete a trip on <strong>Start Trip</strong> to see your history here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((trip, i) => {
                  const rated      = quickRating[trip.id] ?? trip.safety_rating;
                  const rateColor  = rated >= 4 ? '#00FF9D' : rated >= 2 ? '#FFC857' : '#FF3B5C';
                  return (
                    <motion.div key={trip.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass p-5 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#00E5FF] flex-shrink-0" />
                            <span className="truncate">
                              {trip.origin_name || 'Origin'} → {trip.dest_name || 'Destination'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {trip.ended_at
                              ? new Date(trip.ended_at).toLocaleString('en-IN', {
                                  day: 'numeric', month: 'short',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : 'Recently'}
                            {trip.eta_minutes &&
                              <span>· ETA was {Math.round(trip.eta_minutes)} min</span>}
                          </div>
                          {trip.feedback_text && (
                            <p className="text-xs text-gray-400 mt-1 italic">
                              "{trip.feedback_text}"
                            </p>
                          )}
                        </div>

                        {/* Star rating */}
                        <div className="flex-shrink-0">
                          {rated ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-[#FFC857] text-[#FFC857]" />
                              <span className="font-black text-lg" style={{ color: rateColor }}>
                                {rated}
                              </span>
                              <span className="text-xs text-gray-500">/5</span>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[10px] text-gray-500 mb-1 text-center">Rate</div>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <button key={s}
                                    onClick={() => handleQuickRate(trip.id, s)}
                                    className="text-gray-600 hover:text-[#FFC857] transition-colors">
                                    <Star className="w-4 h-4" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
