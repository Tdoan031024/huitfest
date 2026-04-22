'use client';

import React, { useState, useEffect, useRef } from 'react';
import commonStyles from '@/components/Admin/Common/SectionCard.module.css';
import styles from './BannerManager.module.css';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';
import { uploadImage, getBaseUrl, authFetch } from '@/lib/api';

export default function TicketTemplateManager() {
  const { saveTrigger, resetTrigger, setUnsavedChanges } = useAdmin();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [localSettings, setLocalSettings] = useState({
    ticketEventName: '',
    ticketEventDateTime: '',
    ticketEventLocation: '',
    ticketInfo: '',
    ticketLogoUrl: '',
    ticketBannerUrl: '',
    ticketSupportEmail: '',
    ticketSupportPhone: '',
    ticketInfoUrl: '',
    ticketPortalUrl: '',
    ticketEmailNote: ''
  });
  
  const [originalSettings, setOriginalSettings] = useState(localSettings);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'email' | 'pdf'>('email');

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/settings`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const loaded = {
            ticketEventName: data.ticketEventName || '',
            ticketEventDateTime: data.ticketEventDateTime || '',
            ticketEventLocation: data.ticketEventLocation || '',
            ticketInfo: data.ticketInfo || '',
            ticketLogoUrl: data.ticketLogoUrl || '',
            ticketBannerUrl: data.ticketBannerUrl || '',
            ticketSupportEmail: data.ticketSupportEmail || '',
            ticketSupportPhone: data.ticketSupportPhone || '',
            ticketInfoUrl: data.ticketInfoUrl || '',
            ticketPortalUrl: data.ticketPortalUrl || '',
            ticketEmailNote: data.ticketEmailNote || ''
          };
          setLocalSettings(loaded);
          setOriginalSettings(loaded);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update unsaved changes count
  useEffect(() => {
    let count = 0;
    Object.keys(localSettings).forEach(key => {
      if (localSettings[key as keyof typeof localSettings] !== originalSettings[key as keyof typeof originalSettings]) {
        count++;
      }
    });
    setUnsavedChanges(count);
    return () => setUnsavedChanges(0);
  }, [localSettings, originalSettings, setUnsavedChanges]);

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
      fetchSettings();
      addToast('Đã khôi phục cài đặt gốc!', 'success');
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await authFetch(`${getBaseUrl()}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      });
      if (res.ok) {
        setOriginalSettings(localSettings);
        addToast('Đã lưu cấu hình mẫu vé thành công!', 'success');
      } else {
        addToast('Lỗi khi lưu cấu hình', 'error');
      }
    } catch (e) {
      addToast('Lỗi kết nối server', 'error');
    }
  };

  const loadPreview = async () => {
    try {
      // Đầu tiên lấy 1 registration ID hợp lệ
      const regRes = await authFetch(`${getBaseUrl()}/registrations/admin?pageSize=1`);
      if (!regRes.ok) throw new Error('Cannot find registration for preview');
      const regData = await regRes.json();
      const id = regData?.items?.[0]?.id;
      
      if (!id) {
        addToast('Bạn cần có ít nhất 1 đăng ký để xem mẫu thử!', 'error');
        return;
      }
      
      const res = await authFetch(`${getBaseUrl()}/registrations/admin/${id}/preview-ticket-email`);
      if (res.ok) {
        const htmlText = await res.text();
        setPreviewHtml(htmlText);
      } else {
        addToast('Không thể tải preview Email.', 'error');
      }

      const pdfRes = await authFetch(`${getBaseUrl()}/registrations/admin/${id}/preview-ticket-pdf`);
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        setPdfPreviewUrl(URL.createObjectURL(blob));
      } else {
        addToast('Không thể tải preview PDF.', 'error');
      }
      
      setViewMode('email');
      
      setTimeout(() => {
        if (previewContainerRef.current) {
          previewContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch(e) {
      console.error(e);
      addToast('Có lỗi xảy ra khi xem thử!', 'error');
    }
  };

  const handleUploadPic = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'ticketLogoUrl') setIsUploading(true);
    else setIsUploadingBanner(true);
    
    try {
      const result = await uploadImage(file, 'assets/images/tickets');
      handleChange(field, result.url);
      addToast('Tải lên ảnh mẫu vé thành công!', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'Lỗi khi tải lên', 'error');
    } finally {
      setIsUploading(false);
      setIsUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#a78bfa' }}>Đang tải cài đặt vé...</div>;
  }

  return (
    <div className={styles.container}>
      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleUploadPic(e, 'ticketLogoUrl')} />
      <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleUploadPic(e, 'ticketBannerUrl')} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#f3e8ff' }}>Cấu hình Mẫu Email & Vé PDF</h3>
        <button className={styles.addBtn} onClick={loadPreview}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          Xem thử ngay
        </button>
      </div>

      <div className={styles.formGrid}>
        
        {/* Tên Sự Kiện */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Tên Sự Kiện (Hiển thị hiển thị trên vé)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketEventName}
            onChange={(e) => handleChange('ticketEventName', e.target.value)}
            placeholder="VD: HUFFEST 2026"
          />
        </div>

        {/* Thời Gian */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Ngày giờ Sự Kiện</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketEventDateTime}
            onChange={(e) => handleChange('ticketEventDateTime', e.target.value)}
            placeholder="VD: 23-04-2026, 14:44"
          />
        </div>

        {/* Địa Điểm */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Địa Điểm Sự Kiện</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketEventLocation}
            onChange={(e) => handleChange('ticketEventLocation', e.target.value)}
            placeholder="VD: Sân Bóng HUIT"
          />
        </div>

        {/* Thông tin vé */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Thông Tin Vé (Loại vé/Khu vực)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketInfo}
            onChange={(e) => handleChange('ticketInfo', e.target.value)}
            placeholder="VD: Vé Phổ Thông"
          />
        </div>

        {/* Logo */}
        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Logo trên Email / Vé</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.ticketLogoUrl}
                onChange={(e) => handleChange('ticketLogoUrl', e.target.value)}
                placeholder="Dán URL ảnh hoặc tải lên..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploading ? styles.uploading : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Đang tải...' : 'Upload Logo'}
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Banner ngang trên Email</label>
          <div className={styles.imageInputRow}>
            <div className={styles.inputWrapper}>
               <input 
                type="text" 
                className={styles.input}
                value={localSettings.ticketBannerUrl}
                onChange={(e) => handleChange('ticketBannerUrl', e.target.value)}
                placeholder="URL ảnh bìa..."
              />
            </div>
            <button 
              className={`${styles.uploadBtn} ${isUploadingBanner ? styles.uploading : ''}`}
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? 'Đang tải...' : 'Upload Banner'}
            </button>
          </div>
        </div>

        <div className={styles.field} style={{ gridColumn: 'span 2' }}>
          <label className={styles.label}>Nội dung lưu ý Email (Note)</label>
          <textarea 
            className={`${styles.input} ${styles.textarea}`} 
            rows={3}
            placeholder="Ví dụ: Không phải bản in vé! Vui lòng không in vé, hãy dùng điện thoại mở link này khi đến sự kiện."
            value={localSettings.ticketEmailNote}
            onChange={(e) => handleChange('ticketEmailNote', e.target.value)}
            style={{ minHeight: '80px', padding: '10px' }}
          />
        </div>

        {/* Hỗ Trợ Email & Phone */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Email Liên Hệ Hỗ Trợ</label>
          <input 
            type="email" 
            className={styles.input}
            value={localSettings.ticketSupportEmail}
            onChange={(e) => handleChange('ticketSupportEmail', e.target.value)}
          />
        </div>
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>SĐT Liên Hệ Hỗ Trợ</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketSupportPhone}
            onChange={(e) => handleChange('ticketSupportPhone', e.target.value)}
          />
        </div>

        {/* URL Hệ Thống */}
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Link Xem Vé (Portal URL)</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketPortalUrl}
            onChange={(e) => handleChange('ticketPortalUrl', e.target.value)}
          />
        </div>
        <div className={styles.field} style={{ gridColumn: 'span 1' }}>
          <label className={styles.label}>Link Thông Tin Sự Kiện</label>
          <input 
            type="text" 
            className={styles.input}
            value={localSettings.ticketInfoUrl}
            onChange={(e) => handleChange('ticketInfoUrl', e.target.value)}
          />
        </div>

      </div>

      {(previewHtml || pdfPreviewUrl) && (
        <div ref={previewContainerRef} style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h4 style={{ color: '#f3e8ff' }}>Xem Trước <span style={{fontSize: '0.8rem', color: '#c084fc'}}>(Ghi chú: Cần "Lưu thay đổi" trước khi ấn xem thử để thấy thay đổi mới)</span></h4>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className={styles.addBtn} 
                style={{ background: viewMode === 'email' ? 'linear-gradient(90deg, #c084fc, #818cf8)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem' }}
                onClick={() => setViewMode('email')}
              >
                Mẫu Email
              </button>
              <button 
                className={styles.addBtn}
                style={{ background: viewMode === 'pdf' ? 'linear-gradient(90deg, #c084fc, #818cf8)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 1rem' }}
                onClick={() => setViewMode('pdf')}
              >
                Vé Điện Tử (PDF)
              </button>
              <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', padding: '0.4rem 1rem', cursor: 'pointer', marginLeft: '0.5rem' }} onClick={() => { setPreviewHtml(''); setPdfPreviewUrl(''); }}>Đóng</button>
            </div>
          </div>
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: '2px solid rgba(141, 74, 255, 0.5)',
            position: 'relative'
          }}>
            {viewMode === 'email' && previewHtml && (
              <iframe 
                title="Email Preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '800px', border: 'none', display: 'block' }}
              />
            )}
            {viewMode === 'pdf' && pdfPreviewUrl && (
              <iframe 
                title="PDF Preview"
                src={pdfPreviewUrl}
                style={{ width: '100%', height: '800px', border: 'none', display: 'block' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
