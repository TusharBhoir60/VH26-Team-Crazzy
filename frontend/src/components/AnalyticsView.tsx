import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export function AnalyticsView() {
  const noiseData = [
    { name: 'Week 1', raw: 480, correlated: 24 },
    { name: 'Week 2', raw: 520, correlated: 26 },
    { name: 'Week 3', raw: 500, correlated: 27 },
  ];

  const serviceData = [
    { name: 'Payment', incidents: 12, fill: '#f43f5e' },
    { name: 'Checkout', incidents: 8, fill: '#f59e0b' },
    { name: 'Database', incidents: 5, fill: '#6366f1' },
    { name: 'Auth', incidents: 3, fill: '#94a3b8' },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Alert Noise Suppression</span>
          <div className="text-[32px] font-extrabold text-[#5c67f5] mt-2 leading-none">94.6%</div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">↑ 4.2% vs previous month</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">SRE Time Saved / Day</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">3.4 hrs</div>
          <span className="text-[12px] text-slate-500 mt-1 block">Per engineer on-call</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">False Positive Elimination</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">98.2%</div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">Zero missed P1 alerts</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Resolution Acceleration</span>
          <div className="text-[32px] font-extrabold text-indigo-600 mt-2 leading-none">2.4x</div>
          <span className="text-[12px] text-slate-500 mt-1 block">Faster MTTR via AI RCA</span>
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
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
              30 Days
            </span>
          </div>

          <div className="flex-1 w-full pt-4 -ml-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}
