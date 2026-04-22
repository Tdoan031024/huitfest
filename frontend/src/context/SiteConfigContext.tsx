'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SiteConfig {
  siteName: string;
  siteLogo: string;
  siteBanner: string;
  siteDescription: string;
  primaryColor: string;
  heroBanner: string;
  registrationOpen: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  ticketLogoUrl?: string;
  ticketBannerUrl?: string;
  ticketPortalUrl?: string;
}

interface SiteConfigContextType {
  config: SiteConfig;
  updateConfig: (newConfig: Partial<SiteConfig>) => void;
  refreshConfig: () => Promise<void>;
}

const DEFAULT_CONFIG: SiteConfig = {
  siteName: 'HUIT Media',
  siteLogo: '/assets/images/logo/logohuit_avt.jpg?v=2',
  siteBanner: '/assets/images/banner/banner.png',
  siteDescription: 'HUIT Fest 2026 là sự kiện âm nhạc bùng nổ dành cho sinh viên HUIT.',
  primaryColor: '#8d4aff',
  heroBanner: '/assets/images/banner/banner.png',
  registrationOpen: true,
};

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);

  const loadFromAPI = async () => {
    try {
      const { getSiteSettings, getCurrentEvent } = await import('@/lib/api');
      
      // Fetch both settings and event in parallel
      const [settings, event] = await Promise.all([
        getSiteSettings(),
        getCurrentEvent()
      ]);

      const newConfig = { ...DEFAULT_CONFIG } as SiteConfig;

      if (settings) {
        newConfig.siteName = settings.siteName || newConfig.siteName;
        newConfig.siteLogo = settings.siteLogo || newConfig.siteLogo;
        newConfig.siteBanner = settings.siteBanner || newConfig.siteBanner;
        newConfig.siteDescription = settings.siteDescription || newConfig.siteDescription;
        
        // SMTP & Ticket fields
        newConfig.smtpHost = settings.smtpHost || '';
        newConfig.smtpPort = settings.smtpPort || 587;
        newConfig.smtpUser = settings.smtpUser || '';
        newConfig.smtpPass = settings.smtpPass || '';
        newConfig.smtpFrom = settings.smtpFrom || '';
        newConfig.ticketLogoUrl = settings.ticketLogoUrl || '';
        newConfig.ticketBannerUrl = settings.ticketBannerUrl || '';
        newConfig.ticketPortalUrl = settings.ticketPortalUrl || '';
      }

      if (event) {
        // Only use event title/image if site settings are not set
        if (!settings?.siteName) newConfig.siteName = event.name || newConfig.siteName;
        if (!settings?.siteLogo) newConfig.siteLogo = event.heroImage || newConfig.siteLogo;
        
        newConfig.registrationOpen = !!event.registrationOpen;
      }

      setConfig(newConfig);
      document.title = newConfig.siteName;
    } catch (e) {
      console.error('Failed to load config from API', e);
    }
  };

  // Load config từ API và localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('site_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        document.title = parsed.siteName;
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    }
    
    loadFromAPI();
  }, []);

  const updateConfig = (newConfig: Partial<SiteConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('site_config', JSON.stringify(updated));
    
    if (newConfig.siteName) {
      document.title = newConfig.siteName;
    }
  };

  const refreshConfig = async () => {
    await loadFromAPI();
  };

  return (
    <SiteConfigContext.Provider value={{ config, updateConfig, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
}
