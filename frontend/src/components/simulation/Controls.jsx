import React, { useState } from 'react';

/**
 * City dropdown to fetch OSM boundaries
 */
export function CitySelector({ onCitySelected, isLoading }) {
  const cities = [
    { name: 'Select Location...', bbox: null },
    { name: 'Seattle (Downtown)', bbox: [47.603, -122.336, 47.608, -122.329] },
    { name: 'Manhattan (Financial District)', bbox: [40.704, -74.013, 40.710, -74.005] },
    { name: 'London (City)', bbox: [51.512, -0.095, 51.517, -0.085] },
    { name: 'Berlin (Mitte)', bbox: [52.515, 13.390, 52.522, 13.400] },
    { name: 'Tokyo (Shibuya)', bbox: [35.655, 139.695, 35.665, 139.705] }
  ];

  return (
    <div className="sim-section">
      <div className="sim-section-title">Urban Location</div>
      <div className="glass-card" style={{ padding: 12 }}>
        <select 
          onChange={(e) => {
            const city = cities[e.target.value];
            if (city.bbox) onCitySelected(city.bbox, city.name);
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(5,13,26,0.8)',
            color: 'var(--text-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '4px',
            outline: 'none',
            fontSize: '13px'
          }}
          disabled={isLoading}
        >
          {cities.map((city, i) => (
            <option key={i} value={i}>{city.name}</option>
          ))}
        </select>
        {isLoading && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
            Fetching real building data...
          </div>
        )}
      </div>
    </div>
  );
}

