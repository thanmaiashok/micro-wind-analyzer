import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(5,13,26,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
          <strong>{label}</strong> • v₀: {payload[0]?.payload['Wind Speed']} m/s
        </div>
        {payload.map((entry, i) => {
          if (entry.name === 'Wind Speed') return null; // Don't show wind speed twice
          return (
            <p key={i} style={{ color: entry.color, fontWeight: 600, display: 'flex', justifyContent: 'space-between', width: 150 }}>
              <span>{entry.name}</span>
              <span>{Number(entry.value).toFixed(2)} kW</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function PowerChart({ turbines = [], rotorDiameter = 18.0 }) {
  // Betz Limit Theoretical Power Equation: P_max = 0.5 * ρ * A * v³ * Cp_betz
  const rho = 1.225; // Air Density kg/m3
  const cpBetz = 0.593; // Theoretical max efficiency
  const area = Math.PI * Math.pow(rotorDiameter / 2, 2);

  const calcBetzPowerKw = (v) => {
    return (0.5 * rho * area * Math.pow(v, 3) * cpBetz) / 1000;
  };

  const chartData = (turbines && turbines.length > 0)
    ? turbines.map((t, i) => {
        const v = t.wind_speed || 0;
        return {
          name: `TRB-${(i + 1).toString().padStart(2, '0')}`,
          'Actual Yield (kW)': parseFloat(((t.power || 0) / 1000).toFixed(2)),
          'Betz Limit (kW)': parseFloat(calcBetzPowerKw(v).toFixed(2)),
          'Wind Speed': parseFloat(v.toFixed(2)),
        }
      })
    : Array.from({ length: 8 }, (_, i) => ({ 
        name: `TRB-${(i+1).toString().padStart(2, '0')}`, 
        'Actual Yield (kW)': 0, 
        'Betz Limit (kW)': 0, 
        'Wind Speed': 0 
      }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.25}/>
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gradWind" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#00e5a0" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 4 }}
        />
        <Area
          type="monotone"
          dataKey="Actual Yield (kW)"
          stroke="#00e5a0"
          strokeWidth={2}
          fill="url(#gradWind)"
          dot={{ r: 2, fill: '#00e5a0' }}
          activeDot={{ r: 5, fill: '#00e5a0' }}
        />
        <Area
          type="monotone"
          dataKey="Betz Limit (kW)"
          stroke="#00d4ff"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#gradPower)"
          dot={false}
          activeDot={{ r: 4, fill: '#00d4ff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
