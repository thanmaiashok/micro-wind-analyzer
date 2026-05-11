import React from 'react';

/**
 * KPI Card — color-coded metric tile
 * accent: CSS color value (var(--accent-cyan) etc.)
 */
export default function KpiCard({ label, value, unit, trend, trendUp, icon, accent = 'var(--accent-cyan)', glow }) {
  return (
    <div
      className="kpi-card"
      style={{
        '--kpi-accent': accent,
        '--kpi-glow': glow || `${accent}22`,
      }}
    >
      {/* Background icon */}
      {icon && (
        <div className="kpi-icon-bg">
          {icon}
        </div>
      )}

      <div className="kpi-label">{label}</div>

      <div className="kpi-value">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {trend !== undefined && (
        <div className={`kpi-trend ${trendUp === false ? 'down' : ''}`}>
          {trendUp !== false ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
