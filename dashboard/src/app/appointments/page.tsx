'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, ChevronUp, ChevronDown, Trash2, Edit2, X, Check, ChevronsUpDown, User, Stethoscope, Clock } from 'lucide-react';
import { api, type Appointment } from '@/lib/api';
import { cn } from '@/lib/utils';

const SC: Record<string, string> = {
  booked:    'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};
type SK = 'patientId'|'doctorName'|'specialty'|'startIso'|'status';

export default function AppointmentsPage() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('all');
  const [sk, setSk] = useState<SK>('startIso');
  const [sd, setSd] = useState<'asc'|'desc'>('desc');
  const [sel, setSel] = useState<Appointment|null>(null);
  const [editing, setEditing] = useState(false);
  const [eStatus, setEStatus] = useState('');
  const [eDate, setEDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = () => { setLoading(true); api.getAppointments().then(setAppts).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const counts = useMemo(() => ({ all: appts.length, booked: appts.filter(a=>a.status==='booked').length, completed: appts.filter(a=>a.status==='completed').length, cancelled: appts.filter(a=>a.status==='cancelled').length }), [appts]);

  const filtered = useMemo(() => appts
    .filter(a => { const q=search.toLowerCase(); return (!q||a.patientId.toLowerCase().includes(q)||a.doctorName.toLowerCase().includes(q)||a.specialty.toLowerCase().includes(q))&&(sf==='all'||a.status===sf); })
    .sort((a,b) => { const v=(x:Appointment)=>sk==='patientId'?x.patientId:sk==='doctorName'?x.doctorName:sk==='specialty'?x.specialty:sk==='startIso'?x.startIso:x.status; return sd==='asc'?v(a).localeCompare(v(b)):v(b).localeCompare(v(a)); })
  , [appts,search,sf,sk,sd]);

  const toggleSort = (k:SK) => { if(sk===k) setSd(d=>d==='asc'?'desc':'asc'); else { setSk(k); setSd('asc'); } };
  const openDetail = (a:Appointment) => { setSel(a); setEditing(false); setEStatus(a.status); setEDate(a.startIso.slice(0,16)); };
  const handleSave = async () => { if(!sel) return; setSaving(true); try { await api.updateAppointment(sel.id,{status:eStatus as Appointment['status'],startIso:new Date(eDate).toISOString()}); load(); setSel(s=>s?{...s,status:eStatus as Appointment['status'],startIso:new Date(eDate).toISOString()}:null); setEditing(false); } finally { setSaving(false); } };
  const handleDelete = async (id:string) => { setDeleting(id); try { await api.deleteAppointment(id); load(); setSel(null); } finally { setDeleting(null); } };

  const SI = ({k}:{k:SK}) => sk!==k?<ChevronsUpDown className="h-3 w-3 opacity-30"/>:sd==='asc'?<ChevronUp className="h-3 w-3" style={{color:'var(--accent)'}}/>:<ChevronDown className="h-3 w-3" style={{color:'var(--accent)'}}/>;
  const TH = ({label,k}:{label:string;k:SK}) => <th className="px-4 py-3 text-left"><button className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider hover:opacity-70" style={{color:'var(--text-secondary)'}} onClick={()=>toggleSort(k)}>{label}<SI k={k}/></button></th>;

  return (
    <div className="flex gap-5 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all','booked','completed','cancelled'] as const).map(s => (
              <button key={s} onClick={() => setSf(s)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: sf===s?'var(--accent)':'#f0f0f4', color: sf===s?'#fff':'var(--text-secondary)' }}>
                {s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: sf===s?'rgba(255,255,255,0.22)':'#e5e7eb', color: sf===s?'#fff':'var(--text-secondary)' }}>{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, doctor..." className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none" style={{ borderColor:'var(--card-border)', background:'#fff', color:'var(--text-primary)' }} onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--card-border)')} />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor:'var(--card-border)', background:'var(--card-bg)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom:'1px solid var(--card-border)', background:'#fafafa' }}>
                <tr><TH label="Patient" k="patientId"/><TH label="Doctor" k="doctorName"/><TH label="Specialty" k="specialty"/><TH label="Date & Time" k="startIso"/><TH label="Status" k="status"/><th className="px-4 py-3"/></tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>Loading…</td></tr>
                  : filtered.length===0
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{color:'var(--text-muted)'}}>No appointments found</td></tr>
                  : filtered.map(a => (
                    <tr key={a.id} onClick={()=>openDetail(a)} className="cursor-pointer border-b transition-colors last:border-0"
                      style={{ borderColor:'var(--card-border)', background: sel?.id===a.id?'var(--accent-light)':undefined }}
                      onMouseEnter={e=>{ if(sel?.id!==a.id) e.currentTarget.style.background='#f8f9ff'; }}
                      onMouseLeave={e=>{ if(sel?.id!==a.id) e.currentTarget.style.background=''; }}>
                      <td className="px-4 py-3"><span className="font-mono text-xs" style={{color:'var(--text-primary)'}}>{a.patientId}</span></td>
                      <td className="px-4 py-3 font-medium text-sm" style={{color:'var(--text-primary)'}}>{a.doctorName}</td>
                      <td className="px-4 py-3 text-xs capitalize" style={{color:'var(--text-secondary)'}}>{a.specialty}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{color:'var(--text-secondary)'}}>{new Date(a.startIso).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',SC[a.status])}>{a.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={e=>{e.stopPropagation();handleDelete(a.id);}} className="rounded-md p-1.5 transition-colors" style={{color:'var(--text-muted)'}} onMouseEnter={e=>{e.currentTarget.style.color='var(--rose)';e.currentTarget.style.background='#fff1f2';}} onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='';}}>
                          {deleting===a.id?<Clock className="h-3.5 w-3.5 animate-spin"/>:<Trash2 className="h-3.5 w-3.5"/>}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-[11px]" style={{borderTop:'1px solid var(--card-border)',background:'#fafafa',color:'var(--text-muted)'}}>Showing {filtered.length} of {appts.length} appointments</div>
        </div>
      </div>

      {sel && (
        <div className="detail-panel w-80 shrink-0">
          <div className="rounded-xl border overflow-hidden" style={{borderColor:'var(--card-border)',background:'var(--card-bg)'}}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor:'var(--card-border)'}}>
              <p className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>Appointment Details</p>
              <button onClick={()=>setSel(null)} className="rounded-md p-1" onMouseEnter={e=>(e.currentTarget.style.background='#f3f4f6')} onMouseLeave={e=>(e.currentTarget.style.background='')}><X className="h-4 w-4" style={{color:'var(--text-muted)'}}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#4f46e5,#818cf8)'}}>{sel.doctorName.split(' ').pop()?.[0]}</div>
                <div><p className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{sel.doctorName}</p><p className="text-xs capitalize" style={{color:'var(--text-secondary)'}}>{sel.specialty}</p></div>
              </div>
              {([{icon:User,label:'Patient ID',value:sel.patientId,mono:true},{icon:Calendar,label:'Date & Time',value:new Date(sel.startIso).toLocaleString('en-IN',{dateStyle:'full',timeStyle:'short'}),mono:false},{icon:Stethoscope,label:'Appt ID',value:sel.id,mono:true}] as const).map(({icon:Icon,label,value,mono})=>(
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{color:'var(--text-muted)'}}/>
                  <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{color:'var(--text-muted)'}}>{label}</p><p className={cn('text-xs break-all',mono&&'font-mono')} style={{color:'var(--text-primary)'}}>{value}</p></div>
                </div>
              ))}
              <div className="flex items-center gap-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{color:'var(--text-muted)'}}/>
                <div><p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{color:'var(--text-muted)'}}>Status</p><span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',SC[sel.status])}>{sel.status}</span></div>
              </div>
            </div>
            {editing ? (
              <div className="border-t p-4 space-y-3" style={{borderColor:'var(--card-border)'}}>
                <div><label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>Status</label>
                  <select value={eStatus} onChange={e=>setEStatus(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}}>
                    <option value="booked">Booked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select></div>
                <div><label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{color:'var(--text-muted)'}}>Date & Time</label>
                  <input type="datetime-local" value={eDate} onChange={e=>setEDate(e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{borderColor:'var(--card-border)',color:'var(--text-primary)'}}/></div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{background:'var(--accent)'}}><Check className="h-3.5 w-3.5"/>{saving?'Saving…':'Save'}</button>
                  <button onClick={()=>setEditing(false)} className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'#f3f4f6',color:'var(--text-secondary)'}}><X className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            ) : (
              <div className="border-t p-4 flex gap-2" style={{borderColor:'var(--card-border)'}}>
                <button onClick={()=>setEditing(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'var(--accent-light)',color:'var(--accent)'}}><Edit2 className="h-3.5 w-3.5"/> Edit</button>
                <button onClick={()=>handleDelete(sel.id)} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{background:'#fff1f2',color:'var(--rose)'}}><Trash2 className="h-3.5 w-3.5"/> Delete</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
