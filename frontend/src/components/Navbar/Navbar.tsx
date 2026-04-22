'use client';

import React, { useState, useEffect } from 'react';
import styles from './Navbar.module.css';
import { useSiteConfig } from '@/context/SiteConfigContext';

export default function Navbar() {
  const { config } = useSiteConfig();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src={config.siteLogo} alt={config.siteName} className={styles.logoImg} />
          <span className={styles.logoText}>{config.siteName}</span>
        </div>

        <div className={styles.links}>
          <a href="#" className={styles.link}>TRANG CHỦ</a>
          <a href="#artist" className={styles.link}>NGHỆ SĨ</a>
          <a href="#timeline" className={styles.link}>LỊCH TRÌNH</a>
          <a href="#journey" className={styles.link}>HÀNH TRÌNH</a>
          <a href="#rules" className={styles.link}>QUY ĐỊNH</a>
        </div>

        <div className={styles.actions}>
          {config.registrationOpen && (
            <a href="#register" className={styles.btn}>ĐĂNG KÝ VÉ</a>
          )}
        </div>
      </div>
    </nav>
  );
}
