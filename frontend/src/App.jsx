import React, { useState, useEffect } from 'react';
import { useSimulation } from './hooks/useSimulation';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import WindSimulationPage from './pages/WindSimulationPage';
import ResearchPage from './pages/ResearchPage';
import './styles.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  const simulation = useSimulation();

  useEffect(() => {
    simulation.fetchTerrain();
    simulation.fetchWind();
    simulation.fetchStatus();
    simulation.fetchTurbines();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        status={simulation.status}
      />
      <div className="page-area" style={{ position: 'relative' }}>
        <div style={{ display: activePage === 'dashboard' ? 'block' : 'none', minHeight: '100%' }}>
          <DashboardPage
            simulation={simulation}
            currentTime={currentTime}
          />
        </div>
        <div style={{ display: activePage === 'simulation' ? 'block' : 'none', minHeight: '100%' }}>
          <WindSimulationPage
            simulation={simulation}
            currentTime={currentTime}
          />
        </div>
        <div style={{ display: activePage === 'research' ? 'block' : 'none', minHeight: '100%' }}>
          <ResearchPage />
        </div>
      </div>
    </div>
  );
}

export default App;
