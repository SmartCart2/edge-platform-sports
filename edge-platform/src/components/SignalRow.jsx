import { supabase } from '../lib/supabase.js';

const RESULTS = ['Pending', 'Win', 'Loss', 'Push', 'No Action'];

export default function SignalRow({ signal, onUpdate, onDelete, editable = true }) {
  const rc = { Win: 'var(--grn)', Loss: 'var(--red)', Push: 'var(--gold)', Pending: 'var(--dim)', 'No Action': 'var(--mut)' };
  const c = rc[signal.result] || 'var(--dim)';

  async function updateResult(result) {
    const { error } = await supabase
      .from('signals')
      .update({ result, graded_at: result !== 'Pending' ? new Date().toISOString() : null })
      .eq('id', signal.id);
    if (!error && onUpdate) onUpdate({ ...signal, result });
  }

  async function deleteSignal() {
    if (!confirm('Delete this signal?')) return;
    await supabase.from('signals').delete().eq('id', signal.id);
    if (onDelete) onDelete(signal.id);
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--bdr)',
      borderRadius: 8,
      padding: '10px 14px',
      display: 'grid',
      gridTemplateColumns: '90px 1fr 90px 70px 80px 90px',
      gap: 10,
      alignItems: 'center',
      fontSize: 11,
    }}>
      {/* Date + sport */}
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)' }}>{signal.game_date}</div>
        <div style={{ fontSize: 9, color: 'var(--mut)', marginTop: 1 }}>{signal.sport} · {signal.market}</div>
      </div>

      {/* Game + pick */}
      <div>
        <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{signal.game}</div>
        <div style={{ color: 'var(--gold)', fontFamily: 'var(--mono)', marginTop: 2, fontSize: 12 }}>{signal.pick}</div>
        {signal.signal_source && (
          <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>{signal.signal_source}</div>
        )}
      </div>

      {/* Line / odds */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--txt)' }}>{signal.line ?? '—'}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{signal.odds ?? '—'}</div>
      </div>

      {/* Confidence */}
      <div style={{ textAlign: 'center' }}>
        {signal.confidence && (
          <span className="pill" style={{
            background: signal.confidence === 'High' ? 'var(--grn)18' : signal.confidence === 'Low' ? 'var(--red)18' : 'var(--gold)18',
            color: signal.confidence === 'High' ? 'var(--grn)' : signal.confidence === 'Low' ? 'var(--red)' : 'var(--gold)',
            border: `1px solid ${signal.confidence === 'High' ? 'var(--grn)' : signal.confidence === 'Low' ? 'var(--red)' : 'var(--gold)'}44`,
          }}>
            {signal.confidence}
          </span>
        )}
      </div>

      {/* Result */}
      <div style={{ textAlign: 'center' }}>
        {editable ? (
          <select
            value={signal.result}
            onChange={e => updateResult(e.target.value)}
            style={{
              background: `${c}11`,
              border: `1px solid ${c}44`,
              borderRadius: 5,
              padding: '3px 6px',
              color: c,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className="pill" style={{ background: `${c}18`, color: c, border: `1px solid ${c}33` }}>
            {signal.result}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {editable && (
          <button onClick={deleteSignal} style={{
            fontSize: 9, color: 'var(--red)88', background: 'none',
            border: '1px solid var(--red)22', borderRadius: 5, padding: '3px 8px',
          }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
