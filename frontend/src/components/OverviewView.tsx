import { useEffect, useState } from 'react';
import { AnalyticsView } from './AnalyticsView';
import { TopologyView } from './TopologyView';
interface DashboardStats {
  raw_alert_count: number;
  notifications_sent: number;
  reduction_percent: number;
  critical_alerts_total: number;
  critical_alerts_notified: number;
  mttr_seconds: number;
  mtta_seconds: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = (seconds / 60).toFixed(1);
  return `${m} min`;
}

export function OverviewView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-[14px] font-medium animate-pulse">Loading dashboard data...</div>
      </div>
    );
  }

  const suppressed = Math.max(0, stats.raw_alert_count - stats.notifications_sent);
  const sb = stats.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };
  const sevTotal = sb.critical + sb.high + sb.medium + sb.low;

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Total Alerts Ingested</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-indigo-100 text-[#5c67f5] border border-indigo-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">notifications</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">{stats.raw_alert_count.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Raw monitoring events</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Notifications Sent</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">send</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-emerald-600 tracking-tight leading-none">{stats.notifications_sent.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Actionable alerts delivered</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Noise Suppressed</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">volume_off</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-[32px] font-extrabold text-rose-600 tracking-tight leading-none">{suppressed.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[12px] text-on-surface-variant/80 font-medium">Duplicates, batched, cooled-down</p>
        </div>

        <div className="p-5 clay-card hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-on-surface-variant">Critical Recall</span>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 border border-amber-200 shadow-sm">
              <span className="material-symbols-outlined text-[19px]">verified</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[32px] font-extrabold text-on-surface tracking-tight leading-none">
              {stats.critical_alerts_total > 0
                ? ((stats.critical_alerts_notified / stats.critical_alerts_total) * 100).toFixed(0)
                : '100'}%
            </span>
          </div>
          <p className="mt-1 text-[12px] text-emerald-700 font-semibold">
            {stats.critical_alerts_notified}/{stats.critical_alerts_total} critical alerts delivered
          </p>
        </div>
      </div>

      {/* Alert Reduction + Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Reduction Card */}
        <div className="clay-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Alert Noise Reduction</h3>
              <p className="text-[12px] text-slate-500">Before vs After pipeline processing</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#d1fae5] text-emerald-800 text-[11px] font-bold">
              {stats.reduction_percent.toFixed(1)}% Noise Reduction
            </span>
          </div>

          <div className="space-y-4">
            {/* Before bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-slate-600">Before (Raw Alerts)</span>
                <span className="font-bold text-on-surface text-[18px]">{stats.raw_alert_count.toLocaleString()}</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-rose-400 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* After bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-slate-600">After (Notifications Sent)</span>
                <span className="font-bold text-emerald-700 text-[18px]">{stats.notifications_sent.toLocaleString()}</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(2, 100 - stats.reduction_percent)}%` }}
                ></div>
              </div>
            </div>

            {/* MTTR + MTTA footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">MTTA</span>
                <span className="text-[16px] font-extrabold text-[#5c67f5]">{formatTime(stats.mtta_seconds)}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">MTTR</span>
                <span className="text-[16px] font-extrabold text-emerald-600">{formatTime(stats.mttr_seconds)}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Reduction</span>
                <span className="text-[16px] font-extrabold text-rose-600">{stats.reduction_percent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Breakdown Card */}
        <div className="clay-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Alerts by Severity</h3>
              <p className="text-[12px] text-slate-500">Distribution of ingested alert severity</p>
            </div>
            <span className="text-[26px] font-extrabold text-on-surface">{sevTotal.toLocaleString()}</span>
          </div>

          <div className="space-y-4">
            {/* Critical */}
            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical
                </span>
                <span className="text-rose-600 font-bold">{sb.critical.toLocaleString()} ({sevTotal > 0 ? ((sb.critical / sevTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-700" style={{ width: `${sevTotal > 0 ? (sb.critical / sevTotal) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* High */}
            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High
                </span>
                <span className="text-amber-600 font-bold">{sb.high.toLocaleString()} ({sevTotal > 0 ? ((sb.high / sevTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-700" style={{ width: `${sevTotal > 0 ? (sb.high / sevTotal) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Medium */}
            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Medium
                </span>
                <span className="text-yellow-600 font-bold">{sb.medium.toLocaleString()} ({sevTotal > 0 ? ((sb.medium / sevTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full rounded-full transition-all duration-700" style={{ width: `${sevTotal > 0 ? (sb.medium / sevTotal) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Low */}
            <div>
              <div className="flex justify-between text-[13px] font-semibold text-on-surface mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Low
                </span>
                <span className="text-sky-600 font-bold">{sb.low.toLocaleString()} ({sevTotal > 0 ? ((sb.low / sevTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full transition-all duration-700" style={{ width: `${sevTotal > 0 ? (sb.low / sevTotal) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topology Graph */}
      <div className="pt-6">
        <TopologyView />
      </div>

      {/* Analytics Section */}
      <div className="pt-6 border-t border-slate-100">
        <h2 className="text-[20px] font-extrabold text-on-surface mb-6 px-1">Advanced Analytics</h2>
        <AnalyticsView />
      </div>
    </div>
  );
}
