'use client';

import React from 'react';
import { useAdmin } from '@/app/admin/AdminContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { adminLogout, getBaseUrl } from '@/lib/api';
import styles from './AdminSidebar.module.css';

const TICKET_GROUP = [
  { id: 'registrations', label: 'Danh sách đăng ký', icon: 'users' },
  { id: 'ticket_template', label: 'Mẫu vé sự kiện', icon: 'mail' },
  { id: 'checkin', label: 'Quét mã Check-in', icon: 'check-square' },
] as const;

const UI_GROUP = [
  { id: 'banner', label: 'Banner Slider', icon: 'image' },
  { id: 'titles', label: 'Tiêu đề & Mô tả', icon: 'type' },
  { id: 'artists', label: 'Nghệ sĩ', icon: 'music' },
  { id: 'countdown', label: 'Đếm ngược', icon: 'clock' },
  { id: 'tickets', label: 'Cách nhận vé', icon: 'ticket' },
  { id: 'timeline', label: 'Timeline', icon: 'list' },
  { id: 'journey', label: 'Hành trình', icon: 'map' },
  { id: 'video', label: 'Video sự kiện', icon: 'video' },
  { id: 'rules', label: 'Quy định chung', icon: 'file-text' },
  { id: 'footer', label: 'Footer & Sponsors', icon: 'building' },
  { id: 'settings', label: 'Cài đặt hệ thống', icon: 'settings' },
] as const;

export default function AdminSidebar() {
  const { activeTab, setActiveTab, sidebarOpen, closeSidebar } = useAdmin();
  const { config } = useSiteConfig();
  
  const [ticketOpen, setTicketOpen] = React.useState(true);
  const [uiOpen, setUiOpen] = React.useState(true);

  const handleLogout = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      const success = await adminLogout();
      if (success) {
        window.location.href = '/admin/login';
      }
    }
  };

  const handleNavClick = (id: string) => {
    setActiveTab(id as any);
    closeSidebar(); // Đóng sidebar trên mobile sau khi chọn
  };

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar} />
      )}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarInner}>
          <div className={styles.logoContainer}>
            <img 
              src={config.siteLogo || '/assets/images/logo/logohuit.webp'} 
              alt={config.siteName} 
              className={styles.logoImg}
            />
            <div className={styles.logoText}>
              <h3>{config.siteName}</h3>
              <span>Admin Control Panel</span>
            </div>
          </div>
        </div>

      <nav className={styles.nav}>
        {/* Nhóm 1: Quản lý Vé */}
        <div className={styles.groupWrapper}>
          <button 
            className={styles.groupHeader} 
            onClick={() => setTicketOpen(!ticketOpen)}
          >
            <span>QUẢN LÝ VÉ</span>
            <svg className={`${styles.chevron} ${ticketOpen ? styles.chevronOpen : ''}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          <div className={`${styles.groupContent} ${!ticketOpen ? styles.collapsed : ''}`}>
            {TICKET_GROUP.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <SidebarIcon type={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nhóm 2: Quản lý giao diện */}
        <div className={styles.groupWrapper} style={{ marginTop: '0.5rem' }}>
          <button 
            className={styles.groupHeader} 
            onClick={() => setUiOpen(!uiOpen)}
          >
            <span>QUẢN LÝ GIAO DIỆN WEB</span>
            <svg className={`${styles.chevron} ${uiOpen ? styles.chevronOpen : ''}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          
          <div className={`${styles.groupContent} ${!uiOpen ? styles.collapsed : ''}`}>
            {UI_GROUP.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <SidebarIcon type={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>A</div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>Admin</p>
            <p className={styles.userRole}>HUIT MEDIA</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Đăng xuất">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
    </>
  );
}

function SidebarIcon({ type }: { type: string }) {
  switch (type) {
    case 'image': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
    case 'type': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
    case 'music': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'clock': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'ticket': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>;
    case 'list': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case 'map': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" x2="6" y1="21" y2="18"/></svg>;
    case 'v': 
    case 'video': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>;
    case 'file-text': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
    case 'building': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>;
    case 'users': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'settings': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'mail': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
    case 'check-square': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    default: return null;
  }
}

