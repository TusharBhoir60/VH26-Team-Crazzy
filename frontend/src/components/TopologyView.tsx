import { useState, useEffect } from 'react';

interface ServiceDef {
  depends_on: string[];
  tier: string;
}

interface TopologyData {
  services: Record<string, ServiceDef>;
}

const SERVICE_ICONS: Record<string, string> = {
  'database': 'database',
  'auth-service': 'lock',
  'payment-service': 'credit_card',
  'checkout-api': 'shopping_cart',
  'frontend': 'desktop_windows',
  'inventory-service': 'inventory_2',
  'notification-service': 'notifications',
};

const TIER_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  'critical': { border: 'border-rose-400', bg: 'bg-rose-50/90', text: 'text-rose-700', dot: 'bg-rose-500' },
  'high': { border: 'border-amber-300', bg: 'bg-amber-50/60', text: 'text-amber-700', dot: 'bg-amber-500' },
  'medium': { border: 'border-indigo-200', bg: 'bg-indigo-50/50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  'low': { border: 'border-slate-200', bg: 'bg-white', text: 'text-slate-600', dot: 'bg-slate-400' },
};

function formatServiceName(id: string): string {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function TopologyView() {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/topology')
      .then(res => res.json())
      .then((data: TopologyData) => {
        setTopology(data);
        // Auto-select the first critical-tier service
        if (data.services) {
          const critSvc = Object.entries(data.services).find(([_, v]) => v.tier === 'critical');
          if (critSvc) setSelectedNode(critSvc[0]);
          else setSelectedNode(Object.keys(data.services)[0]);
        }
      })
      .catch(err => console.error('Error fetching topology:', err));
  }, []);

  if (!topology || !topology.services) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-[14px] font-medium animate-pulse">Loading service topology...</div>
      </div>
    );
  }

  const services = topology.services;
  const serviceIds = Object.keys(services);
  const currentNode = selectedNode && services[selectedNode] ? selectedNode : serviceIds[0];
  const currentDef = services[currentNode];

  // Compute downstream (services that depend on this node)
  const downstream = serviceIds.filter(id => services[id].depends_on.includes(currentNode));

  // Group by tier for visual layout
  const tiers: Record<string, string[]> = {};
  for (const [id, def] of Object.entries(services)) {
    const tier = def.tier;
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(id);
  }

  const tierOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="clay-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[12px] font-bold text-rose-600 uppercase tracking-wider">Live Dependency Topology</span>
          </div>
          <h2 className="text-[22px] font-extrabold text-on-surface mt-1">Service Dependency Graph</h2>
          <p className="text-[13px] text-on-surface-variant">
            Sourced from <code>config/service-dependency-graph.yaml</code> — {serviceIds.length} services tracked.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          {tierOrder.map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${TIER_COLORS[t]?.dot || 'bg-slate-400'}`}></span>
              {t.charAt(0).toUpperCase() + t.slice(1)} Tier
            </span>
          ))}
        </div>
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Graph */}
        <div className="lg:col-span-8 clay-card p-6 space-y-6 min-h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Dependency Graph</span>
          </div>

          <div className="py-6 px-4 space-y-8">
            {tierOrder.filter(t => tiers[t]?.length).map((tier) => (
              <div key={tier}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {tier} tier
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {tiers[tier]!.map((svcId) => {
                    const colors = TIER_COLORS[tier] || TIER_COLORS['low'];
                    const isSelected = svcId === currentNode;
                    return (
                      <button
                        key={svcId}
                        type="button"
                        onClick={() => setSelectedNode(svcId)}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105'
                            : `${colors.border} ${colors.bg} hover:shadow-sm`
                        }`}
                      >
                        <span className={`material-symbols-outlined ${isSelected ? 'text-[#5c67f5]' : colors.text} text-[22px]`}>
                          {SERVICE_ICONS[svcId] || 'dns'}
                        </span>
                        <div className="text-left">
                          <div className="text-[13px] font-bold text-on-surface">{formatServiceName(svcId)}</div>
                          <div className={`text-[10px] font-semibold ${colors.text}`}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)} • {services[svcId].depends_on.length} deps
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {tier !== tierOrder[tierOrder.length - 1] && tiers[tierOrder[tierOrder.indexOf(tier) + 1]] && (
                  <div className="flex justify-center mt-4">
                    <span className="material-symbols-outlined text-slate-300 text-[20px]">south</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector Panel */}
        <div className="lg:col-span-4 clay-card p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Node Details</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              (TIER_COLORS[currentDef.tier] || TIER_COLORS['low']).bg
            } ${(TIER_COLORS[currentDef.tier] || TIER_COLORS['low']).text}`}>
              {currentDef.tier.charAt(0).toUpperCase() + currentDef.tier.slice(1)} Tier
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-[20px] font-extrabold text-on-surface">{formatServiceName(currentNode)}</h3>
            <p className="text-[13px] text-slate-500 font-medium">ID: <code>{currentNode}</code></p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <span className="text-[11px] font-bold text-[#5c67f5] uppercase tracking-wider">Blast Radius</span>
            <p className="text-[13px] font-bold text-on-surface">
              {downstream.length > 0
                ? `${downstream.length} downstream service(s) depend on this node`
                : 'No downstream dependencies (leaf node)'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Upstream Dependencies</span>
            <div className="flex flex-wrap gap-2">
              {currentDef.depends_on.length > 0 ? (
                currentDef.depends_on.map((dep) => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => setSelectedNode(dep)}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {formatServiceName(dep)}
                  </button>
                ))
              ) : (
                <span className="text-[12px] text-slate-400 italic">None (Root Service)</span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Downstream Dependents</span>
            <div className="flex flex-wrap gap-2">
              {downstream.length > 0 ? (
                downstream.map((dep) => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => setSelectedNode(dep)}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {formatServiceName(dep)}
                  </button>
                ))
              ) : (
                <span className="text-[12px] text-slate-400 italic">None (Edge Service)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
