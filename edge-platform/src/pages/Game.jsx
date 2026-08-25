import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchOdds, fetchProps, fetchScores, buildScoresMap, getBestLine, fmtOdds } from '../lib/odds.js';
import { resolveTeam, autoDetectCtx, buildSignals } from '../lib/signals.js';
import { MLB_STATS } from '../data/mlb.js';
import PropsTable from '../components/PropsTable.jsx';

function SignalItem({ sig }) {
  const c = sig.good ? 'var(--grn)' : sig.good === false ? 'var(--red)' : 'var(--dim)';
  const bg = sig.good ? 'var(--grn)0d' : sig.good === false ? 'var(--red)0d' : 'var(--sur)';
  const icon = sig.good ? '✓' : sig.good === false ? '✗' : '–';
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '7px 10px', border: `1px solid ${c}33`, fontSize: 11, color: c, fontWeight: 600, lineHeight: 1.5, marginBottom: 4 }}>
      {icon} {sig.label}
    </div>
  );
}

function TeamStat({ label, val, pct, invert = false }) {
  const p = invert ? 100 - pct : pct;
  const c = p >= 65 ? 'var(--grn)' : p >= 55 ? 'var(--gold)' : p <= 35 ? 'var(--red)' : 'var(--dim)';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{val}</span>
      </div>
      <div className="bar-wrap">
        <div className="bar-fill" style={{ width: `${Math.min(p, 100)}%`, background: c }} />
      </div>
    </div>
  );
}

