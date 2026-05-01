'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Users, Phone, Activity, PieChart } from 'lucide-react';
import { api, type Analytics } from '@/lib/api';

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading analytics...</div>;
  if (!data) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data available.</div>;

  const totalAppts = data.totalAppointments || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Total Appointments" value={String(data.totalAppointments)} icon={Calendar} color="bg-sky-500" />
        <Stat label="Booked" value={String(data.booked)} icon={TrendingUp} color="bg-emerald-500" />
        <Stat label="Total Patients" value={String(data.totalPatients)} icon={Users} color="bg-violet-500" />
        <Stat label="Campaigns" value={String(data.totalCampaigns)} icon={Phone} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-sky-500" />
            <h3 className="text-sm font-semibold text-slate-900">Appointment Status Distribution</h3>
          </div>
          <DistributionBar label="Booked" value={data.booked} total={totalAppts} color="bg-sky-500" />
          <DistributionBar label="Cancelled" value={data.cancelled} total={totalAppts} color="bg-red-400" />
          <DistributionBar label="Completed" value={data.completed} total={totalAppts} color="bg-emerald-500" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-900">Language Distribution</h3>
          </div>
          {Object.entries(data.languageDistribution).map(([lang, count]) => (
            <DistributionBar key={lang} label={lang.toUpperCase()} value={count} total={data.totalPatients || 1} color="bg-violet-400" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Specialty Distribution</h3>
          </div>
          {Object.entries(data.specialtyDistribution).map(([spec, count]) => (
            <DistributionBar key={spec} label={spec} value={count} total={totalAppts} color="bg-amber-400" />
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900">Top Doctors</h3>
          </div>
          {Object.entries(data.doctorDistribution).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([doc, count]) => (
            <DistributionBar key={doc} label={doc} value={count} total={totalAppts} color="bg-emerald-400" />
          ))}
        </div>
      </div>
    </div>
  );
}
