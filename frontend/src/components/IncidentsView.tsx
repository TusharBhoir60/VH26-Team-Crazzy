import { useState, useEffect } from 'react';

interface Incident {
  incident_id: string;
  title?: string;
  root_cause_service: string;
  severity: string;
  state: string;
  impact?: string;
  started_at: string;
  affected_services: string[];
  root_cause_alertname?: string;
  alerts?: Array<{ fingerprint: string; alertname: string; service: string; severity_score: string }>;
}

interface DashboardStats {
  mttr_seconds: number;
  mtta_seconds: number;
  critical_alerts_total: number;
  notifications_sent: number;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = (seconds / 60).toFixed(1);
  return `${m} min`;
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mapSeverity(s: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  const l = s.toLowerCase();
  if (l === 'critical') return 'Critical';
  if (l === 'high') return 'High';
  if (l === 'medium') return 'Medium';
  return 'Low';
}

function mapStatus(s: string): 'Active' | 'In Progress' | 'Resolved' {
  const l = s.toLowerCase();
  if (l === 'resolved') return 'Resolved';
  if (l === 'investigating' || l === 'in_progress') return 'In Progress';
  return 'Active';
}

export function IncidentsView() {
  const [filter, setFilter] = useState<'All' | 'Active' | 'In Progress' | 'Resolved'>('All');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/incidents')
      .then(res => res.json())
      .then(data => setIncidents(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching incidents:', err));

    fetch('/api/v1/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  const activeCount = incidents.filter(i => mapStatus(i.state) === 'Active').length;
  const inProgressCount = incidents.filter(i => mapStatus(i.state) === 'In Progress').length;
  const resolvedCount = incidents.filter(i => mapStatus(i.state) === 'Resolved').length;

  const filteredIncidents = incidents.filter((inc) => {
    const status = mapStatus(inc.state);
    return filter === 'All' || status === filter;
  });

  const criticalActive = incidents.filter(i => i.severity.toLowerCase() === 'critical' && mapStatus(i.state) === 'Active').length;

  const getSeverityStyle = (severity: string) => {
    const s = mapSeverity(severity);
    switch (s) {
      case 'Critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  const getStatusStyle = (state: string) => {
    const s = mapStatus(state);
    switch (s) {
      case 'Active': return 'bg-rose-500 text-white';
      case 'In Progress': return 'bg-amber-500 text-white';
      case 'Resolved': return 'bg-emerald-500 text-white';
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
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">{activeCount + inProgressCount}</span>
            {criticalActive > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-rose-600 bg-rose-100">
                <span className="material-symbols-outlined text-[13px]">arrow_upward</span> {criticalActive} Critical
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Requires SRE attention</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Total Tracked</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-indigo-100 text-[#5c67f5] border border-indigo-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">inventory_2</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">{incidents.length}</span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">{resolvedCount} resolved</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">MTTA (Ack Time)</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">av_timer</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">{stats ? formatTime(stats.mtta_seconds) : '—'}</span>
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
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">{stats ? formatTime(stats.mttr_seconds) : '—'}</span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">99.9% uptime SLA target</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="p-4 clay-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['All', 'Active', 'In Progress', 'Resolved'] as const).map((tab) => {
            const count = tab === 'All' ? incidents.length : tab === 'Active' ? activeCount : tab === 'In Progress' ? inProgressCount : resolvedCount;
            return (
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
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Incidents List */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[16px] font-bold text-on-surface">Incident Directory</h2>
          <span className="text-[12px] text-on-surface-variant font-medium">Showing {filteredIncidents.length} incidents</span>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-[14px]">No incidents match this filter.</div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.incident_id}
                onClick={() => setSelectedIncident(incident)}
                className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border mt-0.5 ${getSeverityStyle(incident.severity)}`}>
                    {mapSeverity(incident.severity)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-slate-500">{incident.incident_id.slice(0, 8).toUpperCase()}</span>
                      <h3 className="font-bold text-[15px] text-on-surface">{incident.title || incident.root_cause_alertname || 'Unnamed Incident'}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[12px] text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">dns</span> {incident.root_cause_service}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">•</span>
                      {incident.impact && (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">group</span> {incident.impact}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">•</span>
                        </>
                      )}
                      <span>Created {timeAgo(incident.started_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${getStatusStyle(incident.state)}`}>
                    {mapStatus(incident.state)}
                  </span>
                  <span className="text-[12px] text-slate-400">{incident.affected_services.length} services affected</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Detail Drawer Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="clay-card max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-500">{selectedIncident.incident_id.slice(0, 8).toUpperCase()}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSeverityStyle(selectedIncident.severity)}`}>
                  {mapSeverity(selectedIncident.severity)}
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
              <h2 className="text-[18px] font-extrabold text-on-surface leading-snug">
                {selectedIncident.title || selectedIncident.root_cause_alertname}
              </h2>
              <p className="text-[13px] text-on-surface-variant">
                Root Cause: <strong>{selectedIncident.root_cause_service}</strong>
                {selectedIncident.impact && <> | Impact: {selectedIncident.impact}</>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedIncident.affected_services.map((svc) => (
                  <span key={svc} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">{svc}</span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <span className="text-[11px] font-bold text-[#5c67f5] uppercase tracking-wider">AI Root Cause Analysis</span>
              <p className="text-[13px] text-on-surface leading-relaxed">
                Detected abnormal behavior on <code>{selectedIncident.root_cause_service}</code> triggering cascade
                across {selectedIncident.affected_services.length} service(s). Root cause alert: <code>{selectedIncident.root_cause_alertname}</code>.
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
