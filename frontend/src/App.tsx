import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { IncidentsView } from './components/IncidentsView';
import { AlertsView } from './components/AlertsView';
import { ServicesView } from './components/ServicesView';
import { TopologyView } from './components/TopologyView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'incidents':
        return <IncidentsView />;
      case 'alerts':
        return <AlertsView />;
      case 'services':
        return <ServicesView />;
      case 'topology':
        return <TopologyView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="w-full min-h-screen relative font-body-md text-on-surface">
      {/* Background Glow Blobs & Dot Matrix Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-dot-matrix opacity-80 pointer-events-none"></div>
        <div className="absolute -top-32 left-44 w-[600px] h-[500px] rounded-full bg-[#cbd5f5]/40 blur-[130px] pointer-events-none"></div>
        <div className="absolute top-28 right-32 w-[650px] h-[550px] rounded-full bg-[#dbe4fb]/50 blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-20 left-1/3 w-[700px] h-[500px] rounded-full bg-[#e0e7ff]/40 blur-[130px] pointer-events-none"></div>
      </div>

      {/* Shared Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Page Area */}
      <div className="pl-72 pr-6 py-5 relative z-10 max-w-[1440px] mx-auto">
        <Header title={activeTab} />
        <main className="w-full pb-12">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
