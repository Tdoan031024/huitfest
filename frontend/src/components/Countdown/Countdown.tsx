'use client';

import { useState, useEffect } from 'react';
import styles from './Countdown.module.css';

interface CountdownProps {
  targetDate: string;
  title?: string | null;
}

export default function Countdown({ targetDate, title }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0'),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0'),
        seconds: Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0'),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h3 className={styles.title}>{title || 'SỰ KIỆN BẮT ĐẦU SAU'}</h3>
        <div className={styles.timer}>
          <div className={styles.unit}>
            <div className={styles.box}>{timeLeft.days}</div>
            <span>Ngày</span>
          </div>
          <div className={styles.unit}>
            <div className={styles.box}>{timeLeft.hours}</div>
            <span>Giờ</span>
          </div>
          <div className={styles.unit}>
            <div className={styles.box}>{timeLeft.minutes}</div>
            <span>Phút</span>
          </div>
          <div className={styles.unit}>
            <div className={styles.box}>{timeLeft.seconds}</div>
            <span>Giây</span>
          </div>
        </div>
      </div>
    </section>
  );
}
