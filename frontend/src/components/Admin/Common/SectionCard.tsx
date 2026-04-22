'use client';

import React from 'react';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function SectionCard({ title, children, actions }: SectionCardProps) {
  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {actions && <div className={styles.cardActions}>{actions}</div>}
      </header>
      <div className={styles.cardContent}>
        {children}
      </div>
    </section>
  );
}
