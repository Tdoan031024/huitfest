'use client';

import React, { useState, useEffect } from 'react';
import styles from './RegistrationForm.module.css';
import { registerTicket } from '@/lib/api';
import { useSiteConfig } from '@/context/SiteConfigContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { vi } from 'date-fns/locale/vi';
import { registerLocale } from  "react-datepicker";
registerLocale('vi', vi);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default function RegistrationForm() {
  const { config } = useSiteConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    referralCode: '',
    userType: 'Sinh viên HUIT',
    studentId: '',
    school: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Listen for hash changes to open the modal
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#register' && config.registrationOpen) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    // Check on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const closeModal = () => {
    setIsOpen(false);
    // Remove the hash without triggering another scroll if possible
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const handleBirthDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      setFormData({ ...formData, birthDate: `${d}/${m}/${y}` });
    } else {
      setFormData({ ...formData, birthDate: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Chuyển đổi DD/MM/YYYY sang YYYY-MM-DD để Backend dễ xử lý (nếu cần)
    const parts = formData.birthDate.split('/');
    let cleanDate = formData.birthDate;
    if (parts.length === 3) {
      cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Lọc dữ liệu theo đối tượng để tránh lỗi Backend validation
    const payload: any = { 
      ...formData, 
      birthDate: cleanDate,
      role: formData.userType // Back-end dùng role để phân loại hiển thị
    };

    if (formData.userType !== 'Sinh viên HUIT' && formData.userType !== 'Cựu sinh viên HUIT') {
      delete payload.studentId;
    }
    if (formData.userType !== 'Học sinh THPT') {
      delete payload.school;
    }

    try {
      await registerTicket(payload);
      setStatus('success');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        referralCode: '',
        userType: 'Sinh viên HUIT',
        studentId: '',
        school: ''
      });
      setTimeout(closeModal, 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={closeModal}>&times;</button>

        <div className={styles.head}>
          <h2 className={styles.title}>ĐĂNG KÝ VÉ</h2>
          <p className={styles.subtitle}>Điền thông tin chính xác để nhận vé điện tử qua Email</p>
        </div>

        {status === 'success' ? (
          <div className={styles.success}>
            <div className={styles.successIconWrapper}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successRing}></div>
            </div>
            <h3 className={styles.successTitle}>ĐĂNG KÝ THÀNH CÔNG!</h3>
            <p className={styles.successText}>
              Một email xác nhận kèm vé điện tử đã được gửi đến bạn.<br/>
              Vui lòng kiểm tra hộp thư (bao gồm cả thư rác).
            </p>
            <button className={styles.successBtn} onClick={closeModal}>ĐÓNG</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Họ tên</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Ngày sinh</label>
                <div className={styles.datePickerWrapper}>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => {
                      handleBirthDateChange(date);
                      setIsCalendarOpen(false);
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    className={styles.dateInput}
                    locale="vi"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={100}
                    maxDate={new Date()}
                    required
                    open={isCalendarOpen}
                    onClickOutside={() => setIsCalendarOpen(false)}
                    onInputClick={() => {}} // Ngăn tự mở khi click vào input
                  />
                  <div 
                    className={styles.calendarIconWrapper} 
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    <CalendarIcon />
                  </div>
                </div>
              </div>
              <div className={styles.field}>
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0xxxxxxxxx"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Email nhận vé</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Mã giới thiệu (không bắt buộc)</label>
                <input
                  type="text"
                  placeholder="Nhập mã nếu có"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Bạn là</label>
                <select
                  required
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                  className={styles.select}
                >
                  <option value="Sinh viên HUIT">Sinh viên HUIT</option>
                  <option value="Học sinh THPT">Học sinh THPT</option>
                  <option value="Thầy cô">Thầy cô</option>
                  <option value="Cán bộ HUIT">Cán bộ HUIT</option>
                  <option value="Cựu sinh viên HUIT">Cựu sinh viên HUIT</option>
                  <option value="Khán giả tự do">Khán giả tự do</option>
                </select>
              </div>

              {(formData.userType === 'Sinh viên HUIT' || formData.userType === 'Cựu sinh viên HUIT') && (
                <div className={styles.field}>
                  <label>MSSV</label>
                  <input
                    type="text"
                    placeholder="Nhập MSSV"
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  />
                </div>
              )}

              {formData.userType === 'Học sinh THPT' && (
                <div className={styles.field}>
                  <label>Tên trường</label>
                  <input
                    type="text"
                    placeholder="Nhập tên trường cấp 3 của bạn"
                    required
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className={styles.btn}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'ĐANG XỬ LÝ...' : (
                <>
                  <span>XÁC NHẬN ĐĂNG KÝ</span>
                  <svg className={styles.btnIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>

            {status === 'error' && (
              <p className={styles.errorMsg}>Có lỗi xảy ra. Vui lòng thử lại sau.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
