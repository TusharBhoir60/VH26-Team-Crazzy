import { useState } from 'react';

interface NodeInfo {
  id: string;
  name: string;
  type: string;
  status: 'Healthy' | 'Degraded' | 'Critical';
  blastRadius: string;
  upstream: string[];
  downstream: string[];
}

export function TopologyView() {
  const [selectedNode, setSelectedNode] = useState<string>('payment');

  const nodes: Record<string, NodeInfo> = {
    frontend: {
      id: 'frontend',
      name: 'Storefront Web App',
      type: 'Client Layer',
      status: 'Healthy',
      blastRadius: '0% (Edge User Layer)',
      upstream: [],
      downstream: ['gateway']
    },
    gateway: {
      id: 'gateway',
      name: 'API Gateway',
      type: 'Ingress Controller',
      status: 'Healthy',
      blastRadius: '100% of all HTTP traffic',
      upstream: ['frontend'],
      downstream: ['auth', 'checkout']
    },
    auth: {
      id: 'auth',
      name: 'Auth Service',
      type: 'Identity API',
      status: 'Healthy',
      blastRadius: 'User Login & Tokens',
      upstream: ['gateway'],
      downstream: ['redis']
    },
    checkout: {
      id: 'checkout',
      name: 'Checkout & Cart',
      type: 'Order Engine',
      status: 'Degraded',
      blastRadius: '450 shopping carts impacted',
      upstream: ['gateway'],
      downstream: ['payment', 'postgres']
    },
    payment: {
      id: 'payment',
      name: 'Payment Gateway',
      type: 'Payment Processor',
      status: 'Critical',
      blastRadius: 'Root Cause Node - 1.2k transactions affected',
      upstream: ['checkout'],
      downstream: ['postgres']
    },
    postgres: {
      id: 'postgres',
      name: 'PostgreSQL Database',
      type: 'Primary Data Store',
      status: 'Healthy',
      blastRadius: 'Core DB Persistence',
      upstream: ['payment', 'checkout'],
      downstream: []
    },
    redis: {
      id: 'redis',
      name: 'Redis Cache Cluster',
      type: 'Memory Store',
      status: 'Healthy',
      blastRadius: 'Session Caching',
      upstream: ['auth'],
      downstream: []
    }
  };

  const currentNode = nodes[selectedNode] || nodes['payment'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="clay-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-[12px] font-bold text-rose-600 uppercase tracking-wider">Live Dependency Topology Graph</span>
          </div>
          <h2 className="text-[22px] font-extrabold text-on-surface mt-1">Microservices Propagation Matrix</h2>
          <p className="text-[13px] text-on-surface-variant">Click any service node to inspect upstream callers and downstream blast radius.</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="px-4 py-2 rounded-full bg-[#5c67f5] text-white text-[13px] font-semibold shadow-sm">
            Auto-Layout Graph
          </button>
        </div>
      </div>

      {/* Main Canvas & Inspection Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Graph Diagram Area */}
        <div className="lg:col-span-8 clay-card p-6 space-y-6 min-h-[480px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-[13px] font-bold text-on-surface uppercase tracking-wider">Dependency Graph</span>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Healthy</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Degraded</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical</span>
            </div>
          </div>

          {/* Visual Node Flow Layout */}
          <div className="py-8 px-4 flex flex-col items-center gap-8">
            {/* Level 1: Client Edge */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setSelectedNode('frontend')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'frontend' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">desktop_windows</span>
                <div className="text-left">
                  <div className="text-[14px] font-bold text-on-surface">Storefront Web App</div>
                  <div className="text-[11px] text-slate-500">Client Ingress</div>
                </div>
              </button>
            </div>

            <span className="material-symbols-outlined text-slate-300 text-[20px]">south</span>

            {/* Level 2: API Gateway */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setSelectedNode('gateway')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'gateway' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">router</span>
                <div className="text-left">
                  <div className="text-[14px] font-bold text-on-surface">API Gateway</div>
                  <div className="text-[11px] text-slate-500">Routing Layer</div>
                </div>
              </button>
            </div>

            <span className="material-symbols-outlined text-slate-300 text-[20px]">south</span>

            {/* Level 3: Microservices */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setSelectedNode('auth')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'auth' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">lock</span>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-on-surface">Auth Service</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Healthy</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNode('checkout')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'checkout' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-amber-300 bg-amber-50/60 hover:border-amber-400'
                }`}
              >
                <span className="material-symbols-outlined text-amber-600 text-[22px]">shopping_cart</span>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-on-surface">Checkout API</div>
                  <div className="text-[10px] text-amber-700 font-bold">Degraded (Latency)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNode('payment')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'payment' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-rose-400 bg-rose-50/90 hover:border-rose-500 shadow-sm animate-pulse'
                }`}
              >
                <span className="material-symbols-outlined text-rose-600 text-[22px]">credit_card</span>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-on-surface">Payment Gateway</div>
                  <div className="text-[10px] text-rose-700 font-bold">Root Cause (HTTP 500)</div>
                </div>
              </button>
            </div>

            <span className="material-symbols-outlined text-slate-300 text-[20px]">south</span>

            {/* Level 4: Persistence Datastores */}
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setSelectedNode('postgres')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'postgres' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">database</span>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-on-surface">PostgreSQL DB</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Healthy</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNode('redis')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                  selectedNode === 'redis' ? 'border-[#5c67f5] bg-indigo-50/90 shadow-md scale-105' : 'border-emerald-200 bg-white hover:border-emerald-400'
                }`}
              >
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">memory</span>
                <div className="text-left">
                  <div className="text-[13px] font-bold text-on-surface">Redis Cache</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Healthy</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Inspection Panel */}
        <div className="lg:col-span-4 clay-card p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Node Details</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              currentNode.status === 'Healthy' ? 'bg-emerald-100 text-emerald-700' :
              currentNode.status === 'Degraded' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {currentNode.status}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-[20px] font-extrabold text-on-surface">{currentNode.name}</h3>
            <p className="text-[13px] text-slate-500 font-medium">{currentNode.type}</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <span className="text-[11px] font-bold text-[#5c67f5] uppercase tracking-wider">Blast Radius Assessment</span>
            <p className="text-[13px] font-bold text-on-surface">{currentNode.blastRadius}</p>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Upstream Callers</span>
            <div className="flex flex-wrap gap-2">
              {currentNode.upstream.length > 0 ? (
                currentNode.upstream.map((up) => (
                  <span key={up} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
                    {nodes[up]?.name || up}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-slate-400 italic">None (Root Ingress)</span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Downstream Targets</span>
            <div className="flex flex-wrap gap-2">
              {currentNode.downstream.length > 0 ? (
                currentNode.downstream.map((down) => (
                  <span key={down} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
                    {nodes[down]?.name || down}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-slate-400 italic">None (Datastore Terminal)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
