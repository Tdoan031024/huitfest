'use client';

import React from 'react';
import styles from './TimelineSection.module.css';

interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

interface TimelineSectionProps {
  agenda: AgendaItem[];
  sectionTitle?: string;
  bannerImage?: string;
}

export default function TimelineSection({ 
  agenda, 
  sectionTitle = 'Time-line chương trình',
  bannerImage = '/assets/images/banner/banner.webp'
}: TimelineSectionProps) {
  return (
    <section className={styles.section} id="timeline">
      <div className={styles.container}>
        <h2 className={styles.heading}>{sectionTitle}</h2>

        <div className={styles.mainGrid}>
          <div className={styles.timelineList}>
            {agenda.map((item, index) => (
              <div key={item.id || index} className={styles.row}>
                <div className={styles.timePill}>
                  {item.time}
                </div>
                <div className={styles.contentBox}>
                  <h4 className={styles.itemTitle}>{item.title}</h4>
                  {item.description && (
                    <p className={styles.itemDesc}>{item.description}</p>
                  )}
                </div>
              </div>
            ))}
            {agenda.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', gridColumn: 'span 2', padding: '20px' }}>
                Đang cập nhật lịch trình sự kiện...
              </p>
            )}
          </div>

          <div className={styles.sidebar}>
            <img
              src={bannerImage}
              alt="Event Banner"
              className={styles.bannerImg}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
