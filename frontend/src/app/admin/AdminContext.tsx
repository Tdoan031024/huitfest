'use client';

import React, { createContext, useContext, useState } from 'react';

type AdminTab = 'banner' | 'titles' | 'artists' | 'countdown' | 'tickets' | 'timeline' | 'journey' | 'video' | 'rules' | 'footer' | 'registrations' | 'settings' | 'ticket_template' | 'checkin';

interface AdminContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  saveTrigger: number;
  triggerSave: () => void;
  resetTrigger: number;
  triggerReset: () => void;
  unsavedChanges: number;
  setUnsavedChanges: (count: number) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('registrations');
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('checkin') === '1') {
        setActiveTab('checkin');
      }
    }
  }, []);

  const triggerSave = () => setSaveTrigger(prev => prev + 1);
  const triggerReset = () => setResetTrigger(prev => prev + 1);

  return (
    <AdminContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      saveTrigger, 
      triggerSave, 
      resetTrigger, 
      triggerReset,
      unsavedChanges,
      setUnsavedChanges,
      sidebarOpen,
      toggleSidebar,
      closeSidebar
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
