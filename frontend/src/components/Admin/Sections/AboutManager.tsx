'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getCurrentEvent, updateEventConfig, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

export default function AboutManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [data, setData] = useState({
    name: '',
    description: '',
    heroImage: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event) {
      setData({
        name: event.name || '',
        description: event.description || '',
        heroImage: event.heroImage || ''
      });
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
    
    const payload = {
      ...event,
      name: data.name,
      description: data.description,
      heroImage: data.heroImage
    };

    const success = await updateEventConfig(slug, payload);
    if (success) {
      addToast('Cập nhật thông tin sự kiện thành công!', 'success');
    } else {
      console.error('Failed to update event config for slug:', slug, payload);
      addToast('Lỗi khi lưu cấu hình. Vui lòng kiểm tra console.', 'error');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'assets/images/about');
      setData({ ...data, heroImage: result.url });
      addToast('Upload ảnh thành công!', 'success');
    } catch (error) {
      addToast('Upload ảnh thất bại.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Quản lý Section 2: Tiêu đề & Mô tả</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Chỉnh sửa trực tiếp thông tin chính của sự kiện (Bảng Event).</p>
      </div>

      <div className={styles.bannerCard} style={{ padding: '24px' }}>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Tiêu đề (title)</label>
            <input 
              type="text" 
              className={styles.input}
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="Nhập tiêu đề sự kiện..."
            />
          </div>

          <div className={styles.field} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Nội dung mô tả (description)</label>
            <textarea 
              className={styles.input}
              style={{ height: '150px', paddingTop: '0.75rem', resize: 'vertical' }}
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết..."
            />
          </div>

          <div className={styles.field} style={{ gridColumn: 'span 2' }}>
            <label className={styles.label}>Ảnh minh họa (heroImage)</label>
            <div className={styles.imageInputRow}>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="URL ảnh..."
                  value={data.heroImage}
                  onChange={(e) => setData({ ...data, heroImage: e.target.value })}
                />
              </div>
              <button 
                className={`${styles.uploadBtn} ${isUploading ? styles.uploading : ''}`} 
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Đang tải...
                  </>
                ) : 'Upload Ảnh'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
            
            {data.heroImage && (
              <div style={{ marginTop: '15px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '300px' }}>
                <img 
                  src={data.heroImage.startsWith('/') ? `${BASE_IMAGE_URL}${data.heroImage}` : data.heroImage} 
                  alt="Preview" 
                  style={{ width: '100%', display: 'block' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
