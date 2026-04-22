'use client';

import React, { useEffect, useState } from 'react';
import styles from './Footer.module.css';
import { getCurrentEvent, BASE_IMAGE_URL } from '@/lib/api';

export default function Footer() {
  const [footerData, setFooterData] = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const event = await getCurrentEvent();
        if (event) {
          setFooterData(event.footer || {});
          setSponsors(event.sponsors || []);
        }
      } catch (error) {
        console.error('Error loading footer data:', error);
      }
    };
    loadData();
  }, []);

  const phone = footerData?.phone || '0123 456 789';
  const email = footerData?.email || 'media@huit.edu.vn';
  const fbLink = footerData?.facebook || '#';
  const tiktokLink = footerData?.tiktok || '#';

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Sponsors Section */}
        <div className={styles.supportSection}>
          <h3 className={styles.supportTitle}>{footerData?.sectionTitle || 'ĐỐI TÁC CHIẾN LƯỢC'}</h3>
          
          <div className={styles.marqueeContainer}>
            <div className={styles.marqueeContent}>
              {sponsors.length > 0 ? (
                /* Clone the logos many times to ensure the marquee fills the screen and runs smoothly */
                [...sponsors, ...sponsors, ...sponsors, ...sponsors, ...sponsors, ...sponsors].map((logo, index) => (
                  <div key={index} className={styles.logoItem}>
                    <img 
                      src={logo.imageUrl?.startsWith('/') ? `${BASE_IMAGE_URL}${logo.imageUrl}` : logo.imageUrl} 
                      alt={logo.name} 
                      className={styles.supportLogo} 
                    />
                  </div>
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.3)' }}>Chưa có đối tác</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
