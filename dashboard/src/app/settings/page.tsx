'use client';

import { useState } from 'react';
import { Settings, Bell, Shield, Plug, Save, Check, AlertTriangle, Phone, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToggleProps { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }
function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
          checked ? 'bg-sky-600' : 'bg-slate-200'
        )}
      >
        <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', checked ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [smsReminders, setSmsReminders] = useState(true);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* General */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-900">General Settings</h3>
        </div>
        <Toggle label="Enable Notifications" description="Receive push and email alerts for new appointments." checked={notifications} onChange={setNotifications} />
        <Toggle label="Auto-confirm Appointments" description="Automatically confirm bookings without manual review." checked={autoConfirm} onChange={setAutoConfirm} />
        <Toggle label="SMS Reminders" description="Send automated SMS reminders 24h before appointments." checked={smsReminders} onChange={setSmsReminders} />
      </div>

      {/* Integrations */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Plug className="h-5 w-5 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-900">Integrations</h3>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
              <Phone className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Vapi Voice AI</p>
              <p className="text-xs text-slate-500">Connected · Phone: +18728709028</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">Active</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100">
              <Globe className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Supabase Backend</p>
              <p className="text-xs text-slate-500">Connected · Postgres DB</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">Active</span>
        </div>
      </div>

      {/* Danger */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Reset All Data</p>
            <p className="text-xs text-slate-500 mt-0.5">This will clear all appointments and patient records.</p>
          </div>
          <button className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">Reset</button>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 transition-colors">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
