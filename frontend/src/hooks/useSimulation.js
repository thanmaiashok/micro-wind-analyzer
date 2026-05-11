import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export const useSimulation = () => {
  const [status, setStatus] = useState({
    is_running: false,
    current_time: 0,
    total_power: 0,
    turbine_count: 0,
    timestamp: new Date().toISOString()
  });

  const [turbines, setTurbines] = useState([]);
  const [terrain, setTerrain] = useState(null);
  const [wind, setWind] = useState(null);
  const [missZones, setMissZones] = useState([]);
  const [placementInsight, setPlacementInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiService.getStatus();
      setStatus(response.data);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch status: ${err.message}`);
    }
  }, []);

  // Fetch turbine data
  const fetchTurbines = useCallback(async () => {
    try {
      const response = await apiService.getTurbines();
      setTurbines(response.data.turbines || []);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch turbines: ${err.message}`);
    }
  }, []);

  // Fetch terrain
  const fetchTerrain = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getTerrain();
      setTerrain(response.data);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch terrain: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch wind
  const fetchWind = useCallback(async () => {
    try {
      const response = await apiService.getWind();
      setWind(response.data);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch wind: ${err.message}`);
    }
  }, []);

  // Fetch miss zones (high-potential uncovered spots)
  const fetchMissZones = useCallback(async () => {
    try {
      const response = await apiService.getMissZones(12);
      setMissZones(response.data.miss_zones || []);
    } catch (_) {
      // Non-critical — silently ignore if sim not initialised yet
    }
  }, []);

  // Start simulation
  const startSimulation = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      await apiService.startSimulation(params);
      await fetchStatus();
      await fetchTurbines();
      setError(null);
    } catch (err) {
      setError(`Failed to start simulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, fetchTurbines]);

  // Stop simulation
  const stopSimulation = useCallback(async () => {
    try {
      await apiService.stopSimulation();
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(`Failed to stop simulation: ${err.message}`);
    }
  }, [fetchStatus]);

  // Pause simulation
  const pauseSimulation = useCallback(async () => {
    try {
      await apiService.pauseSimulation();
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(`Failed to pause simulation: ${err.message}`);
    }
  }, [fetchStatus]);

  // Resume simulation
  const resumeSimulation = useCallback(async () => {
    try {
      await apiService.resumeSimulation();
      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(`Failed to resume simulation: ${err.message}`);
    }
  }, [fetchStatus]);

  // Reset simulation
  const resetSimulation = useCallback(async () => {
    try {
      await apiService.resetSimulation();
      await fetchStatus();
      setTurbines([]);
      setError(null);
    } catch (err) {
      setError(`Failed to reset simulation: ${err.message}`);
    }
  }, [fetchStatus]);

  // Optimize placement
  const optimizePlacement = useCallback(async (params) => {
    try {
      setLoading(true);
      const response = await apiService.optimize(params);
      setPlacementInsight({
        ...response.data,
        params,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (err) {
      setError(`Failed to optimize placement: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Real-time updates: WebSocket push + HTTP fallback polling ──────────────
  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let destroyed = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    const connect = () => {
      if (destroyed || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//localhost:8000/ws/simulation`);

        ws.onopen = () => { attempts = 0; }; // reset backoff on success

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'status' && msg.data) {
              setStatus(prev => ({ ...prev, ...msg.data }));
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          if (!destroyed && attempts < MAX_ATTEMPTS) {
            // Exponential backoff: 2s, 4s, 8s … max 30s
            const delay = Math.min(2000 * Math.pow(2, attempts - 1), 30000);
            reconnectTimer = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => { try { ws.close(); } catch (_) {} };
      } catch (_) {}
    };

    connect();

    // HTTP fallback: always poll (primary source when WS is down)
    const poll = setInterval(() => {
      fetchStatus();
      fetchTurbines();
      if (status.is_running) fetchMissZones();
    }, status.is_running ? 300 : 2000);

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(poll);
      if (ws) { try { ws.close(); } catch (_) {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.is_running]);

  return {
    status,
    turbines,
    terrain,
    wind,
    missZones,
    placementInsight,
    loading,
    error,
    fetchStatus,
    fetchTurbines,
    fetchTerrain,
    fetchWind,
    fetchMissZones,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    optimizePlacement
  };
};
