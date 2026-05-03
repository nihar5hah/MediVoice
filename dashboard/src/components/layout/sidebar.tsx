'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Stethoscope, Users, BarChart3,
  Megaphone, Settings, Activity, ChevronLeft, ChevronRight, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';

const nav = [
  { label: 'Dashboard',    icon: LayoutDashboard, href: '/' },
  { label: 'Appointments', icon: Calendar,         href: '/appointments' },
  { label: 'Doctors',      icon: Stethoscope,      href: '/doctors' },
  { label: 'Patients',     icon: Users,            href: '/patients' },
  { label: 'Analytics',    icon: BarChart3,        href: '/analytics' },
  { label: 'Campaigns',    icon: Megaphone,        href: '/campaigns' },
  { label: 'Traces',       icon: Cpu,              href: '/traces' },
  { label: 'Settings',     icon: Settings,         href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();

  return (
    <aside
      className="sidebar-transition fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden"
      style={{
        width: isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
        background: 'var(--sidebar-bg)'
      }}
    >
      {/* Dot-grid texture */}
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

      {/* Brand */}
      <div className="relative flex items-center gap-3 border-b px-4 py-[18px] overflow-hidden"
        style={{ borderColor: 'var(--sidebar-border)', minHeight: 64 }}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}>
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm tracking-tight">MediVoice</p>
            <p className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: 'var(--sidebar-text)' }}>Clinical AI</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--sidebar-text)' }}>Menu</p>
        )}
        {nav.map(({ label, icon: Icon, href }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <div key={href} className="relative group">
              <Link href={href}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-150',
                  isCollapsed ? 'justify-center px-0' : 'px-3',
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={{
                  background: active ? 'rgba(79,70,229,0.18)' : undefined,
                  color: active ? '#fff' : 'var(--sidebar-text)'
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full" style={{ background: 'var(--sidebar-accent)' }} />}
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--sidebar-accent)' : 'inherit' }} />
                {!isCollapsed && <span className="truncate">{label}</span>}
                {!isCollapsed && active && <ChevronRight className="ml-auto h-3 w-3 opacity-40" style={{ color: 'var(--sidebar-accent)' }} />}
              </Link>
              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap"
                    style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.1)' }}>{label}</div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: AI status + collapse toggle */}
      <div className="relative border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* AI agent status */}
        <div className={cn('flex items-center gap-3 px-4 py-3', isCollapsed && 'justify-center')}>
          <div className="relative shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'rgba(79,70,229,0.25)' }}>AI</div>
            <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 bg-emerald-400" style={{ borderColor: 'var(--sidebar-bg)' }} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">Sarah</p>
              <p className="text-[10px]" style={{ color: 'var(--sidebar-text)' }}>Voice AI · Online</p>
            </div>
          )}
        </div>
        {/* Collapse button */}
        <button
          onClick={toggle}
          className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-xs font-medium transition-colors"
          style={{ borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-text)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--sidebar-text)')}
        >
          {isCollapsed
            ? <ChevronRight className="mx-auto h-3.5 w-3.5" />
            : <><ChevronLeft className="h-3.5 w-3.5" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
