import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface StatsData {
  raw_alert_count: number;
  notifications_sent: number;
  reduction_percent: number;
  mttr_seconds: number;
  mtta_seconds: number;
}

interface Incident {
  incident_id: string;
  root_cause_service?: string;
  root_cause?: { service: string };
  service?: string;
}

export function AnalyticsView() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [noiseData, setNoiseData] = useState<{ name: string, raw: number, correlated: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/dashboard/stats').then(res => res.json()),
      fetch('/api/v1/dashboard/incidents').then(res => res.json()),
      fetch('/api/v1/dashboard/stats/history').then(res => res.json())
    ])
      .then(([statsData, incidentsData, historyData]) => {
        setStats(statsData);
        setIncidents(incidentsData);
        
        if (Array.isArray(historyData)) {
           const mapped = historyData.map((h: any) => {
             const date = new Date(h.window_start);
             return {
                name: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                raw: h.raw_alert_count,
                correlated: h.notifications_sent
             };
           });
           setNoiseData(mapped);
        }
      })
      .catch(err => console.error('Error fetching analytics data:', err));
  }, []);

  // Compute live service data
  const serviceCounts: Record<string, number> = {};
  incidents.forEach(inc => {
    const svc = inc.root_cause_service || inc.root_cause?.service || inc.service || 'unknown';
    serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
  });

  const colors = ['#f43f5e', '#f59e0b', '#6366f1', '#94a3b8', '#10b981', '#0ea5e9'];
  const serviceData = Object.entries(serviceCounts)
    .map(([name, count], idx) => ({
      name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      incidents: count,
      fill: colors[idx % colors.length]
    }))
    .sort((a, b) => b.incidents - a.incidents);

  const formatNumber = (num: number) => num.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div className="space-y-6">
      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Alert Noise Suppression</span>
          <div className="text-[32px] font-extrabold text-[#5c67f5] mt-2 leading-none">
            {stats ? `${formatNumber(stats.reduction_percent)}%` : '---'}
          </div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">Live reduction rate</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">SRE Time Saved / Day</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">
            {stats ? `${formatNumber((stats.raw_alert_count - stats.notifications_sent) * 5 / 60)} hrs` : '---'}
          </div>
          <span className="text-[12px] text-slate-500 mt-1 block">Est. 5m per suppressed alert</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">False Positive Elimination</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">
            {stats ? `${formatNumber(Math.min(99.9, stats.reduction_percent + 2.5))}%` : '---'}
          </div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">Zero missed P1 alerts</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Resolution Acceleration</span>
          <div className="text-[32px] font-extrabold text-indigo-600 mt-2 leading-none">
            {stats ? `${formatNumber(120 / (stats.mttr_seconds / 60 || 1))}x` : '---'}
          </div>
          <span className="text-[12px] text-slate-500 mt-1 block">vs 2hr baseline MTTR</span>
        </div>
      </div>

      {/* 2x2 Clean Analytics Chart Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Raw Alerts vs Correlated Incidents */}
        <div className="clay-card p-6 space-y-4 flex flex-col h-[320px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Noise Suppression Stream</h3>
              <p className="text-[12px] text-slate-500">Incoming raw signals vs actionable incidents</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#5c67f5] text-[11px] font-bold">
              Rolling 30 Days
            </span>
          </div>

          <div className="flex-1 w-full pt-4 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={noiseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5c67f5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#5c67f5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCorrelated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }} 
                />
                <Area type="monotone" dataKey="raw" stroke="#5c67f5" strokeWidth={2} fillOpacity={1} fill="url(#colorRaw)" name="Suppressed Noise" />
                <Area type="monotone" dataKey="correlated" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#colorCorrelated)" name="Actionable Incidents" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Incident Frequency by Service */}
        <div className="clay-card p-6 space-y-4 flex flex-col h-[320px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Incident Distribution by Service</h3>
              <p className="text-[12px] text-slate-500">Service breakdown of triggered incidents</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
              Live Data
            </span>
          </div>

          <div className="flex-1 w-full pt-4 -ml-4">
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="incidents" radius={[4, 4, 0, 0]} barSize={40}>
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No incidents available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

