'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';
import { SidebarProvider, useSidebar } from './sidebar-context';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className="sidebar-transition flex flex-1 flex-col min-w-0"
        style={{ marginLeft: isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
      >
        <Header />
        <main className="flex-1 p-6" style={{ background: 'var(--content-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
