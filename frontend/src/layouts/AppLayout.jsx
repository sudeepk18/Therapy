import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/sidebar/Sidebar';
import Header  from '../components/header/Header';
import './AppLayout.css';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {/* Ambient background glow elements */}
      <div className="ambient-glow ambient-glow--teal" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--violet" aria-hidden="true" />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="app-main">
        <Header />
        <main className="app-content">
          <div className="app-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
