import { useEffect, useRef, useState } from 'react';
import { screensData } from '../screensData';

interface DashboardStats {
  raw_alert_count: number;
  notifications_sent: number;
  reduction_percent: number;
  critical_alerts_total: number;
  critical_alerts_notified: number;
}

export function OverviewView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  useEffect(() => {
    if (!containerRef.current || !stats) return;

    // Safely query DOM elements inside the raw HTML
    // 1. Top KPI Row (font-headline-lg)
    // 0 = Active Incidents, 1 = Total Alerts, 2 = Suppressed Alerts
    const kpis = containerRef.current.querySelectorAll('.font-headline-lg');
    if (kpis.length >= 3) {
      kpis[0].textContent = stats.notifications_sent.toString();
      kpis[1].textContent = stats.raw_alert_count.toString();
      kpis[2].textContent = Math.max(0, stats.raw_alert_count - stats.notifications_sent).toString();
    }

    // 2. Alert Reduction Card (text-[18px])
    const bigBars = containerRef.current.querySelectorAll('.text-\\[18px\\]');
    if (bigBars.length >= 2) {
      bigBars[0].textContent = stats.raw_alert_count.toString(); // Before
      bigBars[1].textContent = stats.notifications_sent.toString(); // After
    }

    // 3. Reduction Percent text pills
    const reductionPills = containerRef.current.querySelectorAll('.text-\\[11px\\].bg-\\[\\#d1fae5\\]');
    reductionPills.forEach(pill => {
      if (pill.textContent?.includes('Noise Reduction')) {
        pill.textContent = `${stats.reduction_percent.toFixed(1)}% Noise Reduction`;
      }
    });

    // 4. Reduction Percent floating badge
    const badge = containerRef.current.querySelector('.absolute.top-8.left-1\\/2');
    if (badge) {
      badge.innerHTML = `<span class="material-symbols-outlined text-[15px]">trending_down</span> -${stats.reduction_percent.toFixed(1)}%`;
    }

    // 5. Alerts by Severity Donut Total
    const severityDonut = containerRef.current.querySelector('.text-\\[26px\\]');
    if (severityDonut) {
      severityDonut.textContent = stats.notifications_sent.toString();
    }

  }, [stats]);

  return (
    <div 
      ref={containerRef}
      className="w-full"
      dangerouslySetInnerHTML={{ __html: screensData['overview'] || '' }} 
    />
  );
}
