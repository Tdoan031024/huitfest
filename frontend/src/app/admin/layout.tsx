'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/Admin/Sidebar/AdminSidebar';
import AdminHeader from '@/components/Admin/Header/AdminHeader';
import { AdminProvider } from './AdminContext';
import AuthGuard from '@/components/Admin/AuthGuard';
import styles from './AdminLayout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AuthGuard>
      {isLoginPage ? (
        children
      ) : (
        <AdminProvider>
          <div className={styles.adminContainer}>
            <AdminSidebar />
            <div className={styles.adminMain}>
              <AdminHeader />
              <main className={styles.adminContent}>
                {children}
              </main>
            </div>
          </div>
        </AdminProvider>
      )}
    </AuthGuard>
  );

}
