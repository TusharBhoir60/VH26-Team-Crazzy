import { useState } from 'react';

export function SettingsView() {
  const [subTab, setSubTab] = useState<'rules' | 'integrations' | 'noise' | 'team'>('rules');
  const [sensitivity, setSensitivity] = useState<number>(94);

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Bar */}
      <div className="p-4 clay-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(
            [
              { id: 'rules', label: 'Alert Rules' },
              { id: 'integrations', label: 'Integrations' },
              { id: 'noise', label: 'Noise Thresholds' },
              { id: 'team', label: 'Team & Roles' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                subTab === tab.id
                  ? 'bg-[#5c67f5] text-white shadow-sm'
                  : 'bg-slate-100 text-on-surface-variant hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button 
          type="button"
          onClick={() => alert('Settings saved successfully')}
          className="px-5 py-2 rounded-full bg-[#5c67f5] text-white text-[13px] font-semibold shadow-md hover:bg-[#4f59e8]"
        >
          Save Changes
        </button>
      </div>

      {/* Tab 1: Alert Rules */}
      {subTab === 'rules' && (
        <div className="clay-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[18px] font-extrabold text-on-surface">AIOps Noise Reduction Rules</h2>
            <p className="text-[13px] text-slate-500">Configure machine learning clustering, deduplication windows, and auto-triage policies.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-[15px] text-on-surface">Auto-Deduplicate High-Frequency Spikes</h3>
                <p className="text-[12px] text-slate-500">Collapse multiple identical HTTP 5xx or database errors into a single incident card within 5 minutes.</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#5c67f5] rounded cursor-pointer" />
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-[15px] text-on-surface">Flapping Alert Suppression</h3>
                <p className="text-[12px] text-slate-500">Automatically silence alerts that trigger and clear rapidly within a 15-minute window.</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#5c67f5] rounded cursor-pointer" />
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-[15px] text-on-surface">Blast Radius Graph Correlation</h3>
                <p className="text-[12px] text-slate-500">Correlate downstream microservice failures to their root cause upstream node in the topology graph.</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#5c67f5] rounded cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Integrations */}
      {subTab === 'integrations' && (
        <div className="clay-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[18px] font-extrabold text-on-surface">Connected Observability & Messaging Tools</h2>
            <p className="text-[13px] text-slate-500">Manage incoming telemetry channels and outbound dispatch destinations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5c67f5] flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-on-surface">Slack Notification Bot</h3>
                  <span className="text-[12px] text-emerald-600 font-semibold">Connected to #sre-alerts-critical</span>
                </div>
              </div>
              <button type="button" className="px-3.5 py-1.5 rounded-full clay-button text-[12px] font-semibold text-on-surface">
                Configure
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-on-surface">PagerDuty On-Call Sync</h3>
                  <span className="text-[12px] text-emerald-600 font-semibold">Connected (Production SRE)</span>
                </div>
              </div>
              <button type="button" className="px-3.5 py-1.5 rounded-full clay-button text-[12px] font-semibold text-on-surface">
                Configure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Noise Thresholds */}
      {subTab === 'noise' && (
        <div className="clay-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[18px] font-extrabold text-on-surface">AI Noise Filter Sensitivity</h2>
            <p className="text-[13px] text-slate-500">Tune the strictness of automatic alert grouping.</p>
          </div>

          <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-4 max-w-xl">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-bold text-on-surface">Noise Reduction Ratio</span>
              <span className="text-[20px] font-extrabold text-[#5c67f5]">{sensitivity}% Target</span>
            </div>

            <input 
              type="range" 
              min="80" 
              max="98" 
              value={sensitivity} 
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-[#5c67f5] cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Conservative (80%)</span>
              <span>Balanced (90%)</span>
              <span>Aggressive (98%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Team & Roles */}
      {subTab === 'team' && (
        <div className="clay-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold text-on-surface">SRE Team Members & On-Call Roles</h2>
              <p className="text-[13px] text-slate-500">Manage incident response permissions.</p>
            </div>
            <button type="button" className="px-4 py-2 rounded-full bg-[#5c67f5] text-white text-[13px] font-semibold">
              + Invite Member
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                  TB
                </div>
                <div>
                  <h3 className="font-bold text-[14px] text-on-surface">Tyler B.</h3>
                  <span className="text-[12px] text-slate-500">tyler@company.com</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-[#5c67f5] text-[12px] font-bold">
                Lead SRE Admin
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs">
                  SK
                </div>
                <div>
                  <h3 className="font-bold text-[14px] text-on-surface">Sarah K.</h3>
                  <span className="text-[12px] text-slate-500">sarah@company.com</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[12px] font-bold">
                On-Call Responder
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
