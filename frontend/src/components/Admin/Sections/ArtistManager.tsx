'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css'; // Dùng chung style input/card
import artistStyles from './ArtistManager.module.css';
import { getCurrentEvent, updateEventConfig, uploadImage, BASE_IMAGE_URL } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface Artist {
  id: number | string;
  name: string;
  description: string;
  imageUrl: string;
  type: 'main' | 'talent';
}

export default function ArtistManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'talent'>('main');
  const [isUploadingId, setIsUploadingId] = useState<number | string | null>(null);
  
  const [mainTitle, setMainTitle] = useState('DANH SÁCH NGHỆ SĨ');
  const [talentTitle, setTalentTitle] = useState('DẤU ẤN TÀI NĂNG');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeArtistId, setActiveArtistId] = useState<number | string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event) {
      setMainTitle(event.artists?.title || 'DANH SÁCH NGHỆ SĨ');
      setTalentTitle(event.artistsExtra?.title || 'DẤU ẤN TÀI NĂNG');

      const mainArtists = (event.artists?.artists || []).map((a: any) => ({
        id: a.id || `main-${Math.random()}`,
        name: a.name || '',
        description: a.description || '',
        imageUrl: a.image || a.imageUrl || '',
        type: 'main' as const
      }));
      
      const talentArtists = (event.artistsExtra?.artists || []).map((a: any) => ({
        id: a.id || `talent-${Math.random()}`,
        name: a.name || '',
        description: a.description || '',
        imageUrl: a.image || a.imageUrl || '',
        type: 'talent' as const
      }));
      
      setArtists([...mainArtists, ...talentArtists]);
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
    try {
      const event = await getCurrentEvent();
      if (!event) return;

      const mainArtists = artists
        .filter(a => a.type === 'main')
        .map(a => ({ name: a.name, description: a.description, image: a.imageUrl }));
        
      const talentArtists = artists
        .filter(a => a.type === 'talent')
        .map(a => ({ name: a.name, description: a.description, image: a.imageUrl }));

      const newConfig = {
        ...event,
        artists: {
          title: mainTitle,
          artists: mainArtists
        },
        artistsExtra: {
          title: talentTitle,
          artists: talentArtists
        }
      };

      const success = await updateEventConfig(event.slug, newConfig);
      if (success) {
        addToast('Cập nhật danh sách nghệ sĩ thành công!', 'success');
      } else {
        addToast('Lỗi khi lưu cấu hình nghệ sĩ.', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Đã xảy ra lỗi không xác định.', 'error');
    }
  };

  const handleUploadClick = (id: number | string) => {
    setActiveArtistId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeArtistId === null) return;

    setIsUploadingId(activeArtistId);
    try {
      const result = await uploadImage(file, 'assets/images/artists');
      updateArtist(activeArtistId, 'imageUrl', result.url);
      addToast('Upload ảnh thành công!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Upload ảnh thất bại.', 'error');
    } finally {
      setIsUploadingId(null);
      e.target.value = '';
      setActiveArtistId(null);
    }
  };

  const addArtist = () => {
    const newArtist: Artist = {
      id: `new-${Date.now()}`,
      name: '',
      description: '',
      imageUrl: '',
      type: activeSubTab,
    };
    setArtists([...artists, newArtist]);
  };

  const removeArtist = (id: number | string) => {
    setArtists(artists.filter(a => a.id !== id));
  };

  const updateArtist = (id: number | string, field: keyof Artist, value: string) => {
    setArtists(artists.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const filteredArtists = artists.filter(a => a.type === activeSubTab);

  if (loading) return <div className={styles.loading}>Đang tải danh sách nghệ sĩ...</div>;

  return (
    <div className={artistStyles.container}>
      <input 
        type="file" 
        ref={fileInputRef} 
        hidden 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      <div className={artistStyles.subTabs}>
        <button 
          className={`${artistStyles.subTab} ${activeSubTab === 'main' ? artistStyles.active : ''}`}
          onClick={() => setActiveSubTab('main')}
        >
          Danh sách nghệ sĩ 1
        </button>
        <button 
          className={`${artistStyles.subTab} ${activeSubTab === 'talent' ? artistStyles.active : ''}`}
          onClick={() => setActiveSubTab('talent')}
        >
          Danh sách Nghệ sĩ 2
        </button>
      </div>

      <div className={styles.bannerCard} style={{ marginBottom: '1.5rem', borderLeft: '4px solid #8d4aff' }}>
        <label className={styles.label}>Tiêu đề phần {activeSubTab === 'main' ? 'Nghệ sĩ 1' : 'Nghệ sĩ 2'}</label>
        <input 
          type="text" 
          className={styles.input}
          value={activeSubTab === 'main' ? mainTitle : talentTitle}
          onChange={(e) => activeSubTab === 'main' ? setMainTitle(e.target.value) : setTalentTitle(e.target.value)}
          placeholder="Nhập tiêu đề cho phần này..."
        />
      </div>

      <div className={styles.bannerList}>
        {filteredArtists.map((artist, index) => {
          const previewUrl = artist.imageUrl?.startsWith('/') 
            ? `${BASE_IMAGE_URL}${artist.imageUrl}` 
            : artist.imageUrl;

          return (
            <div key={artist.id} className={styles.bannerCard}>
              <div className={styles.cardHeader}>
                <div className={styles.gripInfo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.gripIcon}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  <span className={styles.bannerIndex}>Nghệ sĩ #{index + 1}</span>
                </div>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => removeArtist(artist.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>

              <div className={styles.cardBody}>
                <div className={artistStyles.artistContentRow}>
                  <div 
                    className={`${artistStyles.artistImagePreview} ${isUploadingId === artist.id ? artistStyles.uploading : ''}`}
                    onClick={() => handleUploadClick(artist.id)}
                  >
                    {isUploadingId === artist.id ? (
                      <div className={styles.spinner}></div>
                    ) : (
                      <>
                        <img src={previewUrl || '/assets/images/placeholder.png'} alt="Preview" />
                        <div className={artistStyles.uploadOverlay}>Tải ảnh</div>
                      </>
                    )}
                  </div>
                  
                  <div className={styles.formGrid} style={{ flex: 1 }}>
                    <div className={styles.field}>
                      <label className={styles.label}>Tên nghệ sĩ</label>
                      <input 
                        type="text" 
                        className={styles.input}
                        value={artist.name}
                        onChange={(e) => updateArtist(artist.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Mô tả / Vai trò</label>
                      <textarea 
                        className={styles.textarea}
                        rows={3}
                        value={artist.description}
                        onChange={(e) => updateArtist(artist.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                      <label className={styles.label}>URL Ảnh</label>
                      <div className={styles.imageInputRow}>
                         <div className={styles.inputWrapper}>
                           <input 
                            type="text" 
                            className={styles.input}
                            value={artist.imageUrl}
                            onChange={(e) => updateArtist(artist.id, 'imageUrl', e.target.value)}
                          />
                         </div>
                         <button 
                           className={`${styles.uploadBtn} ${isUploadingId === artist.id ? styles.uploading : ''}`}
                           onClick={() => handleUploadClick(artist.id)}
                           disabled={isUploadingId !== null}
                         >
                           {isUploadingId === artist.id ? (
                             <>
                               <span className={styles.spinner}></span>
                               Đang tải...
                             </>
                           ) : 'Upload'}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className={styles.addBtn} onClick={addArtist}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Thêm nghệ sĩ mới
      </button>
    </div>
  );
}
