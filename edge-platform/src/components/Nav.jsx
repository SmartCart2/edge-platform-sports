import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const SPORTS = [
  { key: 'baseball_mlb',          label: 'MLB' },
  { key: 'americanfootball_nfl',  label: 'NFL' },
  { key: 'basketball_nba',        label: 'NBA' },
  { key: 'icehockey_nhl',         label: 'NHL' },
];

export default function Nav({ user, sport, setSport }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const loc = useLocation();

  function handleSearch(e) {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}&sport=${sport}`);
      setQ('');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const navLinks = [
    { to: '/',        label: 'Today' },
    { to: '/signals', label: 'Signals' },
    { to: '/track',   label: 'Track Record' },
  ];

  return (
    <nav style={{
      background: 'var(--nav)',
      borderBottom: '1px solid var(--bdr)',
      padding: '0 20px',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, marginRight: 8 }}>
        <span style={{ fontSize: 8, color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>EDGE</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--txt)', letterSpacing: -0.5 }}>Platform</span>
      </Link>

      <div style={{ width: 1, height: 20, background: 'var(--bdr)' }} />

      {/* Sport tabs */}
      <div style={{ display: 'flex', gap: 2 }}>
        {SPORTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSport(s.key)}
            style={{
              background: sport === s.key ? 'var(--gold)22' : 'none',
              border: sport === s.key ? '1px solid var(--gold)55' : '1px solid transparent',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: sport === s.key ? 700 : 400,
              color: sport === s.key ? 'var(--gold)' : 'var(--mut)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--bdr)' }} />

      {/* Nav links */}
      {navLinks.map(l => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            fontSize: 12,
            fontWeight: loc.pathname === l.to ? 700 : 400,
            color: loc.pathname === l.to ? 'var(--txt)' : 'var(--dim)',
            borderBottom: loc.pathname === l.to ? '2px solid var(--gold)' : '2px solid transparent',
            paddingBottom: 2,
          }}
        >
          {l.label}
        </Link>
      ))}

      <div style={{ flex: 1 }} />

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search player or team..."
          style={{
            background: 'var(--sur)',
            border: '1px solid var(--bdr2)',
            borderRadius: 7,
            padding: '5px 12px',
            color: 'var(--txt)',
            fontSize: 12,
            outline: 'none',
            width: 220,
          }}
        />
        <button type="submit" className="btn btn-gold" style={{ padding: '5px 12px', fontSize: 11 }}>
          Search
        </button>
      </form>

      {/* Auth */}
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/signals" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
            {user.email?.split('@')[0]}
          </Link>
          <button onClick={signOut} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>
            Sign out
          </button>
        </div>
      ) : (
        <Link to="/auth" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
          Sign in
        </Link>
      )}
    </nav>
  );
}
