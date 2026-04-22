'use client';

import React from 'react';
import styles from './AdminHeader.module.css';
import { useAdmin } from '@/app/admin/AdminContext';

export default function AdminHeader() {
  const { activeTab, triggerSave, triggerReset, toggleSidebar } = useAdmin();

  const getFriendlyTitle = () => {
    switch (activeTab) {
      case 'banner': return 'Banner Slider';
      case 'titles': return 'Giới thiệu & Tiêu đề';
      case 'artists': return 'Quản lý Nghệ sĩ';
      case 'countdown': return 'Bộ đếm ngược';
      case 'tickets': return 'Hướng dẫn nhận vé';
      case 'timeline': return 'Lịch trình sự kiện';
      case 'journey': return 'Hành trình trải nghiệm';
      case 'video': return 'Video sự kiện';
      case 'rules': return 'Quy định chung';
      case 'footer': return 'Footer & Tài trợ';
      case 'registrations': return 'Danh sách Đăng ký';
      case 'settings': return 'Cài đặt Website';
      default: return 'Dashboard';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        <button className={styles.menuButton} onClick={toggleSidebar}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="5" y2="5"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="19" y2="19"/></svg>
        </button>
        <h2 className={styles.title}>{getFriendlyTitle()}</h2>
      </div>

      <div className={styles.headerActions}>
        <a href="/" target="_blank" className={styles.previewBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
          Xem trang chủ
        </a>
      </div>
    </header>
  );
}

