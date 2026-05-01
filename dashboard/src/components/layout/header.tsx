'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search, RefreshCw } from 'lucide-react';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':             { title: 'Dashboard',    subtitle: 'Overview & voice agent' },
  '/appointments': { title: 'Appointments', subtitle: 'All scheduled appointments' },
  '/doctors':      { title: 'Doctors',      subtitle: 'Clinical staff roster' },
  '/patients':     { title: 'Patients',     subtitle: 'Patient records' },
  '/analytics':    { title: 'Analytics',    subtitle: 'Insights & performance' },
  '/campaigns':    { title: 'Campaigns',    subtitle: 'Outbound call campaigns' },
  '/settings':     { title: 'Settings',     subtitle: 'System configuration' },
};

export function Header({ onRefresh }: { onRefresh?: () => void }) {
  const pathname = usePathname();
  const info = TITLES[pathname] ?? { title: 'MediVoice', subtitle: '' };

  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b bg-white/90 px-6 backdrop-blur-md"
      style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{info.title}</h1>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{info.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {onRefresh && (
          <button onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
            aria-label="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
          aria-label="Notifications">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        </button>
        <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>A</div>
      </div>
    </header>
  );
}
