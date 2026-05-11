import React, { useEffect, useMemo, useState } from 'react';
import SimulationViewer from '../components/simulation/SimulationViewer';
import { WindControls, CapacityAnalyzer, TurbineRecommendation } from '../components/simulation/Controls';

/**
 * Merge placement predictions that are within `threshold` grid cells of each other.
 * When spots cluster, average their (x,y) position and power into a single marker.
 * This prevents multiple beacons stacking on the same rooftop.
 */
function mergeNearbyPredictions(predictions, threshold = 36) {
  if (!predictions.length) return predictions;
  const used = new Set();
  const merged = [];

  for (let i = 0; i < predictions.length; i++) {
    if (used.has(i)) continue;
    const cluster = [predictions[i]];
    used.add(i);

    for (let j = i + 1; j < predictions.length; j++) {
      if (used.has(j)) continue;
      const dx = predictions[i].x - predictions[j].x;
      const dy = predictions[i].y - predictions[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        cluster.push(predictions[j]);
        used.add(j);
      }
    }

    if (cluster.length === 1) {
      merged.push(cluster[0]);
    } else {
      // Average the cluster into one representative spot
      const n = cluster.length;
      merged.push({
        ...cluster[0],                          // keep metadata shape
        x: Math.round(cluster.reduce((s, p) => s + p.x, 0) / n),
        y: Math.round(cluster.reduce((s, p) => s + p.y, 0) / n),
        power_output: cluster.reduce((s, p) => s + (p.power_output || 0), 0) / n,
        wind_speed:   cluster.reduce((s, p) => s + (p.wind_speed   || 0), 0) / n,
        wind_direction: cluster.reduce((s, p) => s + (p.wind_direction || 0), 0) / n,
        _merged_count: n,   // informational
      });
    }
  }
  return merged;
}

