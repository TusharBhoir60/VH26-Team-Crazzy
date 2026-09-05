import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'incidents', label: 'Incidents', icon: 'confirmation_number' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications' },
    { id: 'services', label: 'Services', icon: 'hub' },
    { id: 'topology', label: 'Topology', icon: 'account_tree' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <aside className="fixed left-5 top-5 bottom-5 w-64 z-50 flex flex-col justify-between p-4 clay-card">
      <div className="flex flex-col gap-5">
        {/* Brand & System Title */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4f59e8] to-[#717cf7] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(92,103,245,0.35)]">
              <span className="material-symbols-outlined text-[22px]">auto_graph</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[17px] leading-tight text-on-surface tracking-tight">MAYDAY</span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">expand_more</span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">Alert Fatigue Buster</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 pt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl font-medium text-[14px] transition-all text-left ${
                  isActive
                    ? 'bg-[#eff1fe] text-[#5c67f5] font-semibold shadow-[0_2px_8px_rgba(92,103,245,0.08)]'
                    : 'text-on-surface-variant hover:bg-slate-100/80 hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-[#5c67f5] text-white' : 'bg-slate-200/80 text-on-surface-variant'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Workspace */}
      <div className="flex flex-col gap-3 pt-2 relative">
        {isMenuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full p-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 flex flex-col gap-1 z-50">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <div className="text-[13px] font-bold text-on-surface">{isSignedIn ? 'Tyler B.' : 'Guest User'}</div>
              <div className="text-[11px] text-slate-500">{isSignedIn ? 'tyler@workemail.com' : 'Not signed in'}</div>
            </div>
            <button
              onClick={() => {
                setIsSignedIn(!isSignedIn);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSignedIn ? 'logout' : 'login'}
              </span>
              {isSignedIn ? 'Sign out' : 'Sign in (Work email only)'}
            </button>
          </div>
        )}

        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-500 text-white flex items-center justify-center font-semibold text-xs shadow-sm ring-2 ring-white">
              {isSignedIn ? 'TB' : '?'}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-bold text-on-surface">
                {isSignedIn ? 'Tyler B.' : 'Sign In'}
              </span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">
                {isSignedIn ? 'tyler@workemail.com' : 'Work Email Only'}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            {isMenuOpen ? 'expand_more' : 'expand_less'}
          </span>
        </div>
      </div>
    </aside>
  );
}
