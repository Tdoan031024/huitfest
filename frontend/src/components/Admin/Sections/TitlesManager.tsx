'use client';

import React, { useState } from 'react';
import commonStyles from '@/components/Admin/Common/SectionCard.module.css';
import styles from './BannerManager.module.css'; // Dùng chung style input

export default function TitlesManager() {
  const [data, setData] = useState({
    heroTitle: 'HUIT FEST 2026',
    heroSubtitle: 'CITY HEART',
    aboutTitle: 'VỀ HUIT FEST',
    aboutDesc: 'HUIT Fest 2026 là sự kiện âm nhạc bùng nổ dành cho sinh viên HUIT...',
    journeyTitle: 'HÀNH TRÌNH RỰC RỠ',
    artistTitle: 'DÀN NGHỆ SĨ CỰC CHÁY',
  });

  const handleChange = (field: string, value: string) => {
    setData({ ...data, [field]: value });
  };

  return (
    <div className={styles.cardBody}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label}>Hero Title</label>
          <input 
            type="text" 
            className={styles.input}
            value={data.heroTitle}
            onChange={(e) => handleChange('heroTitle', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Hero Subtitle</label>
          <input 
            type="text" 
            className={styles.input}
            value={data.heroSubtitle}
            onChange={(e) => handleChange('heroSubtitle', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>About Title</label>
          <input 
            type="text" 
            className={styles.input}
            value={data.aboutTitle}
            onChange={(e) => handleChange('aboutTitle', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Artist Section Title</label>
          <input 
            type="text" 
            className={styles.input}
            value={data.artistTitle}
            onChange={(e) => handleChange('artistTitle', e.target.value)}
          />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>About Description</label>
          <textarea 
            className={styles.input}
            style={{ height: '100px', paddingTop: '0.5rem' }}
            value={data.aboutDesc}
            onChange={(e) => handleChange('aboutDesc', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
