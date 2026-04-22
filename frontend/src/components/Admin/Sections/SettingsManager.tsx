'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import commonStyles from '@/components/Admin/Common/SectionCard.module.css';
import styles from './BannerManager.module.css';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';
import { uploadImage } from '@/lib/api';

export default function SettingsManager() {
  const { config, updateConfig } = useSiteConfig();
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [localSettings, setLocalSettings] = useState({
    siteName: config.siteName,
    siteLogo: config.siteLogo,
    siteBanner: config.siteBanner,
    siteDescription: config.siteDescription,
    faviconUrl: '/favicon.ico',
    smtpHost: config.smtpHost || '',
    smtpPort: config.smtpPort || 587,
    smtpUser: config.smtpUser || '',
    smtpPass: config.smtpPass || '',
    smtpFrom: config.smtpFrom || '',
    ticketLogoUrl: config.ticketLogoUrl || '',
    ticketBannerUrl: config.ticketBannerUrl || '',
    ticketPortalUrl: config.ticketPortalUrl || ''
  });

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const ticketLogoInputRef = useRef<HTMLInputElement>(null);
  const ticketBannerInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingTicketLogo, setIsUploadingTicketLogo] = useState(false);
  const [isUploadingTicketBanner, setIsUploadingTicketBanner] = useState(false);

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  // Đồng bộ localSettings khi config từ Context thay đổi
  useEffect(() => {
    setLocalSettings({
      siteName: config.siteName,
      siteLogo: config.siteLogo,
      siteBanner: config.siteBanner,
      siteDescription: config.siteDescription,
      faviconUrl: '/favicon.ico',
      smtpHost: config.smtpHost || '',
      smtpPort: config.smtpPort || 587,
      smtpUser: config.smtpUser || '',
      smtpPass: config.smtpPass || '',
      smtpFrom: config.smtpFrom || '',
      ticketLogoUrl: config.ticketLogoUrl || '',
      ticketBannerUrl: config.ticketBannerUrl || '',
      ticketPortalUrl: config.ticketPortalUrl || ''
    });
  }, [config]);

  // Listen to global save trigger
  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  // Listen to global reset trigger
  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      handleReset();
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);


  const handleReset = () => {
    setLocalSettings({
      siteName: config.siteName,
      siteLogo: config.siteLogo,
      siteBanner: config.siteBanner,
      siteDescription: config.siteDescription,
      faviconUrl: '/favicon.ico',
      smtpHost: config.smtpHost || '',
      smtpPort: config.smtpPort || 587,
      smtpUser: config.smtpUser || '',
      smtpPass: config.smtpPass || '',
      smtpFrom: config.smtpFrom || '',
      ticketLogoUrl: config.ticketLogoUrl || '',
      ticketBannerUrl: config.ticketBannerUrl || '',
      ticketPortalUrl: config.ticketPortalUrl || ''
    });
  };

  const handleChange = (field: string, value: any) => {
    setLocalSettings({ ...localSettings, [field]: value });
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const { updateSiteSettings } = await import('@/lib/api');
      
      const payload = {
        siteName: localSettings.siteName,
        siteLogo: localSettings.siteLogo,
        siteBanner: localSettings.siteBanner,
        siteDescription: localSettings.siteDescription,
        smtpHost: localSettings.smtpHost,
        smtpPort: Number(localSettings.smtpPort),
        smtpUser: localSettings.smtpUser,
        smtpPass: localSettings.smtpPass,
        smtpFrom: localSettings.smtpFrom,
        ticketLogoUrl: localSettings.ticketLogoUrl,
        ticketBannerUrl: localSettings.ticketBannerUrl,
        ticketPortalUrl: localSettings.ticketPortalUrl
      };

      const success = await updateSiteSettings(payload);

      if (success) {
        updateConfig(payload);
        addToast('Đã lưu cấu hình website thành công!', 'success');
      } else {
        addToast('Lỗi khi lưu cấu hình vào server', 'error');
      }
    } catch (e) {
      addToast('Lỗi kết nối server', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'assets/images/logo');
      handleChange('siteLogo', result.url);
      addToast('Tải lên logo thành công!', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Lỗi khi tải lên logo', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const result = await uploadImage(file, 'assets/images/banner');
      handleChange('siteBanner', result.url);
      addToast('Tải lên ảnh bìa thành công!', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Lỗi khi tải lên ảnh bìa', 'error');
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleUploadTicketLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTicketLogo(true);
    try {
      const result = await uploadImage(file, 'assets/images/logo');
      handleChange('ticketLogoUrl', result.url);
      addToast('Tải lên logo vé thành công!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Lỗi khi tải lên logo vé', 'error');
    } finally {
      setIsUploadingTicketLogo(false);
      if (ticketLogoInputRef.current) ticketLogoInputRef.current.value = '';
    }
  };

  const handleUploadTicketBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTicketBanner(true);
    try {
      const result = await uploadImage(file, 'assets/images/banner');
      handleChange('ticketBannerUrl', result.url);
      addToast('Tải lên banner vé thành công!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Lỗi khi tải lên banner vé', 'error');
    } finally {
      setIsUploadingTicketBanner(false);
      if (ticketBannerInputRef.current) ticketBannerInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <input 
        type="file" 
        ref={fileInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleUploadLogo} 
      />
      <input 
        type="file" 
        ref={bannerInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleUploadBanner} 
      />
      <input 
        type="file" 
        ref={ticketLogoInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleUploadTicketLogo} 
      />
      <input 
        type="file" 
        ref={ticketBannerInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleUploadTicketBanner} 
      />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ width: '4px', height: '1.5rem', background: '#8d4aff', borderRadius: '2px' }}></div>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Cấu hình SEO & Thương hiệu</h3>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Tên Website (Site Title)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.siteName}
            onChange={(e) => handleChange('siteName', e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: 'rgba(216, 180, 254, 0.5)', marginTop: '0.25rem' }}>
            Xuất hiện trên tab trình duyệt và thanh Sidebar Admin.
          </p>
        </div>

        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Mô tả Website (SEO Description)</label>
          <textarea 
            className={styles.input}
            style={{ minHeight: '80px', paddingTop: '0.75rem', resize: 'vertical' }}
            value={localSettings.siteDescription}
            onChange={(e) => handleChange('siteDescription', e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: 'rgba(216, 180, 254, 0.5)', marginTop: '0.25rem' }}>
            Mô tả ngắn gọn về website hỗ trợ SEO và tìm kiếm.
          </p>
        </div>

        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>URL Logo Chính</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.inputIcon}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.siteLogo || ''}
                onChange={(e) => handleChange('siteLogo', e.target.value)}
                placeholder="Dán URL ảnh hoặc chọn file tải lên..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploading ? styles.uploading : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span className={styles.spinner}></span>
                  Tải lên...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  Upload
                </>
              )}
            </button>
          </div>
        </div>

        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Ảnh Bìa Đại Diện (Shared Image - Facebook/Zalo)</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.inputIcon}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.siteBanner || ''}
                onChange={(e) => handleChange('siteBanner', e.target.value)}
                placeholder="URL ảnh bìa cho Link Preview (1200x630)..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploadingBanner ? styles.uploading : ''}`}
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? (
                <><span className={styles.spinner}></span> Tải lên...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> Upload</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SMTP Configuration Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0 1rem' }}>
        <div style={{ width: '4px', height: '1.5rem', background: '#3b82f6', borderRadius: '2px' }}></div>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Cấu hình Email & Vé điện tử</h3>
      </div>

      <div className={styles.formGrid} style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Đường dẫn Website công khai (Ticket Portal URL)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketPortalUrl}
            onChange={(e) => handleChange('ticketPortalUrl', e.target.value)}
            placeholder="Ví dụ: https://paqql-14-226-167-209.run.pinggy-free.link"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Logo hiển thị trên Vé</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.ticketLogoUrl}
                onChange={(e) => handleChange('ticketLogoUrl', e.target.value)}
                placeholder="URL Logo vé..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploadingTicketLogo ? styles.uploading : ''}`}
              onClick={() => ticketLogoInputRef.current?.click()}
            >
              Upload
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Banner hiển thị trên Vé</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.ticketBannerUrl}
                onChange={(e) => handleChange('ticketBannerUrl', e.target.value)}
                placeholder="URL Banner vé..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploadingTicketBanner ? styles.uploading : ''}`}
              onClick={() => ticketBannerInputRef.current?.click()}
            >
              Upload
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>SMTP Host</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.smtpHost}
            onChange={(e) => handleChange('smtpHost', e.target.value)}
            placeholder="Ví dụ: smtp.gmail.com"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>SMTP Port</label>
          <input 
            type="number" 
            className={styles.input}
            value={localSettings.smtpPort}
            onChange={(e) => handleChange('smtpPort', e.target.value)}
            placeholder="Ví dụ: 587 hoặc 465"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Tài khoản (SMTP User)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.smtpUser}
            onChange={(e) => handleChange('smtpUser', e.target.value)}
            placeholder="Email gửi tin"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Mật khẩu (SMTP Password)</label>
          <input 
            type="password" 
            className={styles.input}
            value={localSettings.smtpPass}
            onChange={(e) => handleChange('smtpPass', e.target.value)}
            placeholder="Mật khẩu ứng dụng"
          />
        </div>
        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Địa chỉ người gửi (SMTP From)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.smtpFrom}
            onChange={(e) => handleChange('smtpFrom', e.target.value)}
            placeholder="HUIT Fest <no-reply@huitfest.vn>"
          />
        </div>
      </div>

      {/* Previews */}
      <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div>
          <h4 className={styles.label} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Xem trước Logo</h4>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '2rem', 
            borderRadius: '1rem', 
            display: 'flex', 
            justifyContent: 'center',
            border: '1px dashed rgba(141, 74, 255, 0.3)',
            height: '140px',
            alignItems: 'center'
          }}>
            {localSettings.siteLogo ? (
              <img 
                src={localSettings.siteLogo} 
                alt="Logo Preview" 
                style={{ height: '60px', objectFit: 'contain' }}
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+Logo')}
              />
            ) : (
              <div style={{ color: 'rgba(216, 180, 254, 0.3)', fontSize: '0.875rem' }}>Chưa có logo</div>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h4 className={styles.label} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Xem trước Ảnh bìa (Link Preview)</h4>
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '0.75rem', 
            overflow: 'hidden',
            border: '1px solid rgba(141, 74, 255, 0.2)',
            maxWidth: '500px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ height: '180px', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {localSettings.siteBanner ? (
                <img 
                  src={localSettings.siteBanner} 
                  alt="Banner Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/1200x630?text=Invalid+Banner')}
                />
              ) : (
                <div style={{ color: '#888', fontSize: '0.875rem' }}>Chưa có ảnh bìa</div>
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem', background: '#f0f2f5', borderTop: '1px solid #ddd' }}>
              <div style={{ color: '#65676b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost').hostname}
              </div>
              <div style={{ color: '#050505', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {localSettings.siteName || 'Tên website chưa thiết lập'}
              </div>
              <div style={{ color: '#65676b', fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>
                {localSettings.siteDescription || 'Mô tả website sẽ xuất hiện tại đây khi bạn chia sẻ link lên mạng xã hội...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