export default function WindSimulationPage({ simulation, currentTime }) {
  // Local wind overrides for simulation viewer
  const { fetchMissZones, missZones } = simulation;
  const [windSpeed, setWindSpeed] = useState(12.5);
  const [windDirection, setWindDirection] = useState(270);
  const [predictions, setPredictions] = useState([]);
  const [predictionMeta, setPredictionMeta] = useState({ totalPower: 0, averagePower: 0, efficiency: 0 });
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [selectedSpotKey, setSelectedSpotKey] = useState(null);
  const [viewerResetToken, setViewerResetToken] = useState(0);

  const windBand = windSpeed < 5 ? 'Light' : windSpeed < 10 ? 'Moderate' : windSpeed < 15 ? 'Strong' : 'Very Strong';

  const sortedPredictions = useMemo(() => {
    const merged = mergeNearbyPredictions(predictions, 36);
    return [...merged].sort((a, b) => b.power_output - a.power_output);
  }, [predictions]);

  // Real physics constants — consistent with backend 18 m rotor
  const rho = 1.225;
  const rotorArea = Math.PI * Math.pow(18.0 / 2, 2);

  // Site capacity factor — Rayleigh wind distribution (Weibull k=2, standard for wind energy)
  // CF = 0.612 * (v/v_rated)^3, capped at 0.40 for urban environments.
  // This gives: v=5 m/s → CF≈0.04, v=8 → CF≈0.18, v=10 → CF≈0.35, v=12 → CF≈0.40
  const siteCF = (v) => Math.min(0.40, Math.max(0.05, 0.612 * Math.pow(Math.min(v, 25) / 12.0, 3)));

  const annualEstimateKwh = useMemo(() => {
    return (predictionMeta.totalPower / 1000) * 8760 * siteCF(windSpeed);
  }, [predictionMeta.totalPower, windSpeed]);

  const selectedPlacement = useMemo(() => {
    return sortedPredictions.find((p) => `${p.x}-${p.y}` === selectedSpotKey) || null;
  }, [sortedPredictions, selectedSpotKey]);

  const selectedMonthlyKwh = useMemo(() => {
    if (!selectedPlacement) return 0;
    const v = selectedPlacement.wind_speed || windSpeed;
    return (selectedPlacement.power_output / 1000) * 24 * 30 * siteCF(v);
  }, [selectedPlacement, windSpeed]);

  const selectedYearlyKwh = useMemo(() => {
    if (!selectedPlacement) return 0;
    const v = selectedPlacement.wind_speed || windSpeed;
    return (selectedPlacement.power_output / 1000) * 8760 * siteCF(v);
  }, [selectedPlacement, windSpeed]);

  useEffect(() => {
    // Keep camera in a stable overview whenever simulation starts/stops.
    setViewerResetToken((v) => v + 1);
  }, [simulation.status?.is_running]);

  const runPlacementPrediction = async () => {
    try {
      setPredicting(true);
      setPredictionError(null);

      const result = await simulation.optimizePlacement({
        grid_size: 100,
        num_turbines: 8,
        base_wind_speed: windSpeed,
        base_wind_direction: windDirection,
        turbulence: 0.2,
        rotor_diameter: 18.0
      });

      const predicted = result?.turbines || [];
      const sorted = [...predicted].sort((a, b) => b.power_output - a.power_output);

      setPredictions(predicted);
      setPredictionMeta({
        totalPower: result?.total_power || 0,
        averagePower: result?.average_power || 0,
        efficiency: result?.efficiency || 0
      });
      // Refresh miss zones now that turbines have changed
      fetchMissZones();
      // Keep current selection if still present, otherwise clear.
      setSelectedSpotKey((prev) => {
        if (!prev) return null;
        return sorted.some((p) => `${p.x}-${p.y}` === prev) ? prev : null;
      });

      // Force a stable full-map framing right after predictions refresh.
      setViewerResetToken((v) => v + 1);
    } catch (err) {
      setPredictionError('Could not calculate placement right now. Please try again.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="simulation-page animate-in">
      <div className="sim-left-panel">
        <div className="sim-header glass-card">
          <div className="sim-kicker">Urban Wind Studio</div>
          <h2>Micro-Turbine Placement Studio</h2>
          <div className="sim-subtitle">
            Test wind behavior, inspect rooftop fit, and compare practical micro-turbine options in one place.
          </div>
        </div>

        <div className="sim-section">
          <div className="sim-section-title">Live Wind State</div>
          <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Wind compass */}
            <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
              {/* Compass ring */}
              <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5"/>
              <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="10"/>
              {/* N/S/E/W labels */}
              {[['N',28,7],['S',28,51],['E',51,30],['W',5,30]].map(([l,x,y]) => (
                <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(0,212,255,0.5)" fontSize="8" fontFamily="Inter,sans-serif" fontWeight="600">{l}</text>
              ))}
              {/* Arrow — rotated by windDirection degrees */}
              <g transform={`rotate(${windDirection}, 28, 28)`}>
                <polygon points="28,6 31,28 28,34 25,28" fill="#00d4ff" opacity="0.9"/>
                <polygon points="28,50 31,28 28,34 25,28" fill="rgba(255,255,255,0.2)"/>
              </g>
              <circle cx="28" cy="28" r="3" fill="#00d4ff"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {windSpeed.toFixed(1)} m/s
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  {windBand}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                {windDirection}° — {['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(windDirection/22.5)%16]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                {currentTime.toLocaleTimeString('en-IN', { hour12: false })} • 3D preview active
              </div>
            </div>
          </div>
        </div>
        
        <WindControls 
          speed={windSpeed} setSpeed={setWindSpeed}
          direction={windDirection} setDirection={setWindDirection}
        />

        <div className="sim-section">
          <div className="sim-section-title">Placement Prediction</div>
          <div className="glass-card placement-card">
            <button
              className="btn btn-primary"
              onClick={runPlacementPrediction}
              disabled={predicting}
            >
              {predicting ? 'Predicting...' : 'Predict Optimal Zones'}
            </button>

            <div className="placement-meta-grid">
              <div className="cap-metric">
                <div className="cap-metric-val">{(predictionMeta.totalPower / 1000).toFixed(2)}</div>
                <div className="cap-metric-label">Total Predicted (kW)</div>
              </div>
              <div className="cap-metric">
                <div className="cap-metric-val">{annualEstimateKwh.toFixed(0)}</div>
                <div className="cap-metric-label">Annual Estimate (kWh)</div>
              </div>
            </div>

            {predictionError && (
              <div className="prediction-error">{predictionError}</div>
            )}

            {sortedPredictions.length > 0 && (
              <div className="placement-list">
                {sortedPredictions.slice(0, 5).map((p, idx) => (
                  <button
                    className={`placement-row ${selectedSpotKey === `${p.x}-${p.y}` ? 'selected' : ''}`}
                    key={`${p.x}-${p.y}-${idx}`}
                    onClick={() => setSelectedSpotKey(`${p.x}-${p.y}`)}
                    type="button"
                  >
                    <div>
                      <div className="placement-title">
                        {p.placement_category === 'ROOFTOP' ? '🏢 Rooftop' : 
                         p.placement_category === 'ELEVATED' ? '⬆ Elevated' : '🌿 Ground'}
                        {p._merged_count > 1 ? ` (Avg of ${p._merged_count})` : ''}
                      </div>
                      <div className="placement-sub">Grid ({p.x}, {p.y})</div>
                    </div>
                    <div className="placement-power">{(p.power_output / 1000).toFixed(2)} kW</div>
                  </button>
                ))}
              </div>
            )}

            {selectedPlacement && (
              <div className="spot-report">
                <div className="spot-report-title">Selected Spot — Aerodynamic Report</div>
                <div className="spot-report-grid">
                  <div className="spot-report-item">
                    <span>Grid Position</span>
                    <strong>[{selectedPlacement.x}, {selectedPlacement.y}]</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Installation</span>
                    <strong>{selectedPlacement.placement_category || 'UNKNOWN'}</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Local Velocity (v₀)</span>
                    <strong>{selectedPlacement.wind_speed?.toFixed(3)} m/s</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Wind Direction (θ)</span>
                    <strong>{selectedPlacement.wind_direction?.toFixed(1)}°</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Kinetic Flux (½ρv³)</span>
                    <strong>{(0.5 * rho * Math.pow(selectedPlacement.wind_speed || 0, 3)).toFixed(1)} W/m²</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Power Output</span>
                    <strong>{(selectedPlacement.power_output / 1000).toFixed(3)} kW</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Power Coeff. (Cp)</span>
                    <strong>{(() => {
                      const v = Math.max(selectedPlacement.wind_speed || 0.1, 0.1);
                      const denom = 0.5 * rho * rotorArea * Math.pow(v, 3);
                      return denom > 0
                        ? Math.min(0.593, selectedPlacement.power_output / denom).toFixed(3)
                        : '—';
                    })()}</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Thrust Force (FT)</span>
                    <strong>{(0.5 * rho * rotorArea * Math.pow(selectedPlacement.wind_speed || 0, 2) * 0.8).toFixed(1)} N</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Monthly Estimate</span>
                    <strong>{selectedMonthlyKwh.toFixed(0)} kWh</strong>
                  </div>
                  <div className="spot-report-item">
                    <span>Yearly Estimate</span>
                    <strong>{selectedYearlyKwh.toFixed(0)} kWh</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <CapacityAnalyzer speed={windSpeed} />
        <TurbineRecommendation speed={windSpeed} />
      </div>

      <div className="sim-right-panel glass-card" style={{ margin: 20, position: 'relative', overflow: 'hidden', padding: 0 }}>
        <SimulationViewer 
          windSpeed={windSpeed}
          windDirection={windDirection}
          placements={sortedPredictions}
          missZones={missZones}
          selectedSpotKey={selectedSpotKey}
          onSelectSpot={setSelectedSpotKey}
          resetToken={viewerResetToken}
        />
        
        <div className="viewer-info-chip">
          <div className="viewer-info-label">LIVE PREVIEW</div>
          <div className="viewer-info-title">Urban Flow Preview</div>
          <div className="viewer-info-sub">Direction {windDirection}° • Speed {windSpeed.toFixed(1)} m/s</div>
        </div>
      </div>
    </div>
  );
}
