import React, { useEffect, useRef, useState } from 'react';

/**
 * Real-data Atmospheric Anemometer Gauge
 * - Sustained arc    → mean wind speed across all turbines (backend avg)
 * - Red needle       → cycles through REAL per-turbine wind speeds from backend
 * - Gust spread arc  → real min→max range across all turbine locations
 * - Stats bar        → real min / mean / max / std from backend data
 */
export default function WindGauge({ value = 0, turbines = [], max = 25 }) {
  const canvasRef = useRef(null);

  // Real instantaneous reading: cycle through actual turbine wind speeds
  const [instantReading, setInstantReading] = useState(value);
  const turbineIndexRef = useRef(0);

  useEffect(() => {
    if (!turbines || turbines.length === 0) {
      // No turbine data yet — hold at mean
      setInstantReading(value);
      return;
    }

    // Cycle through real turbine wind speeds every 300ms
    // (backend updates per 300ms poll in useSimulation)
    const interval = setInterval(() => {
      const t = turbines[turbineIndexRef.current % turbines.length];
      if (t && typeof t.wind_speed === 'number') {
        setInstantReading(prev => prev + (t.wind_speed - prev) * 0.3); // smooth transition
      }
      turbineIndexRef.current += 1;
    }, 300);

    return () => clearInterval(interval);
  }, [turbines, value]);

  // Derived real statistics from backend turbine array
  const speeds = turbines.map(t => t.wind_speed).filter(v => typeof v === 'number' && v >= 0);
  const realMin  = speeds.length ? Math.min(...speeds) : value;
  const realMax  = speeds.length ? Math.max(...speeds) : value;
  const realMean = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : value;
  const realStd  = speeds.length && realMean > 0
    ? Math.sqrt(speeds.reduce((sum, v) => sum + Math.pow(v - realMean, 2), 0) / speeds.length)
    : 0;

  const clampedBase  = Math.min(value, max);
  const clampedGust  = Math.min(instantReading, max);
  const clampedMin   = Math.min(realMin, max);
  const clampedMax   = Math.min(realMax, max);
  const pctBase = clampedBase / max;

  // Beaufort scale mapping
  const getWindDesc = (v) => {
    if (v < 1.5)  return { label: 'Calm (B0)',           color: '#8ba4c0' };
    if (v < 3.3)  return { label: 'Light Air (B1)',       color: '#00e5a0' };
    if (v < 5.4)  return { label: 'Light Breeze (B2)',    color: '#00d4ff' };
    if (v < 7.9)  return { label: 'Gentle Breeze (B3)',   color: '#0080ff' };
    if (v < 10.7) return { label: 'Moderate (B4)',        color: '#f3c623' };
    if (v < 13.8) return { label: 'Fresh Breeze (B5)',    color: '#ff8c00' };
    if (v < 17.1) return { label: 'Strong (B6)',          color: '#ff4757' };
    return             { label: 'Gale/Storm (>B7)',       color: '#d81b60' };
  };

  const { label, color } = getWindDesc(clampedBase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.72;
    const R  = W * 0.38;

    ctx.clearRect(0, 0, W, H);

    const startAngle = Math.PI * 0.75;
    const endAngle   = Math.PI * 2.25;
    const totalAngle = endAngle - startAngle;

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Color gradient sustained arc (mean wind)
    if (pctBase > 0) {
      const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      grad.addColorStop(0,   '#00e5a0');
      grad.addColorStop(0.5, '#00d4ff');
      grad.addColorStop(0.8, '#f3c623');
      grad.addColorStop(1,   '#ff4757');

      ctx.beginPath();
      ctx.arc(cx, cy, R, startAngle, startAngle + totalAngle * pctBase);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Real gust spread arc: min → max across turbine locations
    if (speeds.length > 0 && realMax > realMin) {
      const minAngle = startAngle + totalAngle * (clampedMin / max);
      const maxAngle = startAngle + totalAngle * (clampedMax / max);
      ctx.beginPath();
      ctx.arc(cx, cy, R, minAngle, maxAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 18;
      ctx.stroke();
    }

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle  = startAngle + (totalAngle * i) / 10;
      const isMain = i % 5 === 0;
      const inner  = R - (isMain ? 30 : 24);
      const outer  = R - 10;
      ctx.beginPath();
      ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
      ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
      ctx.strokeStyle = isMain ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = isMain ? 2 : 1;
      ctx.stroke();
    }

    // Real instantaneous needle (cycles through real turbine readings)
    const needleAngle = startAngle + totalAngle * (Math.min(clampedGust, max) / max);
    const nLen = R - 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nLen * Math.cos(needleAngle), cy + nLen * Math.sin(needleAngle));
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Mean wind marker (blue tick)
    const baseAngle = startAngle + totalAngle * (clampedBase / max);
    ctx.beginPath();
    ctx.moveTo(cx + (R - 22) * Math.cos(baseAngle), cy + (R - 22) * Math.sin(baseAngle));
    ctx.lineTo(cx + (R + 8)  * Math.cos(baseAngle), cy + (R + 8)  * Math.sin(baseAngle));
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [clampedBase, clampedGust, clampedMin, clampedMax, max, pctBase, realMin, realMax, speeds.length]);

  return (
    <div className="wind-gauge-wrap">
      <canvas ref={canvasRef} width={220} height={160} style={{ width: '100%', maxWidth: 220 }} />

      <div className="gauge-value-label" style={{ color }}>
        {clampedBase.toFixed(1)}{' '}
        <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>m/s</span>
      </div>
      <div className="gauge-sub-label">{label}</div>

      {/* Real data stats bar */}
      {speeds.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          marginTop: 8,
          width: '100%',
          fontSize: 10,
          textAlign: 'center',
        }}>
          {[
            { label: 'MIN', value: `${realMin.toFixed(1)}`, color: '#00e5a0' },
            { label: 'MEAN', value: `${realMean.toFixed(1)}`, color: '#00d4ff' },
            { label: 'MAX', value: `${realMax.toFixed(1)}`, color: '#ff4757' },
            { label: 'σ', value: `${realStd.toFixed(2)}`, color: '#f3c623' },
          ].map(({ label: l, value: v, color: c }) => (
            <div key={l} style={{ color: 'var(--text-muted)' }}>
              <div style={{ color: c, fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{v}</div>
              <div style={{ fontSize: 9, marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 6, width: '100%' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>0</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'linear-gradient(90deg,#00e5a0,#00d4ff,#f3c623,#ff4757)', opacity: 0.6 }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{max}</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
        {speeds.length > 0
          ? `Live readings · ${speeds.length} turbine nodes`
          : 'Waiting for turbine data…'}
        <br />
        <span style={{ color: '#ff3366', fontSize: 9 }}>● needle</span>
        {' = instantaneous · '}
        <span style={{ color: '#00d4ff', fontSize: 9 }}>| tick</span>
        {' = sustained mean'}
      </div>
    </div>
  );
}
