'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Search, ChevronUp, ChevronDown, Trash2, Edit2, X, Check, ChevronsUpDown, Globe, Clock, FileText } from 'lucide-react';
import { api, type Patient } from '@/lib/api';
import { cn } from '@/lib/utils';

const LANG: Record<string, string> = { en: 'English', hi: 'Hindi', ta: 'Tamil' };
const LANG_COLOR: Record<string, string> = { en: 'bg-sky-50 text-sky-700 ring-sky-200', hi: 'bg-orange-50 text-orange-700 ring-orange-200', ta: 'bg-purple-50 text-purple-700 ring-purple-200' };
type SK = 'patient_id'|'language_preference'|'updated_at';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lf, setLf] = useState('all');
  const [sk, setSk] = useState<SK>('updated_at');
  const [sd, setSd] = useState<'asc'|'desc'>('desc');
  const [sel, setSel] = useState<Patient|null>(null);
  const [editing, setEditing] = useState(false);
  const [eLang, setELang] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = () => { setLoading(true); api.getPatients().then(setPatients).catch(console.error).finally(()=>setLoading(false)); };
  useEffect(load, []);

  const counts = useMemo(()=>({ all:patients.length, en:patients.filter(p=>p.language_preference==='en').length, hi:patients.filter(p=>p.language_preference==='hi').length, ta:patients.filter(p=>p.language_preference==='ta').length }), [patients]);

  const filtered = useMemo(()=>patients
    .filter(p=>{ const q=search.toLowerCase(); return (!q||p.patient_id.toLowerCase().includes(q))&&(lf==='all'||p.language_preference===lf); })
    .sort((a,b)=>{ const v=(x:Patient)=>sk==='updated_at'?x.updated_at:sk==='language_preference'?x.language_preference:x.patient_id; return sd==='asc'?v(a).localeCompare(v(b)):v(b).localeCompare(v(a)); })
  ,[patients,search,lf,sk,sd]);

  const toggleSort=(k:SK)=>{ if(sk===k) setSd(d=>d==='asc'?'desc':'asc'); else { setSk(k); setSd('asc'); } };
  const openDetail=(p:Patient)=>{ setSel(p); setEditing(false); setELang(p.language_preference); };
  const handleSave=async()=>{ if(!sel) return; setSaving(true); try { await api.updatePatient(sel.patient_id,{language_preference:eLang as Patient['language_preference']}); load(); setSel(s=>s?{...s,language_preference:eLang as Patient['language_preference']}:null); setEditing(false); } finally { setSaving(false); } };
  const handleDelete=async(id:string)=>{ setDeleting(id); try { await api.deletePatient(id); load(); setSel(null); } finally { setDeleting(null); } };

  const SI=({k}:{k:SK})=>sk!==k?<ChevronsUpDown className="h-3 w-3 opacity-30"/>:sd==='asc'?<ChevronUp className="h-3 w-3" style={{color:'var(--accent)'}}/>:<ChevronDown className="h-3 w-3" style={{color:'var(--accent)'}}/>;
  const TH=({label,k}:{label:string;k:SK})=><th className="px-4 py-3 text-left"><button className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider hover:opacity-70" style={{color:'var(--text-secondary)'}} onClick={()=>toggleSort(k)}>{label}<SI k={k}/></button></th>;

  return (
    <div className="flex gap-5 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all','en','hi','ta'] as const).map(l=>(
              <button key={l} onClick={()=>setLf(l)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background:lf===l?'var(--accent)':'#f0f0f4', color:lf===l?'#fff':'var(--text-secondary)' }}>
                {l==='all'?'All':LANG[l]}
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background:lf===l?'rgba(255,255,255,0.22)':'#e5e7eb', color:lf===l?'#fff':'var(--text-secondary)' }}>{counts[l]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{color:'var(--text-muted)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient ID..." className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none" style={{borderColor:'var(--card-border)',background:'#fff',color:'var(--text-primary)'}} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--card-border)')}/>
          </div>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{borderBottom:'1px solid var(--card-border)',background:'#fafafa'}}>
                <tr><TH label="Patient ID" k="patient_id"/><TH label="Language" k="language_preference"/><TH label="Last Updated" k="updated_at"/><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>History</th><th className="px-4 py-3"/></tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>Loading…</td></tr>
                  : filtered.length===0
                  ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>No patients found</td></tr>
                  : filtered.map(p=>(
                    <tr key={p.patient_id} onClick={()=>openDetail(p)} className="cursor-pointer border-b transition-colors last:border-0"
                      style={{borderColor:'var(--card-border)',background:sel?.patient_id===p.patient_id?'var(--accent-light)':undefined}}
                      onMouseEnter={e=>{ if(sel?.patient_id!==p.patient_id) e.currentTarget.style.background='#f8f9ff'; }}
                      onMouseLeave={e=>{ if(sel?.patient_id!==p.patient_id) e.currentTarget.style.background=''; }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#4f46e5,#818cf8)'}}>{p.patient_id.slice(-2).toUpperCase()}</div>
                          <span className="font-mono text-xs font-medium" style={{color:'var(--text-primary)'}}>{p.patient_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',LANG_COLOR[p.language_preference]||'')}><Globe className="h-3 w-3"/>{LANG[p.language_preference]||p.language_preference}</span></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{color:'var(--text-secondary)'}}>{new Date(p.updated_at).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">{p.history?.length||0} entries</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e=>{e.stopPropagation();handleDelete(p.patient_id);}} className="rounded-md p-1.5 transition-colors" style={{color:'var(--text-muted)'}} onMouseEnter={e=>{e.currentTarget.style.color='var(--rose)';e.currentTarget.style.background='#fff1f2';}} onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='';}}>  
                          {deleting===p.patient_id?<Clock className="h-3.5 w-3.5 animate-spin"/>:<Trash2 className="h-3.5 w-3.5"/>}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-[11px]" style={{borderTop:'1px solid var(--card-border)',background:'#fafafa',color:'var(--text-muted)'}}>Showing {filtered.length} of {patients.length} patients</div>
        </div>
      </div>

      {sel && (
        <div className="detail-panel w-80 shrink-0">
          <div className="rounded-xl border overflow-hidden" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor:'var(--card-border)'}}>
              <p className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>Patient Profile</p>
              <button onClick={()=>setSel(null)} className="rounded-md p-1" onMouseEnter={e=>(e.currentTarget.style.background='#f3f4f6')} onMouseLeave={e=>(e.currentTarget.style.background='')}><X className="h-4 w-4" style={{color:'var(--text-muted)'}}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#4f46e5,#818cf8)'}}>{sel.patient_id.slice(-2).toUpperCase()}</div>
                <div><p className="font-mono text-sm font-semibold break-all" style={{color:'var(--text-primary)'}}>{sel.patient_id}</p>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 mt-1',LANG_COLOR[sel.language_preference]||'')}><Globe className="h-3 w-3"/>{LANG[sel.language_preference]}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{color:'var(--text-muted)'}}/>
                <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{color:'var(--text-muted)'}}>Last Updated</p><p className="text-xs font-mono" style={{color:'var(--text-primary)'}}>{new Date(sel.updated_at).toLocaleString('en-IN')}</p></div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5" style={{color:'var(--text-muted)'}}/>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>Interaction History</p>
                </div>
                <div className="rounded-lg border max-h-48 overflow-y-auto" style={{borderColor:'var(--card-border)'}}>
                  {sel.history?.length
                    ? sel.history.map((h,i)=>(
                      <div key={i} className="px-3 py-2 text-xs border-b last:border-0" style={{borderColor:'var(--card-border)',color:'var(--text-secondary)'}}>{h}</div>
                    ))
                    : <p className="px-3 py-3 text-xs italic" style={{color:'var(--text-muted)'}}>No history entries.</p>}
                </div>
              </div>
            </div>
            {editing ? (
              <div className="border-t p-4 space-y-3" style={{borderColor:'var(--card-border)'}}>
                <div><label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>Language</label>
                  <select value={eLang} onChange={e=>setELang(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}}>
                    <option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option>
                  </select></div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{background:'var(--accent)'}}><Check className="h-3.5 w-3.5"/>{saving?'Saving…':'Save'}</button>
                  <button onClick={()=>setEditing(false)} className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'#f3f4f6',color:'var(--text-secondary)'}}><X className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            ) : (
              <div className="border-t p-4 flex gap-2" style={{borderColor:'var(--card-border)'}}>
                <button onClick={()=>setEditing(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'var(--accent-light)',color:'var(--accent)'}}><Edit2 className="h-3.5 w-3.5"/> Edit</button>
                <button onClick={()=>handleDelete(sel.patient_id)} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'#fff1f2',color:'var(--rose)'}}><Trash2 className="h-3.5 w-3.5"/> Delete</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
