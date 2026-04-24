'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';
import { adminLogin } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await adminLogin(username, password);
      if (result.ok) {
        setIsSuccess(true);
        // Ngay lập tức thử chuyển hướng
        router.push('/admin');
        
        // Dự phòng: Nếu router.push không chạy (do Next.js client-side lag), 
        // dùng window.location và nút bấm thủ công
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      } else {
        setError(result.message || 'Sai tên đăng nhập hoặc mật khẩu.');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('Lỗi kết nối máy chủ. Hãy kiểm tra Backend và link Public.');
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <img 
            src="/assets/images/logo/logohuit.webp" 
            alt="HUIT FEST 2026" 
            className={styles.logo}
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/150?text=HUIT';
            }}
          />
          <h1 className={styles.title}>Quản trị hệ thống</h1>
          <p className={styles.subtitle}>Vui lòng đăng nhập để tiếp tục</p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: 'rgba(34, 197, 94, 0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#4ade80'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Đăng nhập thành công!</h2>
            <p style={{ color: '#a78bfa', marginBottom: '2rem' }}>Đang chuyển hướng đến trang quản trị...</p>
            <button 
              onClick={() => window.location.href = '/admin'}
              className={styles.loginButton}
            >
              Vào Dashboard ngay
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} action="javascript:void(0);">
            <div className={styles.formGroup}>
              <label className={styles.label}>Tên đăng nhập</label>
              <div className={styles.inputWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.inputIcon}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Mật khẩu</label>
              <div className={styles.inputWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.inputIcon}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePasswordBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button 
              type="submit" 
              className={styles.loginButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Đang xác thực...
                </>
              ) : (
                'Đăng nhập ngay'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
