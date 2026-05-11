import React, { useCallback } from 'react';
import KpiCard from '../components/dashboard/KpiCard';
import WindGauge from '../components/dashboard/WindGauge';
import PowerChart from '../components/dashboard/PowerChart';
import LiveTelemetryPanel from '../components/dashboard/LiveTelemetryPanel';

export default function DashboardPage({ simulation, currentTime }) {
  const { status, turbines, wind, placementInsight, loading, startSimulation, stopSimulation, optimizePlacement } = simulation;

  const avgWindSpeed = turbines?.length
    ? turbines.reduce((s, t) => s + t.wind_speed, 0) / turbines.length
    : (wind?.wind_speed?.length
      ? wind.wind_speed.flat().reduce((sum, v) => sum + v, 0) / wind.wind_speed.flat().length
      : 0);

  const predictedPlacements = placementInsight?.turbines?.length ?? turbines?.length ?? 0;
  const totalPredictedW = placementInsight?.total_power ?? status?.total_power ?? 0;
  const totalPredictedKw = totalPredictedW / 1000;
  
  // Aerodynamic math — 18 m rotor matches backend TurbinePhysics default
  const rotorDiameter = 18.0;
  const rotorArea = Math.PI * Math.pow(rotorDiameter / 2, 2); // 254.47 m²
  const airDensity = 1.225; // kg/m³ at sea level, 15°C (ISA standard)
  const totalSweptArea = predictedPlacements * rotorArea;
  
  const theoreticalPowerMaxW = totalSweptArea > 0 ? (0.5 * airDensity * totalSweptArea * Math.pow(Math.max(avgWindSpeed, 0.1), 3)) : 0;
  const calculatedCp = theoreticalPowerMaxW > 0 ? Math.min(0.593, totalPredictedW / theoreticalPowerMaxW) : 0;
  
  // Real TSR: under MPPT variable-speed control the turbine tracks λ_opt = 7.5 from cut-in
  // wind (3 m/s) up to rated wind — no fake oscillation, this is the actual control setpoint.
  const optimumTSR = avgWindSpeed >= 3 ? 7.5 : 0;

  // Real Turbulence Intensity: TI = σ(wind) / μ(wind) × 100%
  // Computed from the actual wind-speed grid returned by the backend /wind endpoint.
  const windFlat = wind?.wind_speed?.flat() ?? [];
  const windMean = windFlat.length
    ? windFlat.reduce((a, b) => a + b, 0) / windFlat.length
    : 0;
  const windStd = windFlat.length && windMean > 0
    ? Math.sqrt(windFlat.reduce((sum, v) => sum + Math.pow(v - windMean, 2), 0) / windFlat.length)
    : 0;
  const turbulenceIntensity = windMean > 0 ? (windStd / windMean) * 100 : 0;

  const aerodynamicStatus = calculatedCp > 0.4 ? 'Highly Efficient' : calculatedCp > 0.2 ? 'Nominal Operation' : 'Sub-optimal State';
  const efficiencyScore = Math.round((calculatedCp / 0.593) * 100) || 0;

  const displayedPlacements = placementInsight?.turbines?.length ? placementInsight.turbines : turbines;

  const runLiveAnalysis = useCallback(async () => {
    const analysisParams = {
      num_turbines: 8,
      base_wind_speed: Math.max(3, avgWindSpeed || 10),
      base_wind_direction: 270,
      grid_size: 100,
      turbulence: 0.2,
      rotor_diameter: 18.0
    };
    await startSimulation(analysisParams);
    await optimizePlacement(analysisParams);
    // Refresh wind so TI reflects current field
    if (simulation.fetchWind) await simulation.fetchWind();
  }, [avgWindSpeed, startSimulation, optimizePlacement, simulation]);

  // Auto-start on first mount so telemetry flows without manual click
  const hasAutoStarted = React.useRef(false);
  React.useEffect(() => {
    if (!hasAutoStarted.current && !status?.is_running) {
      hasAutoStarted.current = true;
      runLiveAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-IN', { hour12: false });

  return (
    <div className="dashboard-page animate-in">
      <div className="dashboard-header">
        <div>
          <h2>Urban Micro-Wind Analysis</h2>
          <div className="status-text" style={{ color: 'var(--text-secondary)' }}>
            System Time: {timeStr} • {status?.is_running ? 'Simulation Active' : 'Idle'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn glass-btn" 
            onClick={status?.is_running ? stopSimulation : runLiveAnalysis}
            disabled={loading}
          >
            {status?.is_running ? 'Stop Analysis' : 'Run Live Analysis'}
          </button>
        </div>
      </div>

      <div className="kpi-grid animate-in">
        <KpiCard 
          label="Power Coefficient (Cp)" 
          value={calculatedCp.toFixed(3)} 
          unit="Cp"
          trend={`Betz Limit: 0.593`} 
          trendUp={calculatedCp > 0.3} 
        />
        <KpiCard 
          label="Total Aerodynamic Yield" 
          value={totalPredictedKw.toFixed(2)} 
          unit="kW"
          trend={`From ${predictedPlacements} Turbines`} 
          trendUp={totalPredictedKw > 0} 
        />
        <KpiCard 
          label="Tip Speed Ratio (λ)" 
          value={optimumTSR.toFixed(1)} 
          unit="TSR"
          trend={`Optimal Design: 7.5`}
          trendUp={optimumTSR >= 7.0} 
        />
        <KpiCard 
          label="Turbulence Intensity" 
          value={turbulenceIntensity.toFixed(1)} 
          unit="%"
          trend={`Air Density: 1.225 kg/m³`} 
          trendUp={false} 
        />
      </div>

      <div className="dashboard-main-grid animate-in" style={{ animationDelay: '0.15s' }}>
        <div className="glass-card dashboard-panel dashboard-left-panel">
          <div className="card-header">
            <h3>Atmospheric Flow</h3>
          </div>
          <div className="card-body dashboard-fixed-body">
          <WindGauge value={avgWindSpeed} turbines={turbines} max={25} />
          </div>
        </div>

        <div className="glass-card dashboard-panel dashboard-right-panel">
          <div className="card-header">
            <h3>Projected Energy Generation (kW)</h3>
          </div>
          <div className="card-body dashboard-fixed-body">
            <PowerChart turbines={turbines} />
          </div>
        </div>
      </div>

      <div className="glass-card dashboard-panel" style={{ padding: '12px 16px' }}>
        <div className="status-text" style={{ color: 'var(--text-secondary)' }}>
          Thermodynamic Efficiency: <strong style={{ color: 'var(--text-primary)' }}>{efficiencyScore}% of Betz Limit</strong> • {aerodynamicStatus}
          {' '}• System Analysis: {efficiencyScore > 70 ? 'Optimal aerodynamic extraction within localized shear profile.' : 'Significant kinetic energy bypassing rotor swept area.'}
        </div>
      </div>

      {/* ── Live Telemetry ── */}
      <div className="glass-card dashboard-panel" style={{ padding: '16px' }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              borderRadius: '50%',
              background: status?.is_running ? '#00e5a0' : '#8ba4c0',
              boxShadow: status?.is_running ? '0 0 6px #00e5a0' : 'none',
            }} />
            Live Telemetry Stream
          </h3>
        </div>
        <LiveTelemetryPanel
          status={status}
          turbines={turbines}
          isRunning={!!status?.is_running}
        />
      </div>

      <div className="glass-card dashboard-panel dashboard-bottom-panel animate-in" style={{ animationDelay: '0.2s' }}>
        <div className="card-header">
          <h3>Real-Time Aerodynamic Logging Array</h3>
        </div>
        <div className="table-responsive dashboard-table-wrap">
          <table className="turbine-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Vector (X, Z)</th>
                <th>Local Velocity (v₀)</th>
                <th>Kinetic Extraction</th>
              </tr>
            </thead>
            <tbody>
              {displayedPlacements && displayedPlacements.length > 0 ? (
                displayedPlacements.slice(0, 8).map((t, i) => {
                  const pwr = t.power || t.power_output || 0;
                  const nodeCp = (0.5 * airDensity * rotorArea * Math.pow(Math.max(t.wind_speed || 0.1, 0.1), 3)) > 0 
                     ? Math.min(0.593, pwr / (0.5 * airDensity * rotorArea * Math.pow(Math.max(t.wind_speed || 0.1, 0.1), 3)))
                     : 0;
                  return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>TRB-{(i+1).toString().padStart(3, '0')}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      [{t.x.toFixed(1)}, {t.y.toFixed(1)}]
                    </td>
                    <td>
                      <span className={`status-dot ${t.wind_speed > 8 ? 'good' : 'avg'}`}></span>
                      {t.wind_speed.toFixed(2)} m/s <span style={{fontSize: 10, color: 'var(--text-muted)'}}>(θ={t.wind_direction?.toFixed(0) || 270}°)</span>
                    </td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                      {(pwr / 1000).toFixed(2)} kW <span style={{fontSize: 10, color: 'var(--text-muted)'}}>(Cp: {nodeCp.toFixed(3)})</span>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No deployments evaluated. Run analysis to see recommendations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