export function WindControls({ speed, setSpeed, direction, setDirection }) {
  return (
    <div className="sim-section">
      <div className="sim-section-title">Live Wind Inputs</div>
      
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="slider-group">
          <div className="slider-row">
            <div className="slider-label">
              <span>Wind Speed</span>
              <strong>{speed.toFixed(1)} m/s</strong>
            </div>
            <input 
              type="range" 
              min="0" max="25" step="0.5" 
              value={speed} 
              onChange={(e) => setSpeed(Number(e.target.value))} 
            />
          </div>

          <div className="slider-row" style={{ marginTop: 12 }}>
            <div className="slider-label">
              <span>Direction</span>
              <strong>{direction}°</strong>
            </div>
            <input 
              type="range" 
              min="0" max="359" step="1" 
              value={direction} 
              onChange={(e) => setDirection(Number(e.target.value))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CapacityAnalyzer({ speed }) {
  // --- Real Aerodynamic Physics ---
  const rho = 1.225;       // Air density at sea level, kg/m³
  const cpActual = 0.35;   // Realistic modern small-turbine Cp (well below Betz 0.593)
  const cpBetz = 0.593;    // Betz theoretical limit
  const rotorDiam = 18.0;  // Reference turbine diameter, m
  const area = Math.PI * Math.pow(rotorDiam / 2, 2);

  // P = 0.5 * ρ * A * v³ * Cp
  const pActualW   = speed > 3 ? 0.5 * rho * area * Math.pow(speed, 3) * cpActual : 0;
  const pBetzW     = speed > 3 ? 0.5 * rho * area * Math.pow(speed, 3) * cpBetz   : 0;
  const pActualKw  = pActualW / 1000;
  const pBetzKw    = pBetzW / 1000;

  // Aerodynamic efficiency against Betz:
  const aerodynamicEff = pBetzW > 0 ? (pActualW / pBetzW) * 100 : 0;

  // Turbine cut-in: 3 m/s, rated: 12 m/s, cut-out: 25 m/s
  const isCutIn = speed >= 3.0;
  const isRated = speed >= 12.0;
  const isCutOut = speed >= 25.0;

  // Tip Speed Ratio: λ = ω·R / v  (optimal λ ≈ 7 for modern 3-blade HAWT)
  const optimalTSR = 7.0;
  const bladeRadius = rotorDiam / 2;
  const optOmega = (optimalTSR * speed) / bladeRadius; // rad/s
  const optRpm = (optOmega * 60) / (2 * Math.PI);

  // Site Capacity Factor — Rayleigh wind distribution (Weibull k=2).
  // CF = 0.612*(v/v_rated)^3  →  fraction of rated hours at this wind speed.
  // Capped at 0.40 for urban environments. Range: 0.05 (low) – 0.40 (high).
  const capacityFactor = Math.min(0.40, Math.max(0.05, 0.612 * Math.pow(Math.min(speed, 25) / 12.0, 3)));

  // Annual Energy Production (AEP):
  const aepKwh = pActualKw * 8760 * capacityFactor;
  const aepMwh = aepKwh / 1000;

  const statusLabel = isCutOut ? 'SHUTDOWN (Cut-out)' : isRated ? 'Rated Power' : isCutIn ? 'Ramping' : 'Below Cut-in';
  const statusColor = isCutOut ? '#ff4757' : isRated ? '#00e5a0' : isCutIn ? '#f3c623' : '#8ba4c0';

  return (
    <div className="sim-section">
      <div className="sim-section-title">Urban Aerodynamic Snapshot</div>
      
      <div className="capacity-grid">
        <div className="cap-metric">
          <div className="cap-metric-val">{pActualKw.toFixed(2)}</div>
          <div className="cap-metric-label">Actual Output (kW)</div>
        </div>
        <div className="cap-metric">
          <div className="cap-metric-val" style={{ color: '#00d4ff' }}>{pBetzKw.toFixed(2)}</div>
          <div className="cap-metric-label">Betz Limit (kW)</div>
        </div>
        <div className="cap-metric">
          <div className="cap-metric-val">{aerodynamicEff.toFixed(1)}%</div>
          <div className="cap-metric-label">Cp Efficiency</div>
        </div>
        <div className="cap-metric">
          <div className="cap-metric-val">{aepMwh > 0 ? aepMwh.toFixed(2) : '0'}</div>
          <div className="cap-metric-label">AEP (MWh/yr)</div>
        </div>
      </div>
      
      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, lineHeight: 1.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Cp (actual / Betz)</span>
          <strong style={{ color: 'var(--text-primary)' }}>{cpActual.toFixed(3)} / {cpBetz.toFixed(3)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tip Speed Ratio (λ)</span>
          <strong style={{ color: 'var(--text-primary)' }}>{speed > 0 ? optimalTSR.toFixed(1) : '—'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Optimal RPM</span>
          <strong style={{ color: 'var(--text-primary)' }}>{speed > 0 ? optRpm.toFixed(0) : '—'} rpm</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ρ (Air Density)</span>
          <strong style={{ color: 'var(--text-primary)' }}>1.225 kg/m³</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>Turbine State</span>
          <strong style={{ color: statusColor }}>{statusLabel}</strong>
        </div>
      </div>
    </div>
  );
}

const TURBINES = [
  { id: 't1', model: 'Helix H5 VAWT', di: 1.5, cp: 0.28, minSpeed: 2.5, install: 'Roof Edge' },
  { id: 't2', model: 'Compact C1 HAWT', di: 0.8, cp: 0.32, minSpeed: 3.0, install: 'Balcony/Ledge' },
  { id: 't3', model: 'RidgeLine R10', di: 3.0, cp: 0.40, minSpeed: 4.5, install: 'High-Rise Roof' }
];

export function TurbineRecommendation({ speed }) {
  const [selected, setSelected] = useState('t1');
  const rho = 1.225; // Air density kg/m³

  const calcOutput = (di, cp) => {
    const area = Math.PI * Math.pow(di / 2, 2);
    return speed > 0 ? 0.5 * rho * area * Math.pow(speed, 3) * cp / 1000 : 0;
  };

  const calcThrust = (di) => {
    const area = Math.PI * Math.pow(di / 2, 2);
    const ct = 0.8; // Thrust coefficient
    return speed > 0 ? (0.5 * rho * area * Math.pow(speed, 2) * ct).toFixed(0) : 0;
  };

  return (
    <div className="sim-section">
      <div className="sim-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        Turbine Physics Comparison
        <span style={{ fontSize: 9, color: 'var(--accent-cyan)' }}>ρ=1.225 kg/m³</span>
      </div>
      
      <div className="recommendation-cards">
        {TURBINES.map(t => {
          const outputKw = calcOutput(t.di, t.cp);
          const thrustN  = calcThrust(t.di);
          const isViable = speed >= t.minSpeed;
          return (
            <div 
              key={t.id} 
              className={`rec-card ${selected === t.id ? 'selected' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <div className="rec-card-header">
                <div className="rec-card-name" style={{ fontSize: 12 }}>{t.model}</div>
                <div className="rec-card-power" style={{ fontSize: 11, color: isViable ? 'var(--accent-green)' : '#ff8c00' }}>
                  {outputKw.toFixed(3)} kW
                </div>
              </div>
              <div className="rec-card-specs">
                <div className="rec-spec">D: <strong>{t.di}m</strong></div>
                <div className="rec-spec">Cp: <strong>{t.cp.toFixed(2)}</strong></div>
                <div className="rec-spec">Thrust: <strong>{thrustN}N</strong></div>
                <div className="rec-spec">Min v: <strong>{t.minSpeed} m/s</strong></div>
              </div>
              <div className="suitability">
                <div className="suitability-bar" style={{ width: `${Math.min(100, isViable ? (outputKw / 2) * 100 : 5)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
