import { fmtOdds } from '../lib/odds.js';

function parseProps(data) {
  if (!data) return { pitchers: [], batters: [] };
  const pitcherMap = {};
  const batterMap = {};

  (data.bookmakers || []).forEach(bk => {
    (bk.markets || []).forEach(mkt => {
      (mkt.outcomes || []).forEach(o => {
        const name = o.description;
        if (!name) return;
        const dir = o.name === 'Over' ? 'bestOver' : 'bestUnder';
        const bookDir = dir + 'Book';

        if (mkt.key === 'pitcher_strikeouts' || mkt.key === 'pitcher_outs') {
          if (!pitcherMap[name]) pitcherMap[name] = { name, ks: {}, outs: {} };
          const bucket = mkt.key === 'pitcher_strikeouts' ? pitcherMap[name].ks : pitcherMap[name].outs;
          if (!bucket.line && o.point != null) bucket.line = o.point;
          if (!bucket[dir] || o.price > bucket[dir]) { bucket[dir] = o.price; bucket[bookDir] = bk.title; }
        }

        if (['batter_hits', 'batter_home_runs', 'batter_total_bases', 'batter_rbis'].includes(mkt.key)) {
          if (!batterMap[name]) batterMap[name] = { name, hits: {}, hr: {}, tb: {}, rbi: {} };
          const bmap = { batter_hits: 'hits', batter_home_runs: 'hr', batter_total_bases: 'tb', batter_rbis: 'rbi' };
          const bucket = batterMap[name][bmap[mkt.key]];
          if (!bucket.line && o.point != null) bucket.line = o.point;
          if (!bucket[dir] || o.price > bucket[dir]) { bucket[dir] = o.price; bucket[bookDir] = bk.title; }
        }
      });
    });
  });

  return {
    pitchers: Object.values(pitcherMap),
    batters: Object.values(batterMap).filter(b => b.hits.line != null || b.hr.line != null || b.tb.line != null),
  };
}

function PropLine({ label, data }) {
  if (!data || data.line == null) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 6, marginBottom: 4, alignItems: 'center' }}>
      <div style={{
        background: 'var(--grn)0d', borderRadius: 6, padding: '4px 8px',
        border: '1px solid var(--grn)33', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--grn)', fontFamily: 'var(--mono)' }}>
          {data.bestOver ? fmtOdds(data.bestOver) : '--'}
        </div>
        <div style={{ fontSize: 8, color: 'var(--mut)' }}>{data.bestOverBook || ''}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--mono)' }}>{data.line}</div>
      </div>
      <div style={{
        background: 'var(--red)0d', borderRadius: 6, padding: '4px 8px',
        border: '1px solid var(--red)33', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--mono)' }}>
          {data.bestUnder ? fmtOdds(data.bestUnder) : '--'}
        </div>
        <div style={{ fontSize: 8, color: 'var(--mut)' }}>{data.bestUnderBook || ''}</div>
      </div>
    </div>
  );
}

export default function PropsTable({ propsData, loading }) {
  if (loading) return (
    <div style={{ color: 'var(--dim)', fontSize: 11, textAlign: 'center', padding: 20 }}>Loading props...</div>
  );
  if (!propsData) return null;

  const { pitchers, batters } = parseProps(propsData);

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: 'var(--grn)', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>OVER</div>
        <div style={{ fontSize: 9, color: 'var(--mut)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>Line</div>
        <div style={{ fontSize: 9, color: 'var(--red)', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>UNDER</div>
      </div>

      {/* Pitchers */}
      {pitchers.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Pitcher Strikeouts
          </div>
          {pitchers.map((p, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>{p.name}</div>
              <PropLine label="K" data={p.ks} />
              <PropLine label="Outs" data={p.outs} />
            </div>
          ))}
        </div>
      )}

      {/* Batters */}
      {batters.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Batter Props
          </div>
          {batters.slice(0, 15).map((b, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--bdr)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>{b.name}</div>
              <PropLine label="Hits" data={b.hits} />
              <PropLine label="HR" data={b.hr} />
              <PropLine label="TB" data={b.tb} />
              <PropLine label="RBI" data={b.rbi} />
            </div>
          ))}
        </div>
      )}

      {pitchers.length === 0 && batters.length === 0 && (
        <div style={{ color: 'var(--dim)', fontSize: 11, textAlign: 'center', padding: '10px 0' }}>
          No props data available for this game yet
        </div>
      )}
    </div>
  );
}
