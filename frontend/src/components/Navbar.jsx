// components/Navbar.jsx
// Updated: Safe Route → Community (reflects repurposed page)
import { Link, useLocation } from 'react-router-dom';
import { Shield, Map, Users, AlertTriangle, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { name: 'Home',       path: '/',            icon: Shield },
    { name: 'Start Trip', path: '/start-trip',  icon: Map },
    { name: 'Community',  path: '/safe-route',  icon: Users },
    { name: 'Dashboard',  path: '/dashboard',   icon: LayoutDashboard },
  ];

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 glass sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="text-[#00E5FF] w-8 h-8" />
          <span className="text-2xl font-bold tracking-wider text-gradient">FeelSafe</span>
        </Link>
        <div className="flex items-center gap-6">
          {navItems.map(({ name, path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={name} to={path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300',
                  isActive ? 'bg-[#00E5FF]/20 text-[#00E5FF] neon-glow' : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}>
                <Icon className="w-4 h-4" />
                <span className="font-medium">{name}</span>
              </Link>
            );
          })}
          <Link to="/emergency"
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white font-bold hover:scale-105 transition-transform duration-300 neon-glow-danger">
            <AlertTriangle className="w-4 h-4" />
            <span>SOS</span>
          </Link>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass pb-safe z-50">
        <div className="flex items-center justify-around p-3">
          {navItems.map(({ name, path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={name} to={path}
                className={clsx(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300',
                  isActive ? 'text-[#00E5FF]' : 'text-gray-400'
                )}>
                <Icon className={clsx('w-6 h-6', isActive && 'drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]')} />
                <span className="text-[10px] font-medium">{name}</span>
              </Link>
            );
          })}
          <Link to="/emergency" className="flex flex-col items-center gap-1 p-2 text-[#FF3B5C]">
            <div className="bg-[#FF3B5C]/20 p-2 rounded-full neon-glow-danger">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold">SOS</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
