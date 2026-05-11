import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const apiService = {
  // Health & Status
  getHealth: () => api.get('/health'),
  getStatus: () => api.get('/status'),

  // Simulation Control
  startSimulation: (params) => api.post('/simulation/start', { params }),
  stopSimulation: () => api.post('/simulation/stop'),
  pauseSimulation: () => api.post('/simulation/pause'),
  resumeSimulation: () => api.post('/simulation/resume'),
  resetSimulation: () => api.post('/simulation/reset'),

  // Data Endpoints
  getTerrain: () => api.get('/terrain'),
  getWind: () => api.get('/wind'),
  getTurbines: () => api.get('/turbines'),
  getMissZones: (topN = 12) => api.get(`/wind/miss-zones?top_n=${topN}`),
  optimize: (params) => api.post('/optimize', params),

  // WebSocket
  connectWebSocket: (onMessage) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/simulation`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    return ws;
  }
};

export default api;
