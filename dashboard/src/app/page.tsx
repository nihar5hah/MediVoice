'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Users, Stethoscope, Phone, TrendingUp, Clock,
  Mic, Send, CheckCircle2, AlertCircle, Activity, PhoneCall,
} from 'lucide-react';
import { api, type Appointment } from '@/lib/api';
import { formatDate, STATUS_COLORS } from '@/lib/utils';

interface Message { role: 'patient' | 'agent'; text: string; language?: string }

const STATS = [
  { label: 'Total Appointments', icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-50', key: 'total' },
  { label: 'Active Bookings',    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', key: 'booked' },
  { label: 'Total Patients',     icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', key: 'patients' },
  { label: 'Campaigns Run',      icon: Phone, color: 'text-amber-600', bg: 'bg-amber-50', key: 'campaigns' },
];

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [patientId, setPatientId] = useState('');
  const [utterance, setUtterance] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [stats, setStats] = useState({ total: 0, booked: 0, patients: 0, campaigns: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function load() {
    const appts = await api.getAppointments();
    setAppointments(appts);
    try {
      const a = await api.getAnalytics();
      setStats({ total: a.totalAppointments, booked: a.booked, patients: a.totalPatients, campaigns: a.totalCampaigns });
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const active = useMemo(() => appointments.filter(a => a.status === 'booked'), [appointments]);

  async function send() {
    if (!utterance.trim() || !patientId.trim()) return;
    setLoading(true);
    setMessages(m => [...m, { role: 'patient', text: utterance }]);
    try {
      const res = await fetch('/api/voice-turn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID(), patientId, utterance, mode: 'inbound' })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'agent', text: data.reply, language: data.language }]);
      setAppointments(data.appointments || []);
      speak(data.reply, data.language);
    } catch {
      setMessages(m => [...m, { role: 'agent', text: 'Sorry, there was an error processing your request.' }]);
    }
    setLoading(false);
  }

  function listen() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-IN';
    r.onresult = (e: any) => { setUtterance(e.results[0][0].transcript); };
    r.onend = () => setIsListening(false);
    r.start();
    setIsListening(true);
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => (
          <StatCard key={s.key} label={s.label} value={String(stats[s.key as keyof typeof stats] || 0)} icon={s.icon} color={s.color} bg={s.bg} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Voice Agent */}
        <div className="xl:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${loading ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                {loading ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <Activity className="h-4 w-4 text-emerald-600" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Voice Agent — Sarah</h3>
                <p className="text-xs text-slate-500">{loading ? 'Processing...' : 'Ready for inbound call'}</p>
              </div>
            </div>
            <button onClick={listen} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isListening ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}>
              <Mic className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <input
              type="text"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="Patient ID (e.g. +919925016026)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 transition-all"
            />

            <div className="flex gap-2">
              <textarea
                value={utterance}
                onChange={e => setUtterance(e.target.value)}
                placeholder="Enter patient request or use microphone..."
                rows={2}
                className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 transition-all"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button onClick={send} disabled={loading || !patientId} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" /> Send
              </button>
            </div>

            <div className="h-48 overflow-y-auto space-y-3 rounded-lg bg-slate-50 p-3">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                  <PhoneCall className="h-6 w-6" />
                  <p className="text-xs">Start a conversation to interact with the AI agent</p>
                </div>
              ) : messages.map((m, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.role === 'patient' ? 'bg-white border border-slate-200' : 'bg-sky-50 border border-sky-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.role === 'patient' ? 'Patient' : 'Sarah'}</span>
                    {m.language && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{m.language}</span>}
                  </div>
                  <p className="text-slate-700 leading-relaxed">{m.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent Appointments */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Appointments</h3>
              <Link href="/appointments" className="text-xs font-medium text-sky-600 hover:text-sky-700">View All</Link>
            </div>
            <div className="p-4 space-y-2">
              {active.slice(0, 5).map(appt => (
                <div key={appt.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
                    {appt.doctorName.split(' ').pop()?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{appt.doctorName}</p>
                    <p className="text-xs text-slate-500">{appt.specialty} · <Clock className="inline h-3 w-3" /> {formatDate(appt.startIso)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${STATUS_COLORS.booked}`}>Booked</span>
                </div>
              ))}
              {active.length === 0 && (
                <div className="flex flex-col items-center py-6 text-slate-400">
                  <Calendar className="h-6 w-6 mb-2" />
                  <p className="text-xs">No active appointments</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 px-1">Quick Actions</h3>
            {[
              { label: 'View All Appointments', href: '/appointments', icon: Calendar },
              { label: 'Manage Patients', href: '/patients', icon: Users },
              { label: 'Doctor Roster', href: '/doctors', icon: Stethoscope },
              { label: 'Analytics', href: '/analytics', icon: TrendingUp },
            ].map(link => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <link.icon className="h-4 w-4 text-slate-400" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function speak(text: string, language: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN';
  window.speechSynthesis.speak(u);
}
