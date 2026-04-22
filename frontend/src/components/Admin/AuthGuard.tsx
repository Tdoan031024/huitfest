'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminMe } from '@/lib/api';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      // 1. Kiểm tra nhanh mã Token cục bộ
      const hasLocalToken = typeof window !== 'undefined' && !!localStorage.getItem('huit_admin_token');
      
      if (hasLocalToken || isLoginPage) {
        // Có Token hoặc đang ở trang login: Cho qua UI trước
        setAuthorized(true);
        setLoading(false);
      } else {
        // Không có Token: Cấm tuyệt đối, đá về login
        console.warn('[AuthGuard] Không tìm thấy Token, chuyển hướng về Login.');
        router.replace('/admin/login');
        return;
      }

      if (isLoginPage) return;

      // 2. Xác thực ngầm với Server xem Token còn sống không
      try {
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        const user = await Promise.race([getAdminMe(), timeoutPromise]);

        if (cancelled) return;

        if (!user) {
          // Token tồn tại nhưng đã hết hạn hoặc bị sai
          console.warn('[AuthGuard] Phiên đăng nhập hết hạn hoặc Token không hợp lệ.');
          localStorage.removeItem('huit_admin_token');
          router.replace('/admin/login');
        } else {
          console.log('[AuthGuard] Xác thực thành công cho user:', user.username);
        }
      } catch (err) {
        console.error('[AuthGuard] Lỗi kết nối xác thực (giữ phiên để tránh gián đoạn):', err);
      } finally {
        if (!cancelled) {
          setCheckedOnce(true);
          setLoading(false);
        }
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [pathname, router, isLoginPage]);

  // Login page: never block, always show
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Màn hình chờ nếu đang xác thực lần đầu và chưa có token xác định
  if (loading && !authorized) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090617',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(124, 58, 237, 0.2)',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Đang kiểm tra quyền truy cập...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}
