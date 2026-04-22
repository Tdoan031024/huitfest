'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getCurrentEvent, updateEventConfig } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

export default function VideoManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('HUIT FEST 2026 - OFFICIAL TRAILER');

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event) {
      setVideoUrl(event.videoUrl || '');
      // If there's a title in pageConfig, we could use it, but for now we'll stick to a default or meta
      // Let's assume we might have it in pageConfig as well for more flexibility
      if ((event as any).videoSection?.title) {
        setVideoTitle((event as any).videoSection.title);
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
    const newConfig = {
      ...event,
      videoUrl: videoUrl,
      videoSection: {
        title: videoTitle
      }
    };

    const success = await updateEventConfig(slug, newConfig);
    if (success) {
      addToast('Cập nhật Video sự kiện thành công!', 'success');
    } else {
      addToast('Lỗi khi lưu Video sự kiện.', 'error');
    }
  };

  // Hàm xử lý link Video (Hỗ trợ Youtube và Facebook)
  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;

    let targetUrl = url.trim();

    // 0. Xử lý nếu người dùng dán nguyên thẻ <iframe>
    if (targetUrl.includes('<iframe')) {
      const srcMatch = targetUrl.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) {
        targetUrl = srcMatch[1];
      }
    }

    // 1. Kiểm tra Youtube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = targetUrl.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}`;
    }

    // 2. Kiểm tra Facebook
    if (targetUrl.includes('facebook.com')) {
      if (targetUrl.includes('plugins/video.php')) return targetUrl;
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(targetUrl)}&show_text=0&width=560`;
    }

    // 3. Nếu là link embed sẵn
    if (targetUrl.includes('embed') || targetUrl.includes('plugins/')) return targetUrl;

    return null;
  };

  const embedUrl = getVideoEmbedUrl(videoUrl);

  if (loading) return <div className={styles.loading}>Đang tải cấu hình video...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.bannerList}>
        <div className={styles.bannerCard} style={{ padding: '24px' }}>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label className={styles.label}>Tiêu đề Video</label>
              <input 
                type="text" 
                className={styles.input}
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Nhập tiêu đề hiển thị cho video..."
              />
            </div>
            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
              <label className={styles.label}>URL Video (Youtube hoặc Facebook)</label>
              <input 
                type="text" 
                className={styles.input}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Dán link Youtube hoặc Facebook tại đây..."
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                Hỗ trợ link Youtube, Facebook hoặc các mã nhúng sẵn.
              </p>
            </div>
          </div>

          {embedUrl ? (
            <div style={{ marginTop: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(141, 74, 255, 0.3)', position: 'relative', paddingTop: '56.25%' }}>
              <iframe 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                src={embedUrl} 
                title="Video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          ) : videoUrl ? (
            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', textAlign: 'center', fontSize: '0.875rem' }}>
              URL video không hợp lệ hoặc không được hỗ trợ. Vui lòng kiểm tra lại.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
