'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css'; // Dùng chung style input
import { getCurrentEvent, updateEventConfig } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

export default function CountdownManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    targetDate: '',
    title: '',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event) {
      // Map DB startAt -> targetDate, subtitle -> title
      // Format startAt (ISO) to datetime-local (YYYY-MM-DDThh:mm)
      let formattedDate = '';
      if (event.startAt) {
        const date = new Date(event.startAt);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      setData({
        targetDate: formattedDate,
        title: event.subtitle || '',
        isActive: true, // Giả định bật mặc định
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
    try {
      if (!data.targetDate) {
        addToast('Vui lòng chọn ngày & giờ mục tiêu.', 'error');
        return;
      }

      const dateObj = new Date(data.targetDate);
      if (isNaN(dateObj.getTime())) {
        addToast('Ngày & giờ không hợp lệ.', 'error');
        return;
      }

      const event = await getCurrentEvent();
      if (!event) return;

      const newConfig = {
        ...event,
        subtitle: data.title,
        startAt: dateObj.toISOString(),
      };

      const success = await updateEventConfig(event.slug, newConfig);
      if (success) {
        addToast('Cập nhật bộ đếm ngược thành công!', 'success');
      } else {
        addToast('Lỗi khi cập nhật bộ đếm ngược.', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Lỗi khi lưu cấu hình.', 'error');
    }
  };

  const handleChange = (field: string, value: any) => {
    setData({ ...data, [field]: value });
  };

  if (loading) return <div className={styles.loading}>Đang tải cấu hình đếm ngược...</div>;

  return (
    <div className={styles.cardBody}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label}>Ngày & Giờ mục tiêu (startAt)</label>
          <input 
            type="datetime-local" 
            className={styles.input}
            value={data.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Trạng thái</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', height: '2.25rem' }}>
            <label className={styles.label} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={data.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem', accentColor: '#c084fc' }}
              />
              Bật bộ đếm ngược
            </label>
          </div>
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Tiêu đề bộ đếm (subtitle)</label>
          <input 
            type="text" 
            className={styles.input}
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Ví dụ: SỰ KIỆN SẼ BẮT ĐẦU TRONG"
          />
        </div>
      </div>
    </div>
  );
}
