export default function ROICurve({ signals, width = 400, height = 100 }) {
  const graded = [...signals]
    .filter(s => ['Win','Loss','Push'].includes(s.result))
    .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

  if (graded.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mut)', fontSize: 11, fontFamily: 'var(--mono)' }}>
        — log graded signals to see ROI curve —
      </div>
    );
  }

  let running = 0;
  const points = [{ x: 0, y: 0 }];
  graded.forEach((s, i) => {
    if (s.result === 'Win') {
      const odds = s.odds || -110;
      running += odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    } else if (s.result === 'Loss') {
      running -= 1;
    }
    points.push({ x: i + 1, y: Math.round(running * 100) / 100 });
  });

  const maxX = points[points.length - 1].x;
  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const pad = 8;

  const sx = x => pad + (x / maxX) * (width - pad * 2);
  const sy = y => (height - pad) - ((y - minY) / range) * (height - pad * 2);

  const lastY = points[points.length - 1].y;
  const lineColor = lastY >= 0 ? 'var(--grn)' : 'var(--red)';

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`
  ).join(' ');

  const fillD = `${pathD} L${sx(maxX).toFixed(1)},${height - pad} L${sx(0).toFixed(1)},${height - pad} Z`;
  const zeroY = sy(0);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {zeroY > pad && zeroY < height - pad && (
        <line x1={pad} y1={zeroY.toFixed(1)} x2={width - pad} y2={zeroY.toFixed(1)}
          stroke="var(--mut)" strokeWidth="0.5" strokeDasharray="3,3" />
      )}
      <path d={fillD} fill="url(#roiGrad)" />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
