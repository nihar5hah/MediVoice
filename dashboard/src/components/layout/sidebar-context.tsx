'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SidebarCtx { isCollapsed: boolean; toggle: () => void; }
const SidebarContext = createContext<SidebarCtx>({ isCollapsed: false, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const v = localStorage.getItem('sidebar-collapsed');
    if (v) setIsCollapsed(v === 'true');
  }, []);
  const toggle = () => setIsCollapsed(p => {
    const next = !p;
    localStorage.setItem('sidebar-collapsed', String(next));
    return next;
  });
  return <SidebarContext.Provider value={{ isCollapsed, toggle }}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);
