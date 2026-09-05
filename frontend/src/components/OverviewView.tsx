import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

export function OverviewView() {
  const alertReductionData = [
    { name: 'Before (Traditional)', value: 500, fill: '#f87171' },
    { name: 'After (Buster Engine)', value: 27, fill: '#34d399' }
  ];

  const severityData = [
    { name: 'Critical', value: 2, color: '#ff5c7a' },
    { name: 'High', value: 5, color: '#ff9f5a' },
    { name: 'Medium', value: 12, color: '#ffc837' },
    { name: 'Low', value: 8, color: '#4c8bf5' }
  ];

  return (
    <div className="overview-wrapper w-full">

{/*  TOP KPI METRIC ROW  */}
<section className="overview-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
{/*  KPI 1: Active Incidents  */}
<div className="relative overflow-hidden p-6 clay-card group hover:-translate-y-0.5 transition-all">
<div className="flex items-center justify-between">
<span className="text-[13px] font-semibold text-on-surface-variant">Active Incidents</span>
<div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#fee2e2]/70 text-[#ef4444] border border-[#fecaca]/50 shadow-sm">
<span className="material-symbols-outlined text-[19px]" style={{"fontVariationSettings":"\"FILL\" 1"}}>error_outline</span>
</div>
</div>
<div className="mt-3 flex items-baseline justify-between">
<span className="font-headline-lg text-[32px] font-extrabold text-on-surface tracking-tight leading-none">3</span>
<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-[#ef4444] bg-[#fee2e2]/60">
<span className="material-symbols-outlined text-[13px]">arrow_upward</span>
          50%
        </span>
</div>
<p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">vs. previous day</p>
{/*  Sparkline Wave SVG  */}
<div className="mt-2 w-full h-8 overflow-hidden">
<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 32">
<defs>
<linearGradient id="kpiGrad1" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ef4444" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#ef4444" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
<path d="M0 24 Q 25 28 50 18 T 100 12 T 160 6 L 160 32 L 0 32 Z" fill="url(#kpiGrad1)"></path>
<path d="M0 24 Q 25 28 50 18 T 100 12 T 160 6" fill="none" stroke="#ef4444" strokeLinecap="round" strokeWidth="2"></path>
</svg>
</div>
</div>
{/*  KPI 2: Total Alerts  */}
<div className="relative overflow-hidden p-6 clay-card group hover:-translate-y-0.5 transition-all">
<div className="flex items-center justify-between">
<span className="text-[13px] font-semibold text-on-surface-variant">Total Alerts</span>
<div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#e0edff] text-[#3b82f6] border border-[#bfdbfe]/50 shadow-sm">
<span className="material-symbols-outlined text-[19px]" style={{"fontVariationSettings":"\"FILL\" 1"}}>view_list</span>
</div>
</div>
<div className="mt-3 flex items-baseline justify-between">
<span className="font-headline-lg text-[32px] font-extrabold text-on-surface tracking-tight leading-none">27</span>
<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-[#059669] bg-[#d1fae5]/80">
<span className="material-symbols-outlined text-[13px]">arrow_downward</span>
          94%
        </span>
</div>
<p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">(was 500 traditional alerts)</p>
{/*  Sparkline Wave SVG  */}
<div className="mt-2 w-full h-8 overflow-hidden">
<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 32">
<defs>
<linearGradient id="kpiGrad2" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
<path d="M0 10 Q 30 5 60 22 T 110 8 T 160 26 L 160 32 L 0 32 Z" fill="url(#kpiGrad2)"></path>
<path d="M0 10 Q 30 5 60 22 T 110 8 T 160 26" fill="none" stroke="#3b82f6" strokeLinecap="round" strokeWidth="2"></path>
</svg>
</div>
</div>
{/*  KPI 3: Suppressed Alerts  */}
<div className="relative overflow-hidden p-6 clay-card group hover:-translate-y-0.5 transition-all">
<div className="flex items-center justify-between">
<span className="text-[13px] font-semibold text-on-surface-variant">Suppressed Alerts</span>
<div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#eff1fe] text-[#5c67f5] border border-[#c7d2fe]/50 shadow-sm">
<span className="material-symbols-outlined text-[19px]" style={{"fontVariationSettings":"\"FILL\" 1"}}>filter_alt</span>
</div>
</div>
<div className="mt-3 flex items-baseline justify-between">
<span className="font-headline-lg text-[32px] font-extrabold text-on-surface tracking-tight leading-none">463</span>
<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-[#5c67f5] bg-[#eff1fe]">
          Noise filtered
        </span>
</div>
<p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Automatically grouped</p>
{/*  Sparkline Wave SVG  */}
<div className="mt-2 w-full h-8 overflow-hidden">
<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 32">
<defs>
<linearGradient id="kpiGrad3" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#5c67f5" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#5c67f5" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
<path d="M0 26 Q 30 8 70 20 T 120 6 T 160 14 L 160 32 L 0 32 Z" fill="url(#kpiGrad3)"></path>
<path d="M0 26 Q 30 8 70 20 T 120 6 T 160 14" fill="none" stroke="#5c67f5" strokeLinecap="round" strokeWidth="2"></path>
</svg>
</div>
</div>
{/*  KPI 4: MTTR  */}
<div className="relative overflow-hidden p-6 clay-card group hover:-translate-y-0.5 transition-all">
<div className="flex items-center justify-between">
<span className="text-[13px] font-semibold text-on-surface-variant">MTTR</span>
<div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#fef3c7] text-[#f59e0b] border border-[#fde68a]/50 shadow-sm">
<span className="material-symbols-outlined text-[19px]" style={{"fontVariationSettings":"\"FILL\" 1"}}>timer</span>
</div>
</div>
<div className="mt-3 flex items-baseline justify-between">
<span className="font-headline-lg text-[32px] font-extrabold text-on-surface tracking-tight leading-none">5 min</span>
<span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-[#059669] bg-[#d1fae5]/80">
<span className="material-symbols-outlined text-[13px]">arrow_downward</span>
          58%
        </span>
</div>
<p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">(was 12 min)</p>
{/*  Sparkline Wave SVG  */}
<div className="mt-2 w-full h-8 overflow-hidden">
<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 32">
<defs>
<linearGradient id="kpiGrad4" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
<path d="M0 8 Q 40 24 80 12 T 120 28 T 160 10 L 160 32 L 0 32 Z" fill="url(#kpiGrad4)"></path>
<path d="M0 8 Q 40 24 80 12 T 120 28 T 160 10" fill="none" stroke="#f59e0b" strokeLinecap="round" strokeWidth="2"></path>
</svg>
</div>
</div>
</section>
{/*  TWO-COLUMN MAIN BODY  */}
<section className="overview-grid grid grid-cols-1 lg:grid-cols-12 items-start">
{/*  LEFT COLUMN (Approx 60% -> 7 cols on lg)  */}
<div className="lg:col-span-7 overview-stack flex flex-col min-w-0">
{/*  CARD A: Active Incidents Table  */}
<div className="p-6 clay-card flex flex-col">
<div className="flex items-center justify-between pb-4 border-b border-slate-100">
<div className="flex items-center gap-2.5">
<h2 className="text-[17px] font-bold text-on-surface tracking-tight">Active Incidents</h2>
<span className="px-2 py-0.5 rounded-full text-[11px] bg-[#fee2e2] text-[#ef4444] font-bold">3</span>
</div>
<a className="text-[13px] text-[#5c67f5] hover:text-[#4f59e8] font-semibold inline-flex items-center gap-1 transition-colors" href="#">
            View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</a>
</div>
<div className="overflow-x-auto pt-2">
<table className="w-full text-left">
<thead>
<tr className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
<th className="py-3 px-3">ID</th>
<th className="py-3 px-3">Title / Root Cause</th>
<th className="py-3 px-3">Severity</th>
<th className="py-3 px-3">Affected Services</th>
<th className="py-3 px-3 text-right">Status</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100/80">
{/*  Row 1  */}
<tr className="hover:bg-slate-50/70 transition-colors group">
<td className="py-3.5 px-3 font-mono text-[12px] text-slate-400 font-medium">#1024</td>
<td className="py-3.5 px-3">
<div className="flex items-start gap-2.5">
<span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] mt-1 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Database connection failure</span>
<span className="text-[12px] text-slate-400">Multiple services affected</span>
</div>
</div>
</td>
<td className="py-3.5 px-3">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-[#fee2e2] text-[#ef4444] font-bold tracking-wide">
                    CRITICAL
                  </span>
</td>
<td className="py-3.5 px-3">
<div className="flex items-center gap-1.5">
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Database">
<span className="material-symbols-outlined text-[15px]">database</span>
</div>
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Service Engine">
<span className="material-symbols-outlined text-[15px]">settings</span>
</div>
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Cart Checkout">
<span className="material-symbols-outlined text-[15px]">shopping_cart</span>
</div>
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Public Gateway">
<span className="material-symbols-outlined text-[15px]">public</span>
</div>
</div>
</td>
<td className="py-3.5 px-3 text-right">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-[#e0edff] text-[#3b82f6] font-semibold">
                    Investigating
                  </span>
</td>
</tr>
{/*  Row 2  */}
<tr className="hover:bg-slate-50/70 transition-colors group">
<td className="py-3.5 px-3 font-mono text-[12px] text-slate-400 font-medium">#1023</td>
<td className="py-3.5 px-3">
<div className="flex items-start gap-2.5">
<span className="w-2.5 h-2.5 rounded-full bg-[#f97316] mt-1 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">High CPU Usage</span>
<span className="text-[12px] text-slate-400">CPU saturation on server-3</span>
</div>
</div>
</td>
<td className="py-3.5 px-3">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-[#ffedd5] text-[#ea580c] font-bold tracking-wide">
                    HIGH
                  </span>
</td>
<td className="py-3.5 px-3">
<div className="flex items-center gap-1.5">
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Cluster Host">
<span className="material-symbols-outlined text-[15px]">dns</span>
</div>
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Engine Core">
<span className="material-symbols-outlined text-[15px]">tune</span>
</div>
</div>
</td>
<td className="py-3.5 px-3 text-right">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
                    Acknowledged
                  </span>
</td>
</tr>
{/*  Row 3  */}
<tr className="hover:bg-slate-50/70 transition-colors group">
<td className="py-3.5 px-3 font-mono text-[12px] text-slate-400 font-medium">#1022</td>
<td className="py-3.5 px-3">
<div className="flex items-start gap-2.5">
<span className="w-2.5 h-2.5 rounded-full bg-[#10b981] mt-1 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
<div className="flex flex-col">
<span className="text-[14px] font-bold text-on-surface group-hover:text-primary transition-colors">Payment Gateway Timeout</span>
<span className="text-[12px] text-slate-400">Third-party service issue</span>
</div>
</div>
</td>
<td className="py-3.5 px-3">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-[#fef3c7] text-[#d97706] font-bold tracking-wide">
                    MEDIUM
                  </span>
</td>
<td className="py-3.5 px-3">
<div className="flex items-center gap-1.5">
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Stripe / Card">
<span className="material-symbols-outlined text-[15px]">credit_card</span>
</div>
<div className="w-7 h-7 rounded-xl bg-[#f4f6fb] text-slate-600 flex items-center justify-center border border-slate-200/60 shadow-xs" title="Edge Router">
<span className="material-symbols-outlined text-[15px]">language</span>
</div>
</div>
</td>
<td className="py-3.5 px-3 text-right">
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-[#d1fae5] text-[#059669] font-semibold">
                    Resolved
                  </span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
{/*  CARD B: Service Dependency Map  */}
<div className="p-6 clay-card flex flex-col relative overflow-hidden">
<div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
<div className="flex items-center gap-2">
<h2 className="text-[17px] font-bold text-on-surface tracking-tight">Service Dependency Map</h2>
<span className="material-symbols-outlined text-[18px] text-[#059669]" title="Live Topology Active">hub</span>
</div>
<div className="flex items-center gap-3">
{/*  Diagram Legend  */}
<div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 bg-[#f4f6fb] px-3 py-1 rounded-full border border-slate-200/50">
<div className="flex items-center gap-1.5">
<span className="w-3 h-0.5 border-b-2 border-dashed border-[#ef4444] inline-block"></span>
<span className="">Failure Propagation</span>
</div>
<div className="flex items-center gap-1.5">
<span className="w-3 h-0.5 bg-slate-300 inline-block"></span>
<span className="">Dependency</span>
</div>
</div>
<div className="flex items-center gap-1 text-slate-400">
<button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 hover:text-on-surface transition-colors" title="Reload topology" type="button">
<span className="material-symbols-outlined text-[17px]">sync</span>
</button>
<button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 hover:text-on-surface transition-colors" title="Expand view" type="button">
<span className="material-symbols-outlined text-[17px]">open_in_full</span>
</button>
</div>
</div>
</div>
{/*  Dependency Graph Visualization  */}
<div className="relative w-full h-72 my-2 rounded-2xl bg-gradient-to-b from-[#f8f9fe] to-[#eff2fb] overflow-hidden flex flex-col justify-between p-4 border border-slate-100">
{/*  SVG Link Connectors  */}
<svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 700 280">
<defs>
<linearGradient id="coralGrad" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#ef4444" stopOpacity="0.9"></stop>
<stop offset="100%" stopColor="#ef4444" stopOpacity="0.3"></stop>
</linearGradient>
<marker id="arrow" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
<path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"></path>
</marker>
</defs>
{/*  Child 1: Auth Service (X ~ 87)  */}
<path d="M 350 56 C 350 120, 87 140, 87 205" fill="none" marker-end="url(#arrow)" stroke="url(#coralGrad)" strokeDasharray="5 4" strokeWidth="2"></path>
{/*  Child 2: Payment API (X ~ 262)  */}
<path d="M 350 56 C 350 120, 262 140, 262 205" fill="none" marker-end="url(#arrow)" stroke="url(#coralGrad)" strokeDasharray="5 4" strokeWidth="2"></path>
{/*  Child 3: Orders Service (X ~ 437)  */}
<path d="M 350 56 C 350 120, 437 140, 437 205" fill="none" marker-end="url(#arrow)" stroke="url(#coralGrad)" strokeDasharray="5 4" strokeWidth="2"></path>
{/*  Child 4: Frontend (X ~ 612)  */}
<path d="M 350 56 C 350 120, 612 140, 612 205" fill="none" marker-end="url(#arrow)" stroke="url(#coralGrad)" strokeDasharray="5 4" strokeWidth="2"></path>
</svg>
{/*  ROOT NODE (TOP CENTER)  */}
<div className="relative z-10 flex justify-center pt-1">
<div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white shadow-[0_8px_24px_rgba(239,68,68,0.18)] border border-red-100 hover:scale-105 transition-transform cursor-pointer">
<div className="relative">
<span className="w-3 h-3 rounded-full bg-[#ef4444] animate-ping absolute inset-0"></span>
<span className="w-3 h-3 rounded-full bg-[#ef4444] relative inline-block"></span>
</div>
<div className="w-8 h-8 rounded-xl bg-[#fee2e2] flex items-center justify-center text-[#ef4444]">
<span className="material-symbols-outlined text-[19px]">database</span>
</div>
<div className="flex flex-col text-left">
<span className="text-[14px] font-extrabold text-[#ef4444] leading-tight">Database</span>
<span className="text-[11px] text-slate-400 leading-none">Root Cause Detected</span>
</div>
</div>
</div>
{/*  CHILDREN NODES (HORIZONTAL ROW)  */}
<div className="relative z-10 grid grid-cols-4 gap-3 pb-1">
{/*  Child 1: Auth Service  */}
<div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white shadow-[0_4px_16px_rgba(112,128,176,0.06)] border border-slate-100 hover:shadow-md transition-all cursor-pointer">
<div className="w-9 h-9 rounded-xl bg-[#d1fae5] text-[#059669] flex items-center justify-center mb-1.5 shadow-xs">
<span className="material-symbols-outlined text-[19px]">person</span>
</div>
<span className="text-[13px] font-bold text-on-surface truncate max-w-[110px]">Auth Service</span>
<span className="text-[11px] font-bold text-[#ef4444] mt-0.5">(Timeouts)</span>
</div>
{/*  Child 2: Payment API  */}
<div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white shadow-[0_4px_16px_rgba(112,128,176,0.06)] border border-slate-100 hover:shadow-md transition-all cursor-pointer">
<div className="w-9 h-9 rounded-xl bg-[#e0edff] text-[#3b82f6] flex items-center justify-center mb-1.5 shadow-xs">
<span className="material-symbols-outlined text-[19px]">payments</span>
</div>
<span className="text-[13px] font-bold text-on-surface truncate max-w-[110px]">Payment API</span>
<span className="text-[11px] font-bold text-[#ef4444] mt-0.5">(500 errors)</span>
</div>
{/*  Child 3: Orders Service  */}
<div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white shadow-[0_4px_16px_rgba(112,128,176,0.06)] border border-slate-100 hover:shadow-md transition-all cursor-pointer">
<div className="w-9 h-9 rounded-xl bg-[#eff1fe] text-[#5c67f5] flex items-center justify-center mb-1.5 shadow-xs">
<span className="material-symbols-outlined text-[19px]">shopping_bag</span>
</div>
<span className="text-[13px] font-bold text-on-surface truncate max-w-[110px]">Orders Service</span>
<span className="text-[11px] font-bold text-[#ef4444] mt-0.5">(Failures)</span>
</div>
{/*  Child 4: Frontend  */}
<div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white shadow-[0_4px_16px_rgba(112,128,176,0.06)] border border-slate-100 hover:shadow-md transition-all cursor-pointer">
<div className="w-9 h-9 rounded-xl bg-[#f1f5f9] text-slate-600 flex items-center justify-center mb-1.5 shadow-xs">
<span className="material-symbols-outlined text-[19px]">devices</span>
</div>
<span className="text-[13px] font-bold text-on-surface truncate max-w-[110px]">Frontend</span>
<span className="text-[11px] font-bold text-[#ef4444] mt-0.5">(Latency)</span>
</div>
</div>
</div>
</div>
</div>
{/*  RIGHT COLUMN (Approx 40% -> 5 cols on lg)  */}
<div className="lg:col-span-5 overview-stack flex flex-col min-w-0">
{/* Alert Reduction (Recharts injected here) */}
<div className="p-6 clay-card flex flex-col h-[380px]">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-[17px] font-bold text-on-surface tracking-tight">Alert Reduction</h2>
    <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#d1fae5] text-[#059669] font-bold tracking-wide">
      94.6% Noise Reduction
    </span>
  </div>
  <div className="flex-1 w-full relative">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={alertReductionData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
          {alertReductionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
{/* Alerts by Severity (Recharts injected here) */}
<div className="p-6 clay-card flex flex-col h-[380px]">
  <h2 className="text-[17px] font-bold text-on-surface tracking-tight mb-2">Alerts by Severity</h2>
  <div className="flex-1 w-full relative flex items-center justify-center">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={severityData}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {severityData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
      </PieChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-[32px] font-extrabold text-on-surface leading-none">27</span>
      <span className="text-[12px] text-slate-400 font-medium mt-1">Alerts</span>
    </div>
  </div>
</div>
{/*  CARD E: Recent Alerts (Grouped) Table  */}
<div className="p-6 clay-card flex flex-col">
<div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
<div className="flex items-center gap-2">
<h2 className="text-[17px] font-bold text-on-surface tracking-tight">Recent Alerts</h2>
<span className="text-[12px] text-slate-400">(Grouped)</span>
</div>
<a className="text-[13px] text-[#5c67f5] hover:text-[#4f59e8] font-semibold inline-flex items-center gap-1 transition-colors" href="#">
            View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</a>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left text-[13px]">
<thead>
<tr className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
<th className="py-2.5 px-2">Time</th>
<th className="py-2.5 px-2">Alert</th>
<th className="py-2.5 px-2">Service</th>
<th className="py-2.5 px-2 text-right">Status</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100/70">
{/*  Alert Row 1  */}
<tr className="hover:bg-slate-50/60 transition-colors">
<td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">10:01:12</td>
<td className="py-2.5 px-2 font-semibold text-on-surface">DB connection timeout</td>
<td className="py-2.5 px-2 text-slate-500">Database</td>
<td className="py-2.5 px-2 text-right">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-[#eff1fe] text-[#5c67f5] font-bold">
                    Grouped
                  </span>
</td>
</tr>
{/*  Alert Row 2  */}
<tr className="hover:bg-slate-50/60 transition-colors">
<td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">10:01:18</td>
<td className="py-2.5 px-2 text-on-surface font-medium">HTTP 500 error</td>
<td className="py-2.5 px-2 text-slate-500">Payment API</td>
<td className="py-2.5 px-2 text-right">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-500 font-medium">
                    Suppressed
                  </span>
</td>
</tr>
{/*  Alert Row 3  */}
<tr className="hover:bg-slate-50/60 transition-colors">
<td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">10:01:18</td>
<td className="py-2.5 px-2 text-on-surface font-medium">Login failure</td>
<td className="py-2.5 px-2 text-slate-500">Auth Service</td>
<td className="py-2.5 px-2 text-right">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-500 font-medium">
                    Suppressed
                  </span>
</td>
</tr>
{/*  Alert Row 4  */}
<tr className="hover:bg-slate-50/60 transition-colors">
<td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">10:01:20</td>
<td className="py-2.5 px-2 text-on-surface font-medium">Service unavailable</td>
<td className="py-2.5 px-2 text-slate-500">Orders Service</td>
<td className="py-2.5 px-2 text-right">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-500 font-medium">
                    Suppressed
                  </span>
</td>
</tr>
{/*  Alert Row 5  */}
<tr className="hover:bg-slate-50/60 transition-colors">
<td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">10:01:23</td>
<td className="py-2.5 px-2 text-on-surface font-medium">High latency</td>
<td className="py-2.5 px-2 text-slate-500">API Gateway</td>
<td className="py-2.5 px-2 text-right">
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-500 font-medium">
                    Suppressed
                  </span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</section>


</div>
  );
}
