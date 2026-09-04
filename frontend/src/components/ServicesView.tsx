interface ServiceItem {
  id: string;
  name: string;
  category: string;
  status: 'Healthy' | 'Degraded' | 'Critical';
  latency: string;
  errorRate: string;
  uptime: string;
  alerts: number;
}

export function ServicesView() {
  const services: ServiceItem[] = [
    {
      id: 'srv-01',
      name: 'Payment Gateway API',
      category: 'Financial Core',
      status: 'Critical',
      latency: '1,240 ms',
      errorRate: '8.4%',
      uptime: '98.12%',
      alerts: 2
    },
    {
      id: 'srv-02',
      name: 'Checkout & Cart Engine',
      category: 'E-commerce Storefront',
      status: 'Degraded',
      latency: '320 ms',
      errorRate: '1.2%',
      uptime: '99.45%',
      alerts: 1
    },
    {
      id: 'srv-03',
      name: 'User Authentication Gateway',
      category: 'Security & Identity',
      status: 'Healthy',
      latency: '24 ms',
      errorRate: '0.01%',
      uptime: '99.99%',
      alerts: 0
    },
    {
      id: 'srv-04',
      name: 'PostgreSQL Production Cluster',
      category: 'Database Infrastructure',
      status: 'Healthy',
      latency: '12 ms',
      errorRate: '0.00%',
      uptime: '99.98%',
      alerts: 0
    },
    {
      id: 'srv-05',
      name: 'Redis Cache Layer',
      category: 'In-Memory Cache',
      status: 'Healthy',
      latency: '2 ms',
      errorRate: '0.00%',
      uptime: '99.99%',
      alerts: 0
    },
    {
      id: 'srv-06',
      name: 'Inventory & Stock Sync',
      category: 'Supply Chain API',
      status: 'Healthy',
      latency: '38 ms',
      errorRate: '0.02%',
      uptime: '99.95%',
      alerts: 0
    },
    {
      id: 'srv-07',
      name: 'Recommendation Engine',
      category: 'ML Services',
      status: 'Healthy',
      latency: '62 ms',
      errorRate: '0.05%',
      uptime: '99.90%',
      alerts: 0
    },
    {
      id: 'srv-08',
      name: 'Notification & Email Dispatcher',
      category: 'Messaging',
      status: 'Healthy',
      latency: '15 ms',
      errorRate: '0.00%',
      uptime: '99.99%',
      alerts: 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Monitored Services</span>
          <div className="text-[32px] font-extrabold text-on-surface mt-2 leading-none">8</div>
          <span className="text-[12px] text-slate-500 mt-1 block">Full stack telemetry</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Healthy Services</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">6</div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">99.99% system uptime</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Degraded</span>
          <div className="text-[32px] font-extrabold text-amber-600 mt-2 leading-none">1</div>
          <span className="text-[12px] text-amber-700 font-semibold mt-1 block">Checkout API (+200ms)</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Critical Incidents</span>
          <div className="text-[32px] font-extrabold text-rose-600 mt-2 leading-none">1</div>
          <span className="text-[12px] text-rose-700 font-semibold mt-1 block">Payment Gateway</span>
        </div>
      </div>

      {/* Spacious 3-Column Service Grid */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-[18px] font-extrabold text-on-surface">Service Health Directory</h2>
            <p className="text-[12px] text-on-surface-variant">Real-time latency, error rates, and active alert counts</p>
          </div>
          <button type="button" className="px-4 py-2 rounded-full bg-[#5c67f5] text-white text-[13px] font-semibold shadow-sm">
            + Register Service
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {services.map((srv) => (
            <div 
              key={srv.id}
              className="p-5 rounded-2xl border border-slate-100 bg-[#faf8ff] hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{srv.category}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    srv.status === 'Healthy' ? 'bg-emerald-100 text-emerald-700' :
                    srv.status === 'Degraded' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {srv.status}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-on-surface">{srv.name}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">P99 Latency</span>
                  <div className="text-[13px] font-bold text-on-surface mt-0.5">{srv.latency}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Error Rate</span>
                  <div className={`text-[13px] font-bold mt-0.5 ${srv.errorRate === '0.00%' ? 'text-slate-700' : 'text-rose-600'}`}>
                    {srv.errorRate}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Uptime</span>
                  <div className="text-[13px] font-bold text-emerald-600 mt-0.5">{srv.uptime}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-on-surface-variant font-medium">
                  {srv.alerts > 0 ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">warning</span> {srv.alerts} active alert
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span> All systems nominal
                    </span>
                  )}
                </span>

                <button 
                  type="button" 
                  onClick={() => alert(`Opening metrics for ${srv.name}`)}
                  className="px-3 py-1.5 rounded-full clay-button text-[12px] font-semibold text-on-surface hover:bg-slate-100"
                >
                  Telemetry
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
