"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface AdminSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  closeMobile: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
  close: () => {},
  closeMobile: () => {},
});

export function AdminSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);
  const closeMobile = useCallback(() => {
    if (typeof window.matchMedia === "function" &&
        !window.matchMedia("(min-width: 768px)").matches) {
      setOpen(false);
    }
  }, []);

  // Default to open on desktop
  useEffect(() => {
    if (typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 768px)").matches) {
      setOpen(true);
    }
  }, []);
  return (
    <AdminSidebarContext.Provider value={{ open, setOpen, toggle, close, closeMobile }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  return useContext(AdminSidebarContext);
}
