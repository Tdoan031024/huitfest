'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BannerManager.module.css';
import { getCurrentEvent, updateEventConfig } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface TicketStep {
  id: string | number;
  title: string;
  content: string;
}

export default function TicketManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<TicketStep[]>([]);
  const [sectionTitle, setSectionTitle] = useState('CÁCH THỨC NHẬN VÉ');
  const [notes, setNotes] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const event = await getCurrentEvent();
    if (event && event.instructions) {
      setSectionTitle(event.instructions.sectionTitle || 'CÁCH THỨC NHẬN VÉ');
      setNotes(event.instructions.notes || [
        'Sau khi hoàn thành đầy đủ các bước, bạn sẽ nhận được vé điện tử từ Ban Tổ Chức qua email để tham gia sự kiện.',
        'Vé tham gia hoàn toàn miễn phí.'
      ]);
      
      // Ensure each step has a stable ID for keying
      const mappedSteps = (event.instructions.items || []).map((item: any, idx: number) => ({
        ...item,
        id: item.id || `step-${idx}-${Date.now()}`
      }));
      setSteps(mappedSteps);
    }
    setLoading(false);
  };

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      loadData();
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    const event = await getCurrentEvent();
    if (!event) return;

    const slug = event.slug;

    const cleanSteps = steps.map(({ title, content }) => ({
      title,
      content,
    }));

    const newConfig = {
      ...event,
      instructions: {
        sectionTitle,
        notes,
        items: cleanSteps
      }
    };

    const success = await updateEventConfig(slug, newConfig);
    if (success) {
      addToast('Cập nhật quy trình nhận vé thành công!', 'success');
    } else {
      addToast('Lỗi khi lưu cấu hình.', 'error');
    }
  };

  const updateStep = (id: string | number, field: keyof TicketStep, value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addStep = () => {
    const newStep: TicketStep = {
      id: `new-${Date.now()}`,
      title: 'BƯỚC MỚI',
      content: 'Mô tả hướng dẫn...',
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string | number) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateNote = (index: number, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };

  const addNote = () => setNotes([...notes, '']);
  const removeNote = (index: number) => setNotes(notes.filter((_, i) => i !== index));


  if (loading) return <div className={styles.loading}>Đang tải quy trình nhận vé...</div>;

  return (
    <div className={styles.container}>
      {/* Cấu hình chung của Section */}
      <div className={styles.bannerCard} style={{ padding: '24px', marginBottom: '24px' }}>
         <div className={styles.field}>
            <label className={styles.label}>Tiêu đề Section (VD: CÁCH THỨC NHẬN VÉ)</label>
            <input 
              type="text" 
              className={styles.input}
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
            />
         </div>
      </div>

      <div className={styles.header} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Các bước thực hiện</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Cấu hình các bước hướng dẫn người tham gia.</p>
        </div>
        <button className={styles.addBtn} onClick={addStep}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Thêm bước mới
        </button>
      </div>

      <div className={styles.bannerList}>
        {steps.map((step, index) => {
          return (
            <div key={step.id} className={styles.bannerCard}>
              <div className={styles.cardHeader}>
                <div className={styles.gripInfo}>
                  <span className={styles.bannerIndex}>Bước #{index + 1}</span>
                </div>
                <button className={styles.deleteBtn} onClick={() => removeStep(step.id)} title="Xóa bước này">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label}>Tiêu đề bước (VD: ĐĂNG KÝ VÉ)</label>
                    <input 
                      type="text" 
                      className={styles.input}
                      value={step.title}
                      onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                    />
                  </div>

                  <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label}>Mô tả hướng dẫn</label>
                    <textarea 
                      className={styles.input}
                      style={{ height: '80px', paddingTop: '0.75rem', resize: 'vertical' }}
                      value={step.content}
                      onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                    />
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phần Lưu ý */}
      <div className={styles.header} style={{ marginTop: '30px', marginBottom: '15px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Lưu ý (Notes)</h3>
      </div>
      <div className={styles.bannerCard} style={{ padding: '24px' }}>
        {notes.map((note, idx) => (
          <div key={idx} className={styles.field} style={{ marginBottom: '15px', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className={styles.input} 
                value={note}
                onChange={(e) => updateNote(idx, e.target.value)}
                placeholder="Nhập nội dung lưu ý..."
              />
              <button 
                className={styles.deleteBtn} 
                onClick={() => removeNote(idx)}
                style={{ position: 'static', padding: '10px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        ))}
        <button className={styles.addBtn} onClick={addNote}>
          Thêm lưu ý
        </button>
      </div>
    </div>
  );
}
