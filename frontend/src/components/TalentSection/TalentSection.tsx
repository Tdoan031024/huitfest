'use client';

import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/free-mode';

import styles from './TalentSection.module.css';
import { BASE_IMAGE_URL } from '@/lib/api';

export interface Talent {
  id: string;
  name: string;
  description: string;
  image: string;
}

interface TalentSectionProps {
  talents: Talent[];
  title?: string;
}

export default function TalentSection({ talents, title = "DẤU ẤN TÀI NĂNG" }: TalentSectionProps) {
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  const handleCardClick = (talent: Talent) => {
    if (selectedTalent?.id === talent.id) {
      setSelectedTalent(null);
    } else {
      setSelectedTalent(talent);
    }
  };

  // Đảm bảo có đủ slide để Swiper chạy loop mượt mà trên mobile
  let displayTalents = [...talents];
  if (talents.length > 0 && talents.length < 5) {
    displayTalents = [...displayTalents, ...talents.map(t => ({ ...t, id: t.id + '-copy1' }))];
    if (displayTalents.length < 5) {
      displayTalents = [...displayTalents, ...talents.map(t => ({ ...t, id: t.id + '-copy2' }))];
    }
  }

  return (
    <section className={styles.section} id="talents">
      <div className={styles.container}>
        <div className={styles.head}>
          <h2 className={styles.heading}>{title}</h2>
        </div>
        
        <div className={styles.stripWrapper}>
          <Swiper
            modules={[Autoplay]}
            spaceBetween={0}
            slidesPerView={'auto'}
            centeredSlides={true}
            loop={true}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              768: {
                slidesPerView: 'auto',
                centeredSlides: false,
                spaceBetween: 0,
                autoplay: false,
                loop: false,
              }
            }}
            className={styles.swiper}
          >
            {displayTalents.map((talent) => {
              const isActive = selectedTalent?.id === talent.id;
              
              return (
                <SwiperSlide key={talent.id} className={styles.swiperSlide}>
                  <div 
                    key={talent.id} 
                    className={`${styles.card} ${styles.isRevealed} ${isActive ? styles.isActive : ''}`}
                    onClick={() => handleCardClick(talent)}
                  >
                    <div 
                      className={styles.thumb} 
                      style={{ backgroundImage: `url(${talent.image?.startsWith('http') ? talent.image : `${BASE_IMAGE_URL}${talent.image}`})` }}
                    >
                    </div>
                    <span className={styles.name}>{talent.name}</span>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Talent Detail Panel */}
        {selectedTalent && (
          <div className={`${styles.detail} ${styles.isOpen}`}>
            <div className={styles.detailHead}>
              <span className={styles.status}>{selectedTalent.name}</span>
            </div>
            <p className={styles.description}>
              {selectedTalent.description || 'Đang cập nhật thông tin về nhóm tài năng này...'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
