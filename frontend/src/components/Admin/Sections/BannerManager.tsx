'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getBanners, updateBanners, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface Banner {
  id: number;
  imageUrl: string;
  title: string;
  showTitle: boolean;
  subtitle: string;
  showSubtitle: boolean;
  buttonText: string;
  buttonLink: string;
  showLink: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function BannerManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBannerId, setActiveBannerId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getBanners();
    // Ánh xạ dữ liệu từ DB (linkUrl) sang Frontend (buttonLink)
    setBanners(data.map(b => ({
      id: b.id,
      imageUrl: b.imageUrl,
      title: b.title || '',
      showTitle: b.showTitle ?? false,
      subtitle: b.subtitle || '',
      showSubtitle: b.showSubtitle ?? false,
      buttonText: 'Đăng ký ngay',
      buttonLink: b.linkUrl || '',
      showLink: b.showLink ?? false,
      isActive: b.isActive ?? true,
      sortOrder: b.sortOrder || 0,
    })));
    setLoading(false);
  };

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Map back to DB structure (linkUrl)
      const dataToSave = banners.map(b => ({
        id: b.id,
        imageUrl: b.imageUrl,
        title: b.title,
        showTitle: b.showTitle,
        subtitle: b.subtitle,
        showSubtitle: b.showSubtitle,
        linkUrl: b.buttonLink,
        showLink: b.showLink,
        isActive: b.isActive,
        sortOrder: b.sortOrder
      }));
      await updateBanners(dataToSave);
      addToast('Cập nhật Banner thành công!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Lỗi khi cập nhật Banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = (id: number) => {
    setActiveBannerId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeBannerId === null) return;

    setIsUploadingId(activeBannerId);
    try {
      const result = await uploadImage(file, 'assets/images/banner');
      updateBanner(activeBannerId, 'imageUrl', result.url);
      addToast('Upload ảnh thành công!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Upload thất bại', 'error');
    } finally {
      setIsUploadingId(null);
      e.target.value = '';
      setActiveBannerId(null);
    }
  };

  const addBanner = () => {
    const newBanner: Banner = {
      id: Date.now(),
      imageUrl: '',
      title: '',
      showTitle: false,
      subtitle: '',
      showSubtitle: false,
      buttonText: 'Đăng ký ngay',
      buttonLink: '',
      showLink: false,
      isActive: true,
      sortOrder: banners.length,
    };
    setBanners([...banners, newBanner]);
  };

  const removeBanner = (id: number) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const updateBanner = (id: number, field: keyof Banner, value: any) => {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải dữ liệu banners...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className={styles.bannerList}>
        {banners
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((banner, index) => {
          const previewUrl = banner.imageUrl.startsWith('/') 
            ? `${BASE_IMAGE_URL}${banner.imageUrl}` 
            : banner.imageUrl;

          return (
            <div key={banner.id} className={`${styles.bannerCard} ${!banner.isActive ? styles.inactive : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.gripInfo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.gripIcon}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  <span className={styles.bannerIndex}>Banner #{index + 1}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label className={styles.statusLabel}>
                    <input 
                      type="checkbox" 
                      checked={banner.isActive} 
                      onChange={(e) => updateBanner(banner.id, 'isActive', e.target.checked)}
                    />
                    <span>{banner.isActive ? 'Đang hiện' : 'Đang ẩn'}</span>
                  </label>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => removeBanner(banner.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.imageSection}>
                  <label className={styles.label}>Ảnh Banner (Tự động chuyển WebP)</label>
                  <div className={styles.imageInputRow}>
                    <div className={styles.inputWrapper}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.inputIcon}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <input 
                        type="text" 
                        className={styles.input}
                        placeholder="Dán URL hoặc nhấn Upload bên cạnh..."
                        value={banner.imageUrl}
                        onChange={(e) => updateBanner(banner.id, 'imageUrl', e.target.value)}
                      />
                    </div>
                    <button 
                      className={`${styles.uploadBtn} ${isUploadingId === banner.id ? styles.uploading : ''}`}
                      onClick={() => handleUploadClick(banner.id)}
                      disabled={isUploadingId !== null}
                    >
                      {isUploadingId === banner.id ? (
                        <>
                          <span className={styles.spinner}></span>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                  {banner.imageUrl && (
                    <div className={styles.imagePreview}>
                      <img src={previewUrl} alt="Preview" />
                      <div className={styles.previewOver}>Preview</div>
                    </div>
                  )}
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Thứ tự hiển thị (Order)</label>
                    <input 
                      type="number" 
                      className={styles.input}
                      value={banner.sortOrder}
                      onChange={(e) => updateBanner(banner.id, 'sortOrder', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelWithAction}>
                      <label className={styles.label}>Tiêu đề (Title)</label>
                      <label className={styles.miniToggle}>
                        <input 
                          type="checkbox" 
                          checked={banner.showTitle} 
                          onChange={(e) => updateBanner(banner.id, 'showTitle', e.target.checked)}
                        />
                        <span>{banner.showTitle ? 'Hiện' : 'Ẩn'}</span>
                      </label>
                    </div>
                    <input 
                      type="text" 
                      className={`${styles.input} ${!banner.showTitle ? styles.dimmed : ''}`}
                      placeholder={banner.showTitle ? "Nhập tiêu đề..." : "Tiêu đề đang ẩn"}
                      value={banner.title}
                      onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelWithAction}>
                      <label className={styles.label}>Phụ đề (Subtitle)</label>
                      <label className={styles.miniToggle}>
                        <input 
                          type="checkbox" 
                          checked={banner.showSubtitle} 
                          onChange={(e) => updateBanner(banner.id, 'showSubtitle', e.target.checked)}
                        />
                        <span>{banner.showSubtitle ? 'Hiện' : 'Ẩn'}</span>
                      </label>
                    </div>
                    <input 
                      type="text" 
                      className={`${styles.input} ${!banner.showSubtitle ? styles.dimmed : ''}`}
                      placeholder={banner.showSubtitle ? "Nhập phụ đề..." : "Phụ đề đang ẩn"}
                      value={banner.subtitle}
                      onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <div className={styles.labelWithAction}>
                      <label className={styles.label}>Nút liên kết (Link)</label>
                      <label className={styles.miniToggle}>
                        <input 
                          type="checkbox" 
                          checked={banner.showLink} 
                          onChange={(e) => updateBanner(banner.id, 'showLink', e.target.checked)}
                        />
                        <span>{banner.showLink ? 'Hiện' : 'Ẩn'}</span>
                      </label>
                    </div>
                    <input 
                      type="text" 
                      className={`${styles.input} ${!banner.showLink ? styles.dimmed : ''}`}
                      placeholder={banner.showLink ? "/registrations" : "Nút bấm đang ẩn"}
                      value={banner.buttonLink}
                      onChange={(e) => updateBanner(banner.id, 'buttonLink', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button className={styles.addBtn} onClick={addBanner}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          Thêm banner
        </button>
      </div>
    </div>
  );
}
