import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/signals');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const inp = {
    width: '100%',
    background: 'var(--sur)',
    border: '1px solid var(--bdr2)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'var(--txt)',
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 4 }}>EDGE</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
            {mode === 'login'
              ? 'Sign in to track signals and see your record'
              : 'Build your verified betting track record'}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ background: '#1c0a0a', border: '1px solid var(--red)44', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'var(--grn)0d', border: '1px solid var(--grn)44', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grn)' }}>
                {success}
              </div>
            )}

            <div>
              <label style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="you@example.com" />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" minLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--dim)' }}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--mut)', lineHeight: 1.8 }}>
          Free tier: full access during beta<br />
          No credit card required
        </div>
      </div>
    </div>
  );
}
