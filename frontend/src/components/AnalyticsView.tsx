export function AnalyticsView() {
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
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Noise Suppression Stream</h3>
              <p className="text-[12px] text-slate-500">Incoming raw signals vs actionable incidents</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#5c67f5] text-[11px] font-bold">
              Rolling 30 Days
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-600">Week 1</span>
                <span className="font-bold text-on-surface">480 raw → 24 correlated (95.0% reduced)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-[#5c67f5] h-full" style={{ width: '95%' }}></div>
                <div className="bg-rose-400 h-full" style={{ width: '5%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-600">Week 2</span>
                <span className="font-bold text-on-surface">520 raw → 26 correlated (95.0% reduced)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-[#5c67f5] h-full" style={{ width: '95%' }}></div>
                <div className="bg-rose-400 h-full" style={{ width: '5%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-slate-600">Week 3</span>
                <span className="font-bold text-on-surface">500 raw → 27 correlated (94.6% reduced)</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-[#5c67f5] h-full" style={{ width: '94.6%' }}></div>
                <div className="bg-rose-400 h-full" style={{ width: '5.4%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-[12px]">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-[#5c67f5]"></span> Suppressed Noise
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-rose-400"></span> Actionable Incidents
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Incident Frequency by Service */}
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Incident Distribution by Service</h3>
              <p className="text-[12px] text-slate-500">Service breakdown of triggered incidents</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
              30 Days
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span>Payment Gateway</span>
                <span className="text-rose-600 font-bold">42% (12 incidents)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span>Checkout API</span>
                <span className="text-amber-600 font-bold">28% (8 incidents)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span>PostgreSQL Main DB</span>
                <span className="text-indigo-600 font-bold">18% (5 incidents)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '18%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span>Auth Gateway & Others</span>
                <span className="text-slate-600 font-bold">12% (3 incidents)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
