'use client';

import { useEffect, useMemo, useState } from 'react';
import { Stethoscope, Search, Calendar } from 'lucide-react';
import { api, type Doctor } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');

  useEffect(() => {
    api.getDoctors()
      .then(d => setDoctors(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(
    () => ['All', ...Array.from(new Set(doctors.map(d => d.specialty)))],
    [doctors]
  );

  const filtered = useMemo(() => {
    return doctors.filter(d => {
      const q = search.toLowerCase();
      return (
        (specialtyFilter === 'All' || d.specialty === specialtyFilter) &&
        (d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
      );
    });
  }, [doctors, search, specialtyFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {specialties.map(s => (
            <button
              key={s}
              onClick={() => setSpecialtyFilter(s)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                specialtyFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doctor or specialty..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Loading doctors...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
          <Stethoscope className="h-8 w-8" />
          <p className="text-sm">No doctors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-sm font-bold">
                  {doc.name.split(' ').pop()?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{doc.name}</h3>
                  <p className="text-xs text-slate-500">{doc.specialty}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{doc.specialty}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {doc.appointments} appointment{doc.appointments !== 1 ? 's' : ''} in system
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-600/20 font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
