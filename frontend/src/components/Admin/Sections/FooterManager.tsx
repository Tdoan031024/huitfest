'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';
import { getCurrentEvent, updateEventConfig, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import styles from './BannerManager.module.css';

interface Sponsor {
  id: number | string;
  name: string;
  category: string;
  imageUrl: string;
}

export default function FooterManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  
  const [event, setEvent] = useState<any>(null);
  const [contact, setContact] = useState({
    phone: '',
    email: '',
    facebook: '',
    tiktok: '',
    sectionTitle: 'ĐỐI TÁC CHIẾN LƯỢC',
  });

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentEvent();
      if (data) {
        setEvent(data);
        const footer = data.footer || {};
        setContact({
          phone: footer.phone || '',
          email: footer.email || '',
          facebook: footer.facebook || '',
          tiktok: footer.tiktok || '',
          sectionTitle: footer.sectionTitle || 'ĐỐI TÁC CHIẾN LƯỢC',
        });
        
        // Map backend sponsors to local state
        if (data.sponsors) {
          setSponsors(data.sponsors.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category || 'GOLD',
            imageUrl: s.imageUrl || ''
          })));
        } else {
          setSponsors([]);
        }
      }
    } catch (error) {
      console.error(error);
      addToast('Lỗi khi tải dữ liệu Footer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      loadData();
      addToast('Đã khôi phục dữ liệu ban đầu', 'info');
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    if (!event) return;
    setIsLoading(true);
    try {
      const newConfig = {
        ...event,
        footer: {
          ...event.footer,
          ...contact,
          // Backend expects logos in footer for normalization
          logos: sponsors.map(s => ({
            name: s.name,
            image: s.imageUrl,
            category: s.category
          }))
        }
      };
      
      const success = await updateEventConfig(event.slug, newConfig);
      if (success) {
        addToast('Cập nhật Footer & Sponsors thành công!', 'success');
        setEvent(newConfig);
      } else {
        addToast('Lỗi khi lưu dữ liệu', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Đã xảy ra lỗi khi lưu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addSponsor = () => {
    setSponsors([...sponsors, { id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: '', category: 'GOLD', imageUrl: '' }]);
  };

  const removeSponsor = (id: number | string) => {
    setSponsors(sponsors.filter(s => s.id !== id));
  };

  const updateSponsor = (id: number | string, field: keyof Sponsor, value: string) => {
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, id: number | string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(id);
    try {
      const result = await uploadImage(file, 'assets/images/logo');
      // Force update by ensuring price field doesn't interfere
      setSponsors(prev => prev.map(s => s.id === id ? { ...s, imageUrl: result.url } : s));
      addToast('Upload logo thành công!', 'success');
    } catch (error) {
      addToast('Upload logo thất bại', 'error');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bannerCard} style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className={styles.field}>
          <label className={styles.label}>Tiêu đề phần Đối tác (VD: ĐỐI TÁC CHIẾN LƯỢC)</label>
          <input 
            type="text" 
            className={styles.input}
            value={contact.sectionTitle}
            onChange={(e) => setContact({ ...contact, sectionTitle: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.cardHeader} style={{ borderBottom: 'none', padding: '0.5rem 0 0.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 className={styles.label} style={{ fontSize: '0.875rem', color: '#c084fc' }}>NHÀ TÀI TRỢ (SPONSORS)</h4>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{sponsors.length} đối tác</span>
      </div>
      
      <div className={styles.bannerList}>
        {sponsors.map((sponsor, index) => (
          <div key={sponsor.id} className={styles.bannerCard} style={{ padding: '1.25rem' }}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Tên nhà tài trợ</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={sponsor.name}
                  onChange={(e) => updateSponsor(sponsor.id, 'name', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Hạng mục</label>
                <select 
                  className={styles.input}
                  value={sponsor.category}
                  onChange={(e) => updateSponsor(sponsor.id, 'category', e.target.value)}
                >
                  <option value="DIAMOND">DIAMOND</option>
                  <option value="GOLD">GOLD</option>
                  <option value="SILVER">SILVER</option>
                  <option value="BRONZE">BRONZE</option>
                </select>
              </div>
              <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>Logo nhà tài trợ</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {sponsor.imageUrl && (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#fff', padding: '4px', flexShrink: 0 }}>
                      <img 
                        key={sponsor.imageUrl}
                        src={sponsor.imageUrl.startsWith('/') ? `${BASE_IMAGE_URL}${sponsor.imageUrl}` : sponsor.imageUrl} 
                        alt="Logo" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className={styles.input}
                      value={sponsor.imageUrl}
                      onChange={(e) => updateSponsor(sponsor.id, 'imageUrl', e.target.value)}
                      placeholder="URL hoặc upload..."
                    />
                    <button 
                      className={`${styles.uploadBtn} ${uploadingId === sponsor.id ? styles.uploading : ''}`}
                      onClick={() => fileInputRefs.current[sponsor.id]?.click()}
                      disabled={uploadingId === sponsor.id}
                      style={{ padding: '0 1rem' }}
                    >
                      {uploadingId === sponsor.id ? '...' : 'Upload'}
                    </button>
                    <input 
                      type="file" 
                      ref={el => {fileInputRefs.current[sponsor.id] = el}}
                      hidden 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, sponsor.id)}
                    />
                  </div>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => removeSponsor(sponsor.id)}
                    style={{ padding: '0.5rem' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.addBtn} onClick={addSponsor} style={{ marginTop: '1rem' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Thêm nhà tài trợ mới
      </button>

      {isLoading && !sponsors.length && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
          Đang tải dữ liệu...
        </div>
      )}
    </div>
  );
}
