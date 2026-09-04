import { useState } from 'react';

interface Incident {
  id: string;
  title: string;
  service: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Active' | 'In Progress' | 'Resolved';
  impact: string;
  created: string;
  owner: string;
}

export function IncidentsView() {
  const [filter, setFilter] = useState<'All' | 'Active' | 'In Progress' | 'Resolved'>('All');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const incidents: Incident[] = [
    {
      id: 'INC-8902',
      title: 'Payment Gateway High HTTP 500 Error Rate',
      service: 'Payment Gateway',
      severity: 'Critical',
      status: 'Active',
      impact: '1,240 checkout failures',
      created: '12m ago',
      owner: 'Tyler B.'
    },
    {
      id: 'INC-8899',
      title: 'Database Connection Pool Exhaustion on Postgres Cluster',
      service: 'PostgreSQL Main DB',
      severity: 'High',
      status: 'Active',
      impact: '450 slow queries (>2s)',
      created: '45m ago',
      owner: 'Unassigned'
    },
    {
      id: 'INC-8895',
      title: 'Redis Cache Memory Usage Exceeded 90% Threshold',
      service: 'Redis Cluster',
      severity: 'High',
      status: 'In Progress',
      impact: 'Session latency +85ms',
      created: '1h 20m ago',
      owner: 'Sarah K.'
    },
    {
      id: 'INC-8890',
      title: 'Inventory Rate Limiting Threshold Reached',
      service: 'Inventory API',
      severity: 'Medium',
      status: 'In Progress',
      impact: 'Sync delayed for 12 sellers',
      created: '2h ago',
      owner: 'Alex M.'
    },
    {
      id: 'INC-8884',
      title: 'OAuth Token Refresh Flakiness during Traffic Peak',
      service: 'Auth Gateway',
      severity: 'Low',
      status: 'Resolved',
      impact: 'Auto-retried by client SDK',
      created: '4h ago',
      owner: 'Tyler B.'
    },
    {
      id: 'INC-8878',
      title: 'Search Index Re-index Delay during Batch Ingestion',
      service: 'Search Service',
      severity: 'Low',
      status: 'Resolved',
      impact: 'Product index stale by 3m',
      created: '6h ago',
      owner: 'Sarah K.'
    }
  ];

  const filteredIncidents = incidents.filter(
    (inc) => filter === 'All' || inc.status === filter
  );

  const getSeverityStyle = (severity: Incident['severity']) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  const getStatusStyle = (status: Incident['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-rose-500 text-white';
      case 'In Progress':
        return 'bg-amber-500 text-white';
      case 'Resolved':
        return 'bg-emerald-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Active Incidents</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">error_outline</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">3</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-rose-600 bg-rose-100">
              <span className="material-symbols-outlined text-[13px]">arrow_upward</span> 1 Critical
            </span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Requires SRE attention</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Unassigned Triage</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 border border-amber-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">person_alert</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">1</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-700 bg-amber-100">
              Pending Lead
            </span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Postgres DB Pool</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">MTTA (Ack Time)</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">av_timer</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">1.8 min</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-100">
              <span className="material-symbols-outlined text-[13px]">arrow_downward</span> 42s faster
            </span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">AI auto-triage enabled</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">MTTR (Resolve Time)</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">timer</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">5.2 min</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-indigo-700 bg-indigo-100">
              <span className="material-symbols-outlined text-[13px]">arrow_downward</span> 58% lower
            </span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">99.9% uptime SLA target</p>
        </div>
      </div>

      {/* Action Bar & Filter Pills */}
      <div className="p-4 clay-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['All', 'Active', 'In Progress', 'Resolved'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                filter === tab
                  ? 'bg-[#5c67f5] text-white shadow-sm'
                  : 'bg-slate-100 text-on-surface-variant hover:bg-slate-200/80'
              }`}
            >
              {tab} {tab === 'All' ? '(6)' : tab === 'Active' ? '(2)' : tab === 'In Progress' ? '(2)' : '(2)'}
            </button>
          ))}
        </div>

        <button 
          type="button"
          className="px-5 py-2.5 rounded-full bg-[#5c67f5] text-white font-semibold text-[13px] shadow-md hover:bg-[#4f59e8] transition-all flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_alert</span>
          <span>Declare Incident</span>
        </button>
      </div>

      {/* Spacious Incidents List */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[16px] font-bold text-on-surface">Incident Directory</h2>
          <span className="text-[12px] text-on-surface-variant font-medium">Showing {filteredIncidents.length} incidents</span>
        </div>

        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div 
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border mt-0.5 ${getSeverityStyle(incident.severity)}`}>
                  {incident.severity}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-bold text-slate-500">{incident.id}</span>
                    <h3 className="font-bold text-[15px] text-on-surface">{incident.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">dns</span> {incident.service}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">group</span> {incident.impact}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">•</span>
                    <span>Created {incident.created}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${getStatusStyle(incident.status)}`}>
                  {incident.status}
                </span>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700" title={`Assigned to ${incident.owner}`}>
                    {incident.owner.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-on-surface">{incident.owner}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Detail Drawer Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="clay-card max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-500">{selectedIncident.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSeverityStyle(selectedIncident.severity)}`}>
                  {selectedIncident.severity}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedIncident(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-on-surface leading-snug">{selectedIncident.title}</h2>
              <p className="text-[13px] text-on-surface-variant">
                Target Service: <strong>{selectedIncident.service}</strong> | Impacted: {selectedIncident.impact}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <span className="text-[11px] font-bold text-[#5c67f5] uppercase tracking-wider">AI Root Cause Analysis</span>
              <p className="text-[13px] text-on-surface leading-relaxed">
                Detected abnormal TCP re-transmissions leading to thread pool saturation downstream on <code>{selectedIncident.service}</code>. Automated mitigation recommended resetting DB connection limits.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-full clay-button text-[13px] font-semibold text-on-surface"
              >
                Close
              </button>
              <button 
                type="button"
                onClick={() => {
                  alert(`Resolved incident ${selectedIncident.id}`);
                  setSelectedIncident(null);
                }}
                className="px-5 py-2 rounded-full bg-emerald-600 text-white font-semibold text-[13px] shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px]">check_circle</span>
                <span>Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
