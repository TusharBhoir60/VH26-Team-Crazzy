import { useState, useEffect } from 'react';

interface RecentAlert {
  fingerprint: string;
  alertname: string;
  service: string;
  severity: string;
  status: string;
  source: string;
  received_at: string;
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

export function AlertsView() {
  const [filter, setFilter] = useState<'All' | 'Firing' | 'Resolved'>('All');
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [stats, setStats] = useState<{ raw_alert_count: number; notifications_sent: number; reduction_percent: number } | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/recent-alerts')
      .then(res => res.json())
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching recent alerts:', err));

    fetch('/api/v1/dashboard/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  const firingAlerts = alerts.filter(a => a.status === 'firing');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'Firing') return a.status === 'firing';
    if (filter === 'Resolved') return a.status === 'resolved';
    return true;
  });

  const reductionPct = stats?.reduction_percent ?? 0;
  const rawCount = stats?.raw_alert_count ?? 0;
  const notifCount = stats?.notifications_sent ?? 0;
  const suppressed = Math.max(0, rawCount - notifCount);

  const getSeverityStyle = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return 'bg-rose-100 text-rose-700';
    if (s === 'high') return 'bg-amber-100 text-amber-700';
    if (s === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-sky-100 text-sky-700';
  };

  return (
    <div className="space-y-6">
      {/* Noise Shield Funnel Hero Card */}
      <div className="clay-card p-6 relative overflow-hidden bg-gradient-to-r from-white via-indigo-50/30 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">AIOps Noise Shield Active</span>
            </div>
            <h2 className="text-[26px] font-extrabold text-on-surface tracking-tight">{reductionPct.toFixed(1)}% Alert Noise Suppressed</h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              {rawCount.toLocaleString()} raw monitoring events reduced into {notifCount.toLocaleString()} actionable alerts using ML clustering &amp; deduplication rules.
            </p>
          </div>

          {/* Funnel Pipeline Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center w-full md:w-auto">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Raw Stream</span>
              <div className="text-[22px] font-extrabold text-on-surface mt-1">{rawCount.toLocaleString()}</div>
              <span className="text-[10px] text-slate-400">Total</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 shadow-sm">
              <span className="text-[11px] font-bold text-[#5c67f5] uppercase">Suppressed</span>
              <div className="text-[22px] font-extrabold text-[#5c67f5] mt-1">{suppressed.toLocaleString()}</div>
              <span className="text-[10px] text-[#5c67f5]">-{reductionPct.toFixed(0)}% noise</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Delivered</span>
              <div className="text-[22px] font-extrabold text-emerald-700 mt-1">{notifCount.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-700">Actionable</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-100 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase">Firing Now</span>
              <div className="text-[22px] font-extrabold text-rose-600 mt-1">{firingAlerts.length}</div>
              <span className="text-[10px] text-rose-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="p-4 clay-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['All', 'Firing', 'Resolved'] as const).map((tab) => {
            const count = tab === 'All' ? alerts.length : tab === 'Firing' ? firingAlerts.length : resolvedAlerts.length;
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

      {/* Live Alert Stream List */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[16px] font-bold text-on-surface">Live Alert Telemetry Feed</h2>
          <span className="text-[12px] text-on-surface-variant">Real-time pipeline signals</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-[14px]">No alerts match this filter.</div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((item, idx) => (
              <div
                key={item.fingerprint || idx}
                className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] hover:bg-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    item.status === 'firing' ? 'bg-rose-50 border border-rose-100 text-rose-500' : 'bg-emerald-50 border border-emerald-100 text-emerald-500'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {item.status === 'firing' ? 'notifications_active' : 'check_circle'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[15px] text-on-surface">{item.alertname}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-on-surface-variant">
                      <span className="font-medium text-slate-700">{item.service}</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[#5c67f5] font-bold text-[11px]">
                        {item.source}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{timeAgo(item.received_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getSeverityStyle(item.severity)}`}>
                    {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    item.status === 'firing' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {item.status === 'firing' ? '🔴 Firing' : '✅ Resolved'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
