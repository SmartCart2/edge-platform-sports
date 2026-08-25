import { Link } from 'react-router-dom';
import { buildSignals } from '../lib/signals.js';
import { fmtOdds, getBestLine } from '../lib/odds.js';

function Meter({ count, max = 8 }) {
  const cols = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#16a34a','#15803d','#14532d'];
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: 2,
          background: i < count ? (cols[Math.min(count - 1, 7)]) : 'var(--bdr)',
        }} />
      ))}
      <span style={{ fontSize: 9, color: 'var(--dim)', marginLeft: 3, fontWeight: 700 }}>
        {count}/{max}
      </span>
    </div>
  );
}

export default function GameCard({ game, ak, hk, mkt, ctx, sport }) {
  const { line } = getBestLine(game, mkt);
  const sigs = buildSignals(ak, hk, mkt, line, ctx, sport);
  const good = sigs.filter(s => s.good).length;

  const mktColor = mkt === 'totals' ? 'var(--blu)' : mkt === 'h2h' ? 'var(--pur)' : 'var(--gold)';
  const date = new Date(game.commence_time).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <Link
      to={`/game/${game.id}?sport=${sport}&mkt=${mkt}`}
      style={{
        display: 'block',
        background: 'var(--sur)',
        border: '1px solid var(--bdr)',
        borderRadius: 10,
        padding: '10px 12px',
        transition: 'border-color 0.15s',
        textDecoration: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)44'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bdr)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', flex: 1, paddingRight: 8, lineHeight: 1.3 }}>
          {game.away_team} @ {game.home_team}
        </div>
        <Meter count={good} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--mut)', marginBottom: good > 0 ? 4 : 0 }}>
        {line != null ? `${mkt === 'totals' ? 'O/U ' : 'Ln '}${line}` : '--'} · {date}
      </div>
      {good > 0 && (
        <div style={{ fontSize: 10, fontWeight: 700, color: mktColor }}>
          {good} signal{good > 1 ? 's' : ''}
        </div>
      )}
      {ctx?.isDiv && (
        <div style={{ marginTop: 3 }}>
          <span className="pill" style={{ background: 'var(--pur)18', color: 'var(--pur)', border: '1px solid var(--pur)33' }}>
            DIV
          </span>
        </div>
      )}
    </Link>
  );
}
