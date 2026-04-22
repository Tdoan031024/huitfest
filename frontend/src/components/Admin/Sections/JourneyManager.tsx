'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getCurrentEvent, updateEventConfig, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface JourneyItem {
  id: string | number;
  title: string;
  content: string;
  image: string;
}

export default function JourneyManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [sectionTitle, setSectionTitle] = useState('HÀNH TRÌNH HUIT FEST');
  const [isUploadingId, setIsUploadingId] = useState<string | number | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event && event.journey) {
      setSectionTitle(event.journey.title || event.journey.sectionTitle || 'HÀNH TRÌNH HUIT FEST');
      const mappedItems = (event.journey.items || []).map((item: any, idx: number) => ({
        id: item.id || `journey-${idx}-${Date.now()}`,
        title: item.title || '',
        content: item.content || '',
        image: item.image || item.imageUrl || ''
      }));
      setItems(mappedItems);
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
    const newConfig = {
      ...event,
      journey: {
        sectionTitle: sectionTitle,
        items: items.map(({ title, content, image }) => ({
          title,
          content,
          image
        }))
      }
    };

    const success = await updateEventConfig(slug, newConfig);
    if (success) {
      addToast('Cập nhật Hành trình thành công!', 'success');
    } else {
      addToast('Lỗi khi lưu Hành trình.', 'error');
    }
  };

  const addItem = () => {
    setItems([...items, { id: `new-${Date.now()}`, title: '', content: '', image: '' }]);
  };

  const removeItem = (id: string | number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string | number, field: keyof JourneyItem, value: string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleUploadClick = (id: string | number) => {
    fileInputRefs.current[id]?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, id: string | number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingId(id);
    try {
      const result = await uploadImage(file, 'assets/images/hanhtrinh');
      updateItem(id, 'image', result.url);
      addToast('Upload ảnh thành công!', 'success');
    } catch (error) {
      addToast('Upload ảnh thất bại.', 'error');
    } finally {
      setIsUploadingId(null);
      e.target.value = '';
    }
  };

  if (loading) return <div className={styles.loading}>Đang tải Hành trình...</div>;

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
        </div>
      </div>

      <div className={styles.header} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Các mốc hành trình</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Quản lý các cột mốc quan trọng của HUIT Fest.</p>
        </div>
        <button className={styles.addBtn} onClick={addItem}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Thêm mốc hành trình
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
                <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Tiêu đề (VD: KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG)</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={item.title}
                    onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Nội dung mô tả</label>
                  <textarea 
                    className={styles.input}
                    style={{ height: '80px', paddingTop: '10px' }}
                    value={item.content}
                    onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                  />
                </div>
                <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                  <label className={styles.label}>Hình ảnh mốc hành trình</label>
                  <div className={styles.imageInputRow}>
                    <div className={styles.inputWrapper}>
                      <input 
                        type="text" 
                        className={styles.input}
                        placeholder="URL hình ảnh..."
                        value={item.image}
                        onChange={(e) => updateItem(item.id, 'image', e.target.value)}
                      />
                    </div>
                    <button 
                      className={`${styles.uploadBtn} ${isUploadingId === item.id ? styles.uploading : ''}`} 
                      onClick={() => handleUploadClick(item.id)}
                      disabled={isUploadingId === item.id}
                    >
                      {isUploadingId === item.id ? 'Đang tải...' : 'Upload'}
                    </button>
                    <input 
                      type="file" 
                      ref={el => {fileInputRefs.current[item.id] = el}} 
                      hidden 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, item.id)} 
                    />
                  </div>
                  {item.image && (
                    <div className={styles.imagePreview} style={{ marginTop: '10px' }}>
                      <img 
                        src={item.image.startsWith('/') ? `${BASE_IMAGE_URL}${item.image}` : item.image} 
                        alt="Preview" 
                        style={{ height: '150px', width: 'auto', borderRadius: '8px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
