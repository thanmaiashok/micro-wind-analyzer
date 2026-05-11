import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const MAX_POINTS = 60;
const BETZ_CP = 0.593;
const AIR_DENSITY = 1.225;
const ROTOR_AREA = Math.PI * Math.pow(18.0 / 2, 2);

function calcCp(totalPowerW, windSpeedMs, turbineCount) {
  if (!turbineCount || !windSpeedMs) return 0;
  const theoreticalMax = 0.5 * AIR_DENSITY * (ROTOR_AREA * turbineCount) * Math.pow(windSpeedMs, 3);
  return theoreticalMax > 0 ? Math.min(BETZ_CP, totalPowerW / theoreticalMax) : 0;
}

const LiveTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(5,13,26,0.97)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 11,
      minWidth: 180,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace' }}>
        T+{label}s
      </div>
      {payload.map((entry, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          color: entry.color,
          fontWeight: 600,
          lineHeight: 1.8
        }}>
          <span>{entry.name}</span>
          <span>{typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function LiveTelemetryPanel({ status, turbines, isRunning }) {
  const [series, setSeries] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const tickRef = useRef(0);
  const intervalRef = useRef(null);

  // Use refs so interval always sees latest values WITHOUT resetting
  const statusRef = useRef(status);
  const turbinesRef = useRef(turbines);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { turbinesRef.current = turbines; }, [turbines]);

  const startStreaming = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    tickRef.current = 0;
    setSeries([]);

    intervalRef.current = setInterval(() => {
      const s = statusRef.current;
      const t = turbinesRef.current || [];
      const totalPowerW = s?.total_power ?? 0;
      const turbineCount = s?.turbine_count ?? t.length ?? 0;
      const avgWindSpeed = t.length
        ? t.reduce((acc, x) => acc + (x.wind_speed || 0), 0) / t.length
        : 0;
      const cp = calcCp(totalPowerW, avgWindSpeed, turbineCount);
      tickRef.current += 1;

      setSeries(prev => {
        const next = [...prev, {
          t: tickRef.current,
          'Power (kW)': parseFloat((totalPowerW / 1000).toFixed(2)),
          'Wind (m/s)': parseFloat(avgWindSpeed.toFixed(2)),
          'Cp': parseFloat(cp.toFixed(4)),
        }];
        return next.slice(-MAX_POINTS);
      });
    }, 500);  // 500ms = 2 samples/sec for smooth charts
    setStreaming(true);
  }, []);

  // Auto-start when simulation begins, auto-stop when it ends
  const prevRunning = useRef(false);
  useEffect(() => {
    if (isRunning && !prevRunning.current) {
      startStreaming();
    }
    if (!isRunning && prevRunning.current) {
      clearInterval(intervalRef.current);
      setStreaming(false);
    }
    prevRunning.current = isRunning;
    return () => {};
  }, [isRunning, startStreaming]);

  // Catch the case where sim was already running when this component mounted
  useEffect(() => {
    if (isRunning && !streaming) {
      startStreaming();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);


  const latestPower = series[series.length - 1]?.['Power (kW)'] ?? 0;
  const latestWind = series[series.length - 1]?.['Wind (m/s)'] ?? 0;
  const latestCp = series[series.length - 1]?.['Cp'] ?? 0;
  const peakPower = series.length ? Math.max(...series.map(d => d['Power (kW)'])) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Live KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}>
        {[
          { label: 'Live Power', value: `${latestPower.toFixed(1)} kW`, color: '#00e5a0', blink: isRunning },
          { label: 'Avg Wind', value: `${latestWind.toFixed(2)} m/s`, color: '#00d4ff', blink: false },
          { label: 'Live Cp', value: latestCp.toFixed(4), color: latestCp > 0.4 ? '#00e5a0' : '#f3c623', blink: false },
          { label: 'Peak Power', value: `${peakPower.toFixed(1)} kW`, color: '#c77dff', blink: false },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              {kpi.blink && isRunning && (
                <span style={{
                  display: 'inline-block', width: 6, height: 6,
                  borderRadius: '50%', background: '#00e5a0',
                  marginRight: 4,
                  animation: 'pulse 1s infinite',
                }} />
              )}
              {kpi.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color, fontFamily: 'monospace' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Power + Wind dual-axis chart */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '12px 4px 4px 0',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 16, marginBottom: 4 }}>
          POWER OUTPUT vs WIND SPEED  · last {MAX_POINTS}s
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={series} margin={{ top: 0, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="t" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false}
              tickFormatter={v => `${v}s`}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#00e5a0' }} tickLine={false} axisLine={false} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#00d4ff' }} tickLine={false} axisLine={false} width={36} />
            <Tooltip content={<LiveTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} />
            <Line yAxisId="left" type="monotone" dataKey="Power (kW)" stroke="#00e5a0" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="Wind (m/s)" stroke="#00d4ff" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cp over time chart */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '12px 4px 4px 0',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 16, marginBottom: 4 }}>
          POWER COEFFICIENT (Cp)  · Betz Limit = 0.593
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={series} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}s`} interval="preserveStartEnd" />
            <YAxis domain={[0, 0.65]} tick={{ fontSize: 9, fill: '#f3c623' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<LiveTooltip />} />
            <ReferenceLine y={BETZ_CP} stroke="#ff4757" strokeDasharray="4 4" label={{ value: 'Betz 0.593', position: 'insideTopRight', fontSize: 9, fill: '#ff4757' }} />
            <Line type="monotone" dataKey="Cp" stroke="#f3c623" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!streaming && series.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px 0',
          color: 'var(--text-muted)',
          fontSize: 12,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {isRunning ? (
            <div>
              <div style={{ marginBottom: 10 }}>Simulation is running — click to start live stream</div>
              <button
                onClick={startStreaming}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #00e5a0, #00d4ff)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#050d1a',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ▶ Start Telemetry Stream
              </button>
            </div>
          ) : (
            <div>⚡ Click <strong>"Run Live Analysis"</strong> at the top to start the simulation and see live data stream here</div>
          )}
        </div>
      )}
      {!streaming && series.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)', paddingTop: 4 }}>
          <span>Simulation stopped — {series.length} data points recorded</span>
          <button
            onClick={startStreaming}
            disabled={!isRunning}
            style={{
              padding: '4px 12px',
              background: isRunning ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isRunning ? '#00e5a0' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 4,
              color: isRunning ? '#00e5a0' : 'var(--text-muted)',
              fontSize: 10,
              cursor: isRunning ? 'pointer' : 'default',
            }}
          >
            {isRunning ? 'Restart Stream' : 'Simulation Idle'}
          </button>
        </div>
      )}
    </div>
  );
}
