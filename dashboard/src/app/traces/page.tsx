'use client';

import { useEffect, useState, useMemo } from 'react';
import { Activity, ChevronDown, ChevronRight, Clock, Search, RefreshCw, Zap } from 'lucide-react';
import { api, type Trace, type TraceStep } from '@/lib/api';
import { cn } from '@/lib/utils';

const INTENT_COLOR: Record<string, string> = {
  book:               'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  reschedule:         'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  cancel:             'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  list:               'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
  check_availability: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  campaign_response:  'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  clarify:            'bg-slate-50 text-slate-400 ring-1 ring-slate-200',
};

const LANG_LABEL: Record<string, string> = { en: 'EN', hi: 'HI', ta: 'TA' };

const STEP_COLOR: Record<string, string> = {
  'memory.load':   'text-indigo-600',
  'memory.save':   'text-indigo-600',
  'agent.parse':   'text-sky-600',
  'tool.':         'text-emerald-600',
  'gather.':       'text-amber-600',
  'confirm.':      'text-violet-600',
};

function stepColor(step: string) {
  for (const [prefix, cls] of Object.entries(STEP_COLOR)) {
    if (step.startsWith(prefix)) return cls;
  }
  return 'text-slate-500';
}

function LatencyBar({ ms }: { ms: number }) {
  const pct = Math.min(ms / 300, 1);
  const color = ms < 100 ? 'bg-emerald-400' : ms < 200 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className={cn('text-xs font-mono font-semibold', ms < 100 ? 'text-emerald-600' : ms < 200 ? 'text-amber-600' : 'text-rose-600')}>{ms}ms</span>
    </div>
  );
}

function TraceStepRow({ step }: { step: TraceStep }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-slate-400 w-10 text-right">{step.elapsedMs}ms</span>
      <span className={cn('shrink-0 font-mono text-[11px] font-semibold w-40', stepColor(step.step))}>{step.step}</span>
      <span className="text-xs text-slate-600 leading-relaxed">{step.detail}</span>
    </div>
  );
}

function TraceRow({ t }: { t: Trace }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="shrink-0 text-slate-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>

        {/* Turn # */}
        <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">{t.turn}</span>

        {/* Intent chip */}
        {t.intent && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', INTENT_COLOR[t.intent] ?? INTENT_COLOR.clarify)}>{t.intent}</span>
        )}

        {/* Language */}
        {t.language && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{LANG_LABEL[t.language] ?? t.language}</span>
        )}

        {/* Utterance */}
        <span className="flex-1 min-w-0 truncate text-sm text-slate-700">"{t.utterance}"</span>

        {/* Latency */}
        <span className="shrink-0"><LatencyBar ms={t.latencyMs} /></span>

        {/* Time */}
        <span className="shrink-0 text-xs text-slate-400 tabular-nums">
          {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
          {/* Utterance / Reply */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient</p>
              <p className="text-sm text-slate-700">{t.utterance}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">Agent reply</p>
              <p className="text-sm text-indigo-800">{t.reply}</p>
            </div>
          </div>

          {/* Trace steps */}
          {t.trace.length > 0 && (
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Zap className="h-3 w-3" /> Reasoning trace ({t.trace.length} steps)</p>
              {t.trace.map((s, i) => <TraceStepRow key={i} step={s} />)}
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <span>Call ID: <span className="font-mono text-slate-600">{t.callId}</span></span>
            <span>Patient: <span className="font-mono text-slate-600">{t.patientId}</span></span>
            <span>{new Date(t.createdAt).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.getTraces(200).then(setTraces).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return traces;
    return traces.filter(t =>
      t.patientId.toLowerCase().includes(q) ||
      t.utterance.toLowerCase().includes(q) ||
      t.reply.toLowerCase().includes(q) ||
      (t.intent ?? '').includes(q) ||
      t.callId.toLowerCase().includes(q)
    );
  }, [traces, search]);

  const avgLatency = traces.length ? Math.round(traces.reduce((s, t) => s + t.latencyMs, 0) / traces.length) : 0;
  const p95 = traces.length ? [...traces].sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(traces.length * 0.95)]?.latencyMs ?? 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Reasoning Traces</h1>
          <p className="mt-0.5 text-sm text-slate-500">Per-turn agent trace for every Vapi call — intent, tool calls, latency, and reply</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total turns',    value: traces.length, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Avg latency',    value: `${avgLatency}ms`, icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'p95 latency',    value: `${p95}ms`, icon: Zap, color: p95 > 450 ? 'text-rose-600' : 'text-emerald-600', bg: p95 > 450 ? 'bg-rose-50' : 'bg-emerald-50' },
          { label: 'Unique calls',   value: new Set(traces.map(t => t.callId)).size, icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          placeholder="Search by patient ID, utterance, reply, intent, or call ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Trace list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading traces…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-20 text-slate-400">
          <Activity className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">{search ? 'No matching traces' : 'No traces yet — make a call to see reasoning traces here'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, i) => <TraceRow key={t.id ?? i} t={t} />)}
        </div>
      )}
    </div>
  );
}
