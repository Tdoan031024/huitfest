'use client';

import React from 'react';
import styles from './AboutSection.module.css';
import { BASE_IMAGE_URL } from '@/lib/api';

interface AboutSectionProps {
  title: string;
  description: string;
  logo: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ title, description, logo }) => {
  const displayImage = logo 
    ? (logo.startsWith('/') ? `${BASE_IMAGE_URL}${logo}` : logo) 
    : '/assets/images/about/chu_cropped.webp';

  return (
    <section className={styles.section} id="about">
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.text}>
              <p>{description}</p>
            </div>
          </div>
          <div className={styles.imageBox}>
            {displayImage && (
              <img 
                src={displayImage} 
                alt="HUIT Fest Experience" 
                className={styles.aboutImage}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
