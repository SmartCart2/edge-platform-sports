import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import Game from './pages/Game.jsx';
import Search from './pages/Search.jsx';
import Signals from './pages/Signals.jsx';
import TrackRecord from './pages/TrackRecord.jsx';
import Auth from './pages/Auth.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [sport, setSport] = useState('baseball_mlb');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      Loading...
    </div>
  );

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Nav user={user} sport={sport} setSport={setSport} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Home sport={sport} />} />
            <Route path="/game/:id" element={<Game user={user} />} />
            <Route path="/search" element={<Search sport={sport} />} />
            <Route path="/signals" element={<Signals user={user} />} />
            <Route path="/track" element={<TrackRecord />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
