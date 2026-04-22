'use client';

import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/free-mode';

import styles from './ArtistSection.module.css';
import { Artist, BASE_IMAGE_URL } from '@/lib/api';

interface ArtistSectionProps {
  artists: Artist[];
  title?: string;
}

export default function ArtistSection({ artists, title = "DANH SÁCH NGHỆ SĨ" }: ArtistSectionProps) {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const handleCardClick = (artist: Artist) => {
    if (selectedArtist?.id === artist.id) {
      setSelectedArtist(null);
    } else {
      setSelectedArtist(artist);
    }
  };

  // Đảm bảo có đủ slide để Swiper chạy loop mượt mà trên mobile
  let displayArtists = [...artists];
  if (artists.length > 0 && artists.length < 5) {
    displayArtists = [...displayArtists, ...artists.map(a => ({ ...a, id: a.id + '-copy1' }))];
    if (displayArtists.length < 5) {
      displayArtists = [...displayArtists, ...artists.map(a => ({ ...a, id: a.id + '-copy2' }))];
    }
  }

  return (
    <section className={styles.section} id="artists">
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
              delay: 3000,
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
            {displayArtists.map((artist) => {
              const imageUrl = artist.image ? (artist.image.startsWith('http') ? artist.image : `${BASE_IMAGE_URL}${artist.image}`) : null;
              const isActive = selectedArtist?.id === artist.id;
              
              return (
                <SwiperSlide key={artist.id} className={styles.swiperSlide}>
                  <div 
                    className={`${styles.card} ${styles.isRevealed} ${isActive ? styles.isActive : ''}`}
                    onClick={() => handleCardClick(artist)}
                  >
                    <div 
                      className={styles.thumb} 
                      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
                    >
                      {!imageUrl && <div className={styles.placeholder}>?</div>}
                    </div>
                    <span className={styles.name}>{artist.name}</span>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Artist Detail Panel */}
        {selectedArtist && (
          <div className={`${styles.detail} ${styles.isOpen}`}>
            <div className={styles.detailHead}>
              <span className={styles.status}>{selectedArtist.name}</span>
            </div>
            <p className={styles.description}>
              {selectedArtist.description || 'Đang cập nhật thông tin về nghệ sĩ này...'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
