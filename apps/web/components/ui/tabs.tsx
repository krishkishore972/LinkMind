"use client";

import { createContext, type ReactNode, useContext, useEffect, useId, useState } from "react";

type TabsContextValue = { value: string; setValue: (value: string) => void; id: string };
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  const id = useId();
  useEffect(() => {
    const applyHash = () => {
      const hashValue = window.location.hash.slice(1);
      if (hashValue) setValue(hashValue);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  return <TabsContext.Provider value={{ value, setValue, id }}>{children}</TabsContext.Provider>;
}

function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside <Tabs>");
  return context;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div role="tablist" className={className}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const tabs = useTabs();
  const active = tabs.value === value;
  return <button type="button" role="tab" aria-selected={active} aria-controls={`${tabs.id}-${value}`} tabIndex={active ? 0 : -1} className={className} onClick={() => { tabs.setValue(value); window.history.replaceState(null, "", `#${value}`); }}>{children}</button>;
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const tabs = useTabs();
  const active = tabs.value === value;
  return <div id={`${tabs.id}-${value}`} role="tabpanel" hidden={!active} className={className} tabIndex={0}>{children}</div>;
}
