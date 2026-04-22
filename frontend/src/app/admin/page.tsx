'use client';

import React from 'react';
import SectionCard from '@/components/Admin/Common/SectionCard';
import BannerManager from '@/components/Admin/Sections/BannerManager';
import AboutManager from '@/components/Admin/Sections/AboutManager';
import ArtistManager from '@/components/Admin/Sections/ArtistManager';
import CountdownManager from '@/components/Admin/Sections/CountdownManager';
import TicketManager from '@/components/Admin/Sections/TicketManager';
import TimelineManager from '@/components/Admin/Sections/TimelineManager';
import JourneyManager from '@/components/Admin/Sections/JourneyManager';
import VideoManager from '@/components/Admin/Sections/VideoManager';
import RulesManager from '@/components/Admin/Sections/RulesManager';
import FooterManager from '@/components/Admin/Sections/FooterManager';
import RegistrationManager from '@/components/Admin/Sections/RegistrationManager';
import SettingsManager from '@/components/Admin/Sections/SettingsManager';
import TicketTemplateManager from '@/components/Admin/Sections/TicketTemplateManager';
import CheckinManager from '@/components/Admin/Sections/CheckinManager';
import { useAdmin } from './AdminContext';
import commonStyles from '@/components/Admin/Common/SectionCard.module.css';

export default function AdminPage() {
  const { activeTab, triggerSave, triggerReset, unsavedChanges } = useAdmin();

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'banner': return 'Section 1: Banner Slider';
      case 'titles': return 'Section 2: Giới thiệu (Giới thiệu sự kiện)';
      case 'artists': return 'Section 3: Nghệ sĩ';
      case 'countdown': return 'Section 4: Đếm ngược';
      case 'tickets': return 'Section 5: Cách nhận vé';
      case 'timeline': return 'Section 6: Timeline';
      case 'journey': return 'Section 7: Hành trình';
      case 'video': return 'Section 8: Video sự kiện';
      case 'rules': return 'Section 9: Quy định chung';
      case 'footer': return 'Section 10: Footer & Sponsors';
      case 'registrations': return 'Danh sách Sinh viên đăng ký tham gia';
      case 'settings': return 'Cài đặt hệ thống Website';
      case 'ticket_template': return 'Mẫu Vé Email HUIT Fest';
      case 'checkin': return 'Quét mã Check-in và Xác thực Vé';
      default: return 'Management Section';
    }
  };

  const renderingContent = () => {
    switch (activeTab) {
      case 'banner': return <BannerManager />;
      case 'titles': return <AboutManager />;
      case 'artists': return <ArtistManager />;
      case 'countdown': return <CountdownManager />;
      case 'tickets': return <TicketManager />;
      case 'timeline': return <TimelineManager />;
      case 'journey': return <JourneyManager />;
      case 'video': return <VideoManager />;
      case 'rules': return <RulesManager />;
      case 'footer': return <FooterManager />;
      case 'registrations': return <RegistrationManager />;
      case 'settings': return <SettingsManager />;
      case 'ticket_template': return <TicketTemplateManager />;
      case 'checkin': return <CheckinManager />;
      default: return <div style={{ color: 'rgba(216, 180, 254, 0.5)', padding: '2rem', textAlign: 'center' }}>Tính năng đang được phát triển...</div>;
    }
  };

  return (
    <div>
      <SectionCard 
        title={getSectionTitle()}
        actions={
          <>
            {unsavedChanges > 0 && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#c084fc', 
                alignSelf: 'center',
                marginRight: '0.25rem',
                fontWeight: '500'
              }}>
                * {unsavedChanges} thay đổi chưa lưu
              </span>
            )}
            <button className={commonStyles.cardBtn} onClick={triggerReset}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Khôi phục
            </button>
            <button className={`${commonStyles.cardBtn} ${commonStyles.saveBtn}`} onClick={triggerSave}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
              Lưu thay đổi
            </button>
          </>
        }
      >
        {renderingContent()}
      </SectionCard>
    </div>
  );
}
