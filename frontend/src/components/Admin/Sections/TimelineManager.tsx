'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getCurrentEvent, updateEventConfig, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface TimelineItem {
  id: string | number;
  time: string;
  title: string;
  description: string;
}

export default function TimelineManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [sectionTitle, setSectionTitle] = useState('HÀNH TRÌNH HUIT FEST');
  const [bannerImage, setBannerImage] = useState('/assets/images/banner/banner.webp');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event) {
      // Mapping from event.agenda (which comes from event.timeline.items in API)
      const mappedItems = (event.agenda || []).map((item: any, idx: number) => ({
        id: item.id || `time-${idx}-${Date.now()}`,
        time: item.time || '',
        title: item.title || '',
        description: item.description || ''
      }));
      setItems(mappedItems);
      
      // Load optional metadata from JSON
      if (event.timeline) {
        setSectionTitle(event.timeline.sectionTitle || 'HÀNH TRÌNH HUIT FEST');
        setBannerImage(event.timeline.bannerImage || '/assets/images/banner/banner.webp');
      }
    }
    setLoading(false);
  };

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      loadData();
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    const event = await getCurrentEvent();
    if (!event) return;

    const slug = event.slug;

    // Structure for updateEventConfig
    const newConfig = {
      ...event,
      agenda: items.map(({ time, title, description }) => ({
        time,
        title,
        description
      })),
      timeline: {
        sectionTitle,
        bannerImage
      }
    };

    const success = await updateEventConfig(slug, newConfig);
    if (success) {
      addToast('Cập nhật Timeline thành công!', 'success');
    } else {
      addToast('Lỗi khi lưu Timeline.', 'error');
    }
  };

  const addItem = () => {
    setItems([...items, { id: `new-${Date.now()}`, time: '', title: '', description: '' }]);
  };

  const removeItem = (id: string | number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string | number, field: keyof TimelineItem, value: string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const result = await uploadImage(file, 'assets/images/banner');
      setBannerImage(result.url);
      addToast('Upload banner thành công!', 'success');
    } catch (error) {
      addToast('Upload banner thất bại.', 'error');
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  if (loading) return <div className={styles.loading}>Đang tải Timeline...</div>;

  return (
    <div className={styles.container}>
      {/* Cấu hình chung Section */}
      <div className={styles.bannerCard} style={{ padding: '24px', marginBottom: '24px' }}>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Tiêu đề Section (VD: HÀNH TRÌNH HUIT FEST)</label>
            <input 
              type="text" 
              className={styles.input}
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
            />
          </div>
          
          <div className={styles.field} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Banner bên cạnh</label>
            <div className={styles.imageInputRow}>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="URL banner..."
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                />
              </div>
              <button 
                className={`${styles.uploadBtn} ${isUploadingBanner ? styles.uploading : ''}`} 
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
              >
                {isUploadingBanner ? 'Đang tải...' : 'Upload'}
              </button>
              <input 
                type="file" 
                ref={bannerInputRef} 
                hidden 
                accept="image/*" 
                onChange={handleBannerUpload} 
              />
            </div>
            {bannerImage && (
              <div className={styles.imagePreview} style={{ marginTop: '10px', height: '120px' }}>
                <img 
                  src={bannerImage.startsWith('/') ? `${BASE_IMAGE_URL}${bannerImage}` : bannerImage} 
                  alt="Banner Preview" 
                  style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '8px' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.header} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Các mốc thời gian</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Quản lý timeline diễn ra chương trình.</p>
        </div>
        <button className={styles.addBtn} onClick={addItem}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Thêm mốc mới
        </button>
      </div>

      <div className={styles.bannerList}>
        {items.map((item, index) => (
          <div key={item.id} className={styles.bannerCard}>
            <div className={styles.cardHeader}>
              <span className={styles.bannerIndex}>Mốc #{index + 1}</span>
              <button className={styles.deleteBtn} onClick={() => removeItem(item.id)}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Thời gian (VD: 19:30)</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={item.time}
                    onChange={(e) => updateItem(item.id, 'time', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Tiêu đề hoạt động</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={item.title}
                    onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Mô tả chi tiết</label>
                  <textarea 
                    className={styles.input}
                    style={{ height: '60px', paddingTop: '0.75rem' }}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
