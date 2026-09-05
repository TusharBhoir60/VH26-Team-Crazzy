import React, { useState, useEffect } from 'react';

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
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI Analysis Modal State
  const [analyzingServiceId, setAnalyzingServiceId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    serviceName: string;
    rootCauseSuggestion: string;
    suggestedSeverity: string;
    narrative: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchServices = async () => {
      try {
        const res = await fetch('/api/v1/dashboard/services');
        if (!res.ok) throw new Error('Failed to fetch services');
        const data = await res.json();
        if (mounted) {
          setServices(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAIAnalysis = async (service: ServiceItem) => {
    setAnalyzingServiceId(service.id);
    setAnalysisError(null);
    setAnalysisResult(null);
    
    try {
      const res = await fetch(`/api/v1/dashboard/services/${service.id}/reasoning`);
      if (!res.ok) throw new Error('Failed to fetch AI analysis');
      const data = await res.json();
      setAnalysisResult({
        serviceName: service.name,
        ...data
      });
    } catch (err) {
      setAnalysisError('The AI reasoning service is temporarily unavailable.');
    } finally {
      setAnalyzingServiceId(null);
    }
  };

  const totalServices = services.length;
  const healthyCount = services.filter((s) => s.status === 'Healthy').length;
  const degradedCount = services.filter((s) => s.status === 'Degraded').length;
  const criticalCount = services.filter((s) => s.status === 'Critical').length;

  return (
    <div className="space-y-6 relative">
      {/* AI Analysis Modal */}
      {(analysisResult || analysisError || analyzingServiceId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setAnalysisResult(null); setAnalysisError(null); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div>
                <h3 className="text-[18px] font-extrabold text-slate-900">AI Health Analysis</h3>
                <p className="text-[13px] text-slate-500 font-medium">Powered by Groq & Llama 3</p>
              </div>
            </div>

            {analyzingServiceId ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-[14px] text-slate-600 font-medium animate-pulse">Analyzing real-time telemetry...</p>
              </div>
            ) : analysisError ? (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-[13px] font-semibold border border-rose-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {analysisError}
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[13px] font-bold text-slate-500">Service</span>
                  <span className="text-[14px] font-bold text-slate-900">{analysisResult.serviceName}</span>
                </div>
                
                <div>
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Status</span>
                  <p className="text-[14px] text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {analysisResult.narrative}
                  </p>
                </div>
                
                <div>
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Root Cause Estimate</span>
                  <p className="text-[14px] text-slate-700 leading-relaxed font-medium bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                    {analysisResult.rootCauseSuggestion}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Monitored Services</span>
          <div className="text-[32px] font-extrabold text-on-surface mt-2 leading-none">{loading ? '-' : totalServices}</div>
          <span className="text-[12px] text-slate-500 mt-1 block">Full stack telemetry</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Healthy Services</span>
          <div className="text-[32px] font-extrabold text-emerald-600 mt-2 leading-none">{loading ? '-' : healthyCount}</div>
          <span className="text-[12px] text-emerald-700 font-semibold mt-1 block">Operational systems</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Degraded</span>
          <div className="text-[32px] font-extrabold text-amber-600 mt-2 leading-none">{loading ? '-' : degradedCount}</div>
          <span className="text-[12px] text-amber-700 font-semibold mt-1 block">Performance anomalies</span>
        </div>

        <div className="p-5 clay-card">
          <span className="text-[13px] font-semibold text-on-surface-variant">Critical Incidents</span>
          <div className="text-[32px] font-extrabold text-rose-600 mt-2 leading-none">{loading ? '-' : criticalCount}</div>
          <span className="text-[12px] text-rose-700 font-semibold mt-1 block">Active outages</span>
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
                  <div className={`text-[13px] font-bold mt-0.5 ${srv.errorRate === '0.00%' || srv.errorRate === '0.01%' ? 'text-slate-700' : 'text-rose-600'}`}>
                    {srv.errorRate}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Uptime</span>
                  <div className={`text-[13px] font-bold mt-0.5 ${srv.uptime.startsWith('99') ? 'text-emerald-600' : 'text-amber-600'}`}>{srv.uptime}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-on-surface-variant font-medium">
                  {srv.alerts > 0 ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">warning</span> {srv.alerts} active alert{srv.alerts !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span> All systems nominal
                    </span>
                  )}
                </span>

                <button 
                  onClick={() => handleAIAnalysis(srv)}
                  disabled={analyzingServiceId === srv.id}
                  className="px-3 py-1.5 rounded-full clay-button text-[12px] font-semibold text-on-surface hover:bg-slate-100 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {analyzingServiceId === srv.id ? (
                    <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                  )}
                  AI Analysis
                </button>
              </div>
            </div>
          ))}
          {!loading && services.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-[14px]">
              No monitored services found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
