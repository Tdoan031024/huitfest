'use client';

import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-fade';

import styles from './Hero.module.css';
import { getBaseUrl, getCurrentEvent } from '@/lib/api';

export default function Hero() {
  const [banners, setBanners] = useState<any[]>([]);
  const [regOpen, setRegOpen] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const [bannerRes, eventData] = await Promise.all([
          fetch(`${getBaseUrl()}/banners`).then(r => r.json()),
          getCurrentEvent()
        ]);
        setBanners(bannerRes || []);
        if (eventData) {
          setRegOpen(!!eventData.registrationOpen);
        }
      } catch (error) {
        console.error('Failed to fetch hero data:', error);
        setBanners([]);
      }
    };
    fetchBanners();
  }, []);

  // Lọc lấy các banner đang hiện và sắp xếp theo thứ tự sortOrder
  const activeBanners = banners
    .filter(b => b.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Nếu không có banner nào trong DB hoặc đã bị ẩn hết, dùng banner mặc định
  const displayBanners = activeBanners.length > 0 
    ? activeBanners 
    : [{ id: 'default', imageUrl: '/assets/images/banner/banner.webp' }];

  return (
    <section className={styles.hero} id="home">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        speed={1000}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={displayBanners.length > 1}
        grabCursor={true}
        className={styles.swiper}
      >
        {displayBanners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div 
              className={styles.slide} 
              style={{ backgroundImage: `url(${banner.imageUrl})` }}
            >
              <div className={styles.slideContent}>
                {banner.showTitle !== false && banner.title && (
                  <h1 className={styles.title}>{banner.title}</h1>
                )}
                {banner.showSubtitle !== false && banner.subtitle && (
                  <p className={styles.subtitle}>{banner.subtitle}</p>
                )}
                {banner.showLink !== false && banner.linkUrl && regOpen && (
                  <a href={banner.linkUrl} className={styles.ctaButton}>
                    Đăng ký ngay
                  </a>
                )}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className={styles.overlay}></div>
    </section>
  );
}
