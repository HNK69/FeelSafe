import { motion } from 'framer-motion';
import { Shield, ArrowRight, Bell, Zap, Map } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen px-6 pt-10 pb-24 md:px-20 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mt-10 md:mt-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-[#00E5FF]/30 text-[#00E5FF] mb-8 text-sm font-medium"
        >
          <Shield className="w-4 h-4" />
          <span>AI-Powered Personal Safety</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black mb-6 leading-tight"
        >
          Your AI Companion For <br />
          <span className="text-gradient">Safer Journeys</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          Real-time threat detection, community intelligence, and smart routing to ensure you reach your destination safely.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/start-trip"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#00E5FF] to-[#00FF9D] text-[#0B1020] rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform neon-glow shadow-lg"
          >
            Start Safe Trip <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/safe-route"
            className="w-full sm:w-auto px-8 py-4 glass border border-gray-600 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            Explore Safe Routes
          </Link>
        </motion.div>
      </div>

      {/* Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
        <FeatureCard 
          icon={<Bell className="w-8 h-8 text-[#FFC857]" />}
          title="Live AI Threat Detection"
          desc="Analyzes real-time data to warn you of potential risks on your route."
          delay={0.4}
        />
        <FeatureCard 
          icon={<Map className="w-8 h-8 text-[#00E5FF]" />}
          title="SafeRoute AI"
          desc="Suggests the safest path based on lighting, crowd density, and reports."
          delay={0.5}
        />
        <FeatureCard 
          icon={<Zap className="w-8 h-8 text-[#7C4DFF]" />}
          title="Community Pulse"
          desc="Get instant safety updates from users in your immediate vicinity."
          delay={0.6}
        />
      </div>

      {/* Trust Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-32 text-center"
      >
        <div className="glass rounded-3xl p-10 max-w-4xl mx-auto border-[#00E5FF]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
          
          <h2 className="text-3xl font-bold mb-8">Trusted by Community</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value="10k+" label="Safe Trips" />
            <Stat value="99.9%" label="Uptime" />
            <Stat value="24/7" label="Monitoring" />
            <Stat value="5k+" label="Active Users" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="glass p-8 rounded-3xl border border-gray-800 hover:border-[#00E5FF]/50 transition-colors group"
    >
      <div className="bg-black/30 p-4 rounded-2xl w-max mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="text-4xl font-black text-white mb-2 text-gradient">{value}</div>
      <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}