export default function Game({ user }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const sport = params.get('sport') || 'baseball_mlb';
  const [mkt, setMkt] = useState(params.get('mkt') || 'totals');

  const [game, setGame] = useState(null);
  const [ctx, setCtx] = useState({});
  const [propsData, setPropsData] = useState(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signalSaved, setSignalSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [allGames, scoresData] = await Promise.all([
          fetchOdds({ sport, markets: 'h2h,spreads,totals' }),
          fetchScores({ sport, daysFrom: 1 }).catch(() => []),
        ]);
        const found = allGames.find(g => g.id === id);
        if (found) {
          setGame(found);
          const resolver = name => resolveTeam(name, sport);
          const scoresMap = buildScoresMap(scoresData, resolver);
          setCtx(autoDetectCtx(found, scoresMap, resolver));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [id, sport]);

  async function loadProps() {
    setPropsLoading(true);
    try {
      const data = await fetchProps({ eventId: id, sport });
      setPropsData(data);
    } catch (e) { console.error(e); }
    setPropsLoading(false);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--dim)', textAlign: 'center' }}>Loading game...</div>;
  if (!game) return <div style={{ padding: 40, color: 'var(--dim)', textAlign: 'center' }}>Game not found</div>;

  const { ak, hk } = ctx;
  const { line, bestOver, bestOverBook, bestUnder, bestUnderBook } = getBestLine(game, mkt);
  const sigs = buildSignals(ak, hk, mkt, line, ctx, sport);
  const goodSigs = sigs.filter(s => s.good);
  const cats = [...new Set(sigs.map(s => s.cat))];

  const ra = ak ? MLB_STATS[ak] : null;
  const rh = hk ? MLB_STATS[hk] : null;

  const date = new Date(game.commence_time).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const MKTS = [
    { key: 'totals', label: 'O/U', color: 'var(--blu)' },
    { key: 'h2h', label: 'ML', color: 'var(--pur)' },
    { key: 'spreads', label: 'RL', color: 'var(--gold)' },
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      {/* Left: game detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Link to="/" style={{ fontSize: 11, color: 'var(--dim)' }}>← Back to slate</Link>
        </div>

        {/* Header */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 6 }}>{date}</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12 }}>
            {game.away_team} at {game.home_team}
          </h1>

          {/* Context badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {ctx.isDiv && <span className="pill" style={{ background: 'var(--pur)18', color: 'var(--pur)', border: '1px solid var(--pur)33' }}>Division</span>}
            {ctx.awayIsFav === true && <span className="pill" style={{ background: 'var(--gold)18', color: 'var(--gold)', border: '1px solid var(--gold)33' }}>{game.away_team.split(' ').pop()} Fav</span>}
            {ctx.awayIsFav === false && <span className="pill" style={{ background: 'var(--gold)18', color: 'var(--gold)', border: '1px solid var(--gold)33' }}>{game.home_team.split(' ').pop()} Fav</span>}
            {ctx.awayPrev && <span className="pill" style={{ background: ctx.awayPrev === 'win' ? 'var(--grn)18' : 'var(--red)18', color: ctx.awayPrev === 'win' ? 'var(--grn)' : 'var(--red)', border: `1px solid ${ctx.awayPrev === 'win' ? 'var(--grn)' : 'var(--red)'}33` }}>{game.away_team.split(' ').pop()} off {ctx.awayPrev}</span>}
            {ctx.homePrev && <span className="pill" style={{ background: ctx.homePrev === 'win' ? 'var(--grn)18' : 'var(--red)18', color: ctx.homePrev === 'win' ? 'var(--grn)' : 'var(--red)', border: `1px solid ${ctx.homePrev === 'win' ? 'var(--grn)' : 'var(--red)'}33` }}>{game.home_team.split(' ').pop()} off {ctx.homePrev}</span>}
          </div>

          {/* Market tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {MKTS.map(m => (
              <button key={m.key} onClick={() => setMkt(m.key)} style={{
                background: mkt === m.key ? m.color + '22' : 'none',
                border: `1px solid ${mkt === m.key ? m.color + '55' : 'var(--bdr)'}`,
                borderRadius: 7, padding: '5px 14px', fontSize: 12,
                fontWeight: mkt === m.key ? 700 : 400,
                color: mkt === m.key ? m.color : 'var(--dim)',
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Best lines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--sur)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--txt)', fontFamily: 'var(--mono)' }}>{line ?? '--'}</div>
              <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', marginTop: 3 }}>{mkt === 'totals' ? 'O/U' : 'Line'}</div>
            </div>
            <div style={{ background: 'var(--grn)0d', borderRadius: 8, padding: 10, textAlign: 'center', border: '1px solid var(--grn)22' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--grn)', fontFamily: 'var(--mono)' }}>{bestOver ? fmtOdds(bestOver) : '--'}</div>
              <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', marginTop: 3 }}>Best Over · {bestOverBook || ''}</div>
            </div>
            <div style={{ background: 'var(--red)0d', borderRadius: 8, padding: 10, textAlign: 'center', border: '1px solid var(--red)22' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--red)', fontFamily: 'var(--mono)' }}>{bestUnder ? fmtOdds(bestUnder) : '--'}</div>
              <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', marginTop: 3 }}>Best Under · {bestUnderBook || ''}</div>
            </div>
          </div>
        </div>

        {/* Signals */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: mkt === 'totals' ? 'var(--blu)' : mkt === 'h2h' ? 'var(--pur)' : 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Signal Breakdown
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: goodSigs.length >= 3 ? 'var(--grn)' : 'var(--dim)' }}>
              {goodSigs.length} signal{goodSigs.length !== 1 ? 's' : ''}
            </div>
          </div>
          {sigs.length === 0 && (
            <div style={{ color: 'var(--dim)', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>No strong signals for this matchup</div>
          )}
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{cat}</div>
              {sigs.filter(s => s.cat === cat).map((s, i) => <SignalItem key={i} sig={s} />)}
            </div>
          ))}
        </div>

        {/* Team panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{ tkey: ak, label: 'Away', t: ra }, { tkey: hk, label: 'Home', t: rh }].map(({ tkey, label, t }) => tkey && t && (
            <div key={label} className="card">
              <div style={{ fontSize: 8, color: 'var(--mut)', textTransform: 'uppercase', marginBottom: 2 }}>{label} · {t.div}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 1 }}>{tkey}</div>
              <div style={{ fontSize: 10, color: 'var(--mut)', marginBottom: 12 }}>{t.name}</div>
              <TeamStat label="Overall O/U" val={`${t.ou_over_pct}% over (${t.ou_record})`} pct={t.ou_over_pct} invert />
              <TeamStat label="Home O/U" val={`${t.ou_home_pct}% over`} pct={t.ou_home_pct} invert />
              {t.situational?.after_win?.[0] != null && <TeamStat label="After Win" val={`${t.situational.after_win[0]}% over`} pct={t.situational.after_win[0]} invert />}
              {t.situational?.after_loss?.[0] != null && <TeamStat label="After Loss" val={`${t.situational.after_loss[0]}% over`} pct={t.situational.after_loss[0]} invert />}
              {t.situational?.as_fav?.[0] != null && <TeamStat label="As Favorite" val={`${t.situational.as_fav[0]}% over`} pct={t.situational.as_fav[0]} invert />}
              {t.notes && <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 10, fontStyle: 'italic', lineHeight: 1.6 }}>{t.notes}</div>}
            </div>
          ))}
        </div>

        {/* Props */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--pur)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Player Props</div>
            {!propsData && !propsLoading && (
              <button onClick={loadProps} className="btn" style={{ background: 'var(--pur)22', border: '1px solid var(--pur)44', color: 'var(--pur)', padding: '4px 12px', fontSize: 11 }}>
                Load Props (5 credits)
              </button>
            )}
          </div>
          <PropsTable propsData={propsData} loading={propsLoading} />
        </div>
      </div>

      {/* Right: signal logger */}
      {user && (
        <aside style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--bdr)', overflowY: 'auto', padding: 16 }}>
          <SignalLogger game={game} ak={ak} hk={hk} mkt={mkt} line={line} sigs={sigs} user={user} />
        </aside>
      )}
    </div>
  );
}

