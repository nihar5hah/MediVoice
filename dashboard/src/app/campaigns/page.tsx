'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Phone, Search, Plus, X, Check, Trash2, Clock, RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api, type Campaign, type CampaignJob } from '@/lib/api';
import { cn } from '@/lib/utils';

const OUTCOME_CHIP: Record<string, string> = {
  accepted:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected:      'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  initiated:     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  needs_follow_up: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};
const JOB_CHIP: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  running: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  done:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  failed:  'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<CampaignJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queue'|'history'>('queue');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId:'', campaignType:'reminder' as 'reminder'|'follow_up', destinationNumber:'', delayMinutes:'0' });
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string|null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getCampaigns(), api.getCampaignJobs()])
      .then(([c,j]) => { setCampaigns(c); setJobs(j); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    accepted: campaigns.filter(c=>c.outcome==='accepted').length,
    rejected: campaigns.filter(c=>c.outcome==='rejected').length,
    pending: jobs.filter(j=>j.status==='pending').length,
  }), [campaigns, jobs]);

  const filteredHistory = useMemo(() => campaigns
    .filter(c => { const q=search.toLowerCase(); return !q||c.patient_id.toLowerCase().includes(q)||c.campaign_type.toLowerCase().includes(q)||c.outcome.toLowerCase().includes(q); })
    .sort((a,b) => new Date(b.at).getTime()-new Date(a.at).getTime())
  , [campaigns, search]);

  const filteredJobs = useMemo(() => jobs
    .filter(j => { const q=search.toLowerCase(); return !q||j.patientId.toLowerCase().includes(q)||j.campaignType.toLowerCase().includes(q)||j.status.toLowerCase().includes(q); })
    .sort((a,b) => new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
  , [jobs, search]);

  const handleSubmit = async () => {
    if (!form.patientId||!form.destinationNumber) return;
    setSubmitting(true);
    try { await api.scheduleCampaign({...form, delayMinutes:Number(form.delayMinutes)}); load(); setShowForm(false); setForm({patientId:'',campaignType:'reminder',destinationNumber:'',delayMinutes:'0'}); }
    catch(e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id:string) => {
    setCancelling(id);
    try { await api.cancelCampaignJob(id); load(); }
    catch(e) { console.error(e); }
    finally { setCancelling(null); }
  };

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total Campaigns',value:stats.total,color:'var(--accent)'},{label:'Accepted',value:stats.accepted,color:'#10b981'},{label:'Rejected',value:stats.rejected,color:'#f43f5e'},{label:'Queued Jobs',value:stats.pending,color:'#f59e0b'}].map(s=>(
          <div key={s.label} className="rounded-xl border p-4" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{color:'var(--text-muted)'}}>{s.label}</p>
            <p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg p-1" style={{background:'#f0f0f4'}}>
          {(['queue','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
              style={{background:tab===t?'#fff':undefined,color:tab===t?'var(--text-primary)':'var(--text-secondary)',boxShadow:tab===t?'0 1px 3px rgba(0,0,0,0.08)':undefined}}>
              {t==='queue'?`Active Jobs (${jobs.filter(j=>j.status==='pending'||j.status==='running').length})`:'History'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{color:'var(--text-muted)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none" style={{borderColor:'var(--card-border)',background:'#fff',color:'var(--text-primary)'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--card-border)')}/>
          </div>
          <button onClick={load} className="flex items-center justify-center h-8 w-8 rounded-lg border transition-colors" style={{borderColor:'var(--card-border)',color:'var(--text-secondary)'}} onMouseEnter={e=>(e.currentTarget.style.background='#f3f4f6')} onMouseLeave={e=>(e.currentTarget.style.background='')}><RefreshCw className="h-3.5 w-3.5"/></button>
          <button onClick={()=>setShowForm(v=>!v)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{background:'var(--accent)'}}>
            {showForm?<X className="h-3.5 w-3.5"/>:<Plus className="h-3.5 w-3.5"/>}{showForm?'Cancel':'New Campaign'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border p-5" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
          <p className="text-sm font-semibold mb-4" style={{color:'var(--text-primary)'}}>Schedule Outbound Campaign Call</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[{key:'patientId',label:'Patient ID',placeholder:'e.g. p-patient-1',type:'text'},{key:'destinationNumber',label:'Phone Number',placeholder:'+91 9XXXXXXXXX',type:'tel'}].map(f=>(
              <div key={f.key}>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--card-border)')}/>
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>Type</label>
              <select value={form.campaignType} onChange={e=>setForm(p=>({...p,campaignType:e.target.value as 'reminder'|'follow_up'}))} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}}>
                <option value="reminder">Reminder</option><option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>Delay (minutes)</label>
              <input type="number" min="0" value={form.delayMinutes} onChange={e=>setForm(p=>({...p,delayMinutes:e.target.value}))} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--card-border)')}/>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleSubmit} disabled={submitting||!form.patientId||!form.destinationNumber} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{background:'var(--accent)'}}>
              {submitting?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}{submitting?'Scheduling…':'Schedule Call'}
            </button>
          </div>
        </div>
      )}

      {/* Queue tab */}
      {tab==='queue' && (
        <div className="rounded-xl border overflow-hidden" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
          {loading ? <div className="py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>Loading…</div>
          : filteredJobs.length===0 ? <div className="py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>No jobs in queue</div>
          : <table className="w-full text-sm">
              <thead style={{borderBottom:'1px solid var(--card-border)',background:'#fafafa'}}>
                <tr>
                  {['Job ID','Patient','Type','Scheduled At','Attempts','Status',''].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(j=>(
                  <tr key={j.id} className="border-b transition-colors last:border-0" style={{borderColor:'var(--card-border)'}} onMouseEnter={e=>(e.currentTarget.style.background='#f8f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td className="px-4 py-3"><span className="font-mono text-xs" style={{color:'var(--text-muted)'}}>{j.id.slice(-8)}</span></td>
                    <td className="px-4 py-3"><span className="font-mono text-xs" style={{color:'var(--text-primary)'}}>{j.patientId}</span></td>
                    <td className="px-4 py-3 text-xs capitalize" style={{color:'var(--text-secondary)'}}>{j.campaignType.replace('_',' ')}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{color:'var(--text-secondary)'}}>{new Date(j.scheduledAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td>
                    <td className="px-4 py-3 text-xs" style={{color:'var(--text-secondary)'}}>{j.attempts}</td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',JOB_CHIP[j.status])}>{j.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      {j.status==='pending' && (
                        <button onClick={()=>handleCancel(j.id)} className="rounded-md p-1.5 transition-colors" style={{color:'var(--text-muted)'}} onMouseEnter={e=>{e.currentTarget.style.color='var(--rose)';e.currentTarget.style.background='#fff1f2';}} onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='';}}>  
                          {cancelling===j.id?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Trash2 className="h-3.5 w-3.5"/>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          <div className="px-4 py-2.5 text-[11px]" style={{borderTop:'1px solid var(--card-border)',background:'#fafafa',color:'var(--text-muted)'}}>{jobs.length} total jobs</div>
        </div>
      )}

      {/* History tab */}
      {tab==='history' && (
        <div className="rounded-xl border overflow-hidden" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
          {loading ? <div className="py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>Loading…</div>
          : filteredHistory.length===0 ? <div className="py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>No campaign history</div>
          : <table className="w-full text-sm">
              <thead style={{borderBottom:'1px solid var(--card-border)',background:'#fafafa'}}>
                <tr>{['Date','Patient','Type','Outcome'].map(h=><th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredHistory.map(c=>(
                  <tr key={c.id} className="border-b transition-colors last:border-0" style={{borderColor:'var(--card-border)'}} onMouseEnter={e=>(e.currentTarget.style.background='#f8f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    <td className="px-4 py-3 text-xs font-mono" style={{color:'var(--text-secondary)'}}>{new Date(c.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs" style={{color:'var(--text-primary)'}}>{c.patient_id}</span></td>
                    <td className="px-4 py-3 text-xs capitalize" style={{color:'var(--text-secondary)'}}>{c.campaign_type.replace('_',' ')}</td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',OUTCOME_CHIP[c.outcome]||'bg-gray-50 text-gray-600 ring-1 ring-gray-200')}>{c.outcome.replace(/_/g,' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          <div className="px-4 py-2.5 text-[11px]" style={{borderTop:'1px solid var(--card-border)',background:'#fafafa',color:'var(--text-muted)'}}>{filteredHistory.length} of {campaigns.length} entries</div>
        </div>
      )}
    </div>
  );
}
