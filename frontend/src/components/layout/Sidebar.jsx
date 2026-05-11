import React from 'react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: 'simulation',
    label: 'Wind Simulation',
    badge: '3D',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
      </svg>
    ),
  },
  {
    id: 'research',
    label: 'Research Results',
    badge: 'REAL',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2z"/>
        <path d="M15 7v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z"/>
        <path d="M3 7h4M17 3h4"/>
      </svg>
    ),
  },
];

export default function Sidebar({ activePage, onNavigate, status }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="brand">WindSim Pro</span>
          <span className="tagline">Turbine Optimizer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span className="nav-badge" style={item.badge === 'REAL' ? {
                background: 'rgba(0,229,160,0.15)', color: '#00e5a0',
                borderColor: 'rgba(0,229,160,0.3)'
              } : {}}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer Status */}
      <div className="sidebar-footer">
        <div className="connection-status">
          <div className="status-dot" />
          <span className="status-text">Local Session Active</span>
        </div>
        {status?.is_running && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', fontSize: 11, color: 'var(--accent-green)', fontWeight: 600 }}>
            ● Simulation Running
          </div>
        )}
      </div>
    </aside>
  );
}
