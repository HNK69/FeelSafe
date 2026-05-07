import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StartTrip from './pages/StartTrip';
import Emergency from './pages/Emergency';
import SafeRoute from './pages/SafeRoute';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start-trip" element={<StartTrip />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/safe-route" element={<SafeRoute />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
