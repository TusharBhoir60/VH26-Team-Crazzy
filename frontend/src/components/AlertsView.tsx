import { useState } from 'react';

interface AlertItem {
  id: string;
  name: string;
  service: string;
  rawCount: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  suppressionType: 'Deduplicated' | 'Correlated' | 'Rule Filtered' | 'Active';
  time: string;
}

export function AlertsView() {
  const [filter, setFilter] = useState<'All' | 'Correlated' | 'Suppressed'>('All');

  const alerts: AlertItem[] = [
    {
      id: 'ALT-1049',
      name: 'HTTP 500 Server Error Spike on Checkout API Endpoint',
      service: 'Payment Gateway',
      rawCount: 142,
      severity: 'Critical',
      suppressionType: 'Correlated',
      time: '4m ago'
    },
    {
      id: 'ALT-1048',
      name: 'High P99 Response Latency (> 850ms) on Auth Gateway',
      service: 'Auth Service',
      rawCount: 88,
      severity: 'High',
      suppressionType: 'Correlated',
      time: '12m ago'
    },
    {
      id: 'ALT-1045',
      name: 'PostgreSQL DB Connection Pool Capacity Reached 92%',
      service: 'PostgreSQL Main DB',
      rawCount: 64,
      severity: 'High',
      suppressionType: 'Correlated',
      time: '22m ago'
    },
    {
      id: 'ALT-1041',
      name: 'CPU Flapping Alert on Background Worker Node-04',
      service: 'Worker Pool',
      rawCount: 45,
      severity: 'Medium',
      suppressionType: 'Rule Filtered',
      time: '35m ago'
    },
    {
      id: 'ALT-1038',
      name: 'Transient TCP Packet Drop on Internal Load Balancer',
      service: 'API Gateway',
      rawCount: 78,
      severity: 'Low',
      suppressionType: 'Deduplicated',
      time: '50m ago'
    },
    {
      id: 'ALT-1033',
      name: 'Disk IOPS Warning Threshold Reached on Log Collector',
      service: 'Observability Node',
      rawCount: 32,
      severity: 'Low',
      suppressionType: 'Rule Filtered',
      time: '1h 15m ago'
    }
  ];

  const filteredAlerts = alerts.filter((alt) => {
    if (filter === 'Correlated') return alt.suppressionType === 'Correlated';
    if (filter === 'Suppressed') return alt.suppressionType !== 'Correlated';
    return true;
  });

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
            <h2 className="text-[26px] font-extrabold text-on-surface tracking-tight">94.6% Alert Noise Suppressed</h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              500 raw monitoring events reduced into 27 correlated actionable alerts using ML clustering & deduplication rules.
            </p>
          </div>

          {/* Funnel Pipeline Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center w-full md:w-auto">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Raw Stream</span>
              <div className="text-[22px] font-extrabold text-on-surface mt-1">500</div>
              <span className="text-[10px] text-slate-400">Events/hr</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 shadow-sm">
              <span className="text-[11px] font-bold text-[#5c67f5] uppercase">Deduplicated</span>
              <div className="text-[22px] font-extrabold text-[#5c67f5] mt-1">120</div>
              <span className="text-[10px] text-[#5c67f5]">-76% noise</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Correlated</span>
              <div className="text-[22px] font-extrabold text-emerald-700 mt-1">27</div>
              <span className="text-[10px] text-emerald-700">Grouped</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-100 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase">Incidents</span>
              <div className="text-[22px] font-extrabold text-rose-600 mt-1">3</div>
              <span className="text-[10px] text-rose-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar & Filter Tabs */}
      <div className="p-4 clay-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['All', 'Correlated', 'Suppressed'] as const).map((tab) => (
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
              {tab} Stream {tab === 'All' ? '(27)' : tab === 'Correlated' ? '(3)' : '(24)'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="px-4 py-2 rounded-full clay-button text-[13px] font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">tune</span>
            <span>Grouping Rules</span>
          </button>
          <button type="button" className="px-4 py-2 rounded-full clay-button text-[13px] font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">bedtime</span>
            <span>Silence Mute</span>
          </button>
        </div>
      </div>

      {/* Clean Alert Stream List */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[16px] font-bold text-on-surface">Live Alert Telemetry Feed</h2>
          <span className="text-[12px] text-on-surface-variant">Real-time signal clustering</span>
        </div>

        <div className="space-y-3">
          {filteredAlerts.map((item) => (
            <div 
              key={item.id}
              className="p-4 rounded-2xl border border-slate-100 bg-[#faf8ff] hover:bg-white hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5c67f5] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-slate-500">{item.id}</span>
                    <h3 className="font-bold text-[15px] text-on-surface">{item.name}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-on-surface-variant">
                    <span className="font-medium text-slate-700">{item.service}</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[#5c67f5] font-bold text-[11px]">
                      {item.rawCount} raw events grouped
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  item.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                  item.severity === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                }`}>
                  {item.severity}
                </span>

                <button 
                  type="button"
                  onClick={() => alert(`Viewing grouped payload for ${item.id}`)}
                  className="px-3.5 py-1.5 rounded-full clay-button text-[12px] font-semibold text-on-surface hover:bg-slate-100 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