function SignalLogger({ game, ak, hk, mkt, line, sigs, user }) {
  const [pick, setPick] = useState('');
  const [odds, setOdds] = useState('-110');
  const [book, setBook] = useState('');
  const [confidence, setConfidence] = useState('Medium');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const topSig = sigs.find(s => s.good);

  async function logSignal() {
    if (!pick.trim()) return;
    setSaving(true);
    const { supabase } = await import('../lib/supabase.js');
    const { error } = await supabase.from('signals').insert({
      user_id: user.id,
      sport: game.sport_key || 'baseball_mlb',
      game: `${game.away_team} @ ${game.home_team}`,
      game_date: game.commence_time.split('T')[0],
      market: mkt === 'totals' ? 'Totals O/U' : mkt === 'h2h' ? 'Moneyline' : 'Run Line',
      pick: pick.trim(),
      line: line,
      odds: parseInt(odds) || -110,
      book: book.trim() || null,
      signal_source: topSig?.label || null,
      confidence,
      result: 'Pending',
      is_public: true,
    });
    setSaving(false);
    if (!error) { setSaved(true); setPick(''); setTimeout(() => setSaved(false), 3000); }
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
        Log Signal
      </div>

      {topSig && (
        <div style={{ background: 'var(--grn)0d', border: '1px solid var(--grn)33', borderRadius: 8, padding: '8px 10px', marginBottom: 12, fontSize: 10, color: 'var(--grn)' }}>
          Top signal: {topSig.label}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Pick</label>
          <input value={pick} onChange={e => setPick(e.target.value)} placeholder="e.g. Under 8.5"
            style={{ width: '100%', background: 'var(--sur)', border: '1px solid var(--bdr2)', borderRadius: 7, padding: '7px 10px', color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Odds</label>
            <input value={odds} onChange={e => setOdds(e.target.value)} placeholder="-110"
              style={{ width: '100%', background: 'var(--sur)', border: '1px solid var(--bdr2)', borderRadius: 7, padding: '7px 10px', color: 'var(--txt)', fontSize: 12, outline: 'none', fontFamily: 'var(--mono)' }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Book</label>
            <input value={book} onChange={e => setBook(e.target.value)} placeholder="DraftKings"
              style={{ width: '100%', background: 'var(--sur)', border: '1px solid var(--bdr2)', borderRadius: 7, padding: '7px 10px', color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Confidence</label>
          <select value={confidence} onChange={e => setConfidence(e.target.value)}
            style={{ width: '100%', background: 'var(--sur)', border: '1px solid var(--bdr2)', borderRadius: 7, padding: '7px 10px', color: 'var(--txt)', fontSize: 12, outline: 'none' }}>
            {['High', 'Medium', 'Low'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={logSignal} disabled={!pick.trim() || saving} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', opacity: !pick.trim() ? 0.5 : 1 }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Log Signal'}
        </button>
      </div>
    </div>
  );
}
