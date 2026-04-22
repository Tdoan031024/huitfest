'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';
import { getCurrentEvent, updateEventConfig } from '@/lib/api';
import styles from './BannerManager.module.css';

interface RuleItem {
  id?: number;
  title: string;
  content: string;
}

export default function RulesManager() {
  const { saveTrigger, resetTrigger } = useAdmin();
  const { addToast } = useToast();
  
  const [event, setEvent] = useState<any>(null);
  const [sectionTitle, setSectionTitle] = useState('QUY ĐỊNH CHUNG');
  const [items, setItems] = useState<RuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCurrentEvent();
      if (data) {
        setEvent(data);
        if (data.rules) {
          setSectionTitle(data.rules.sectionTitle || 'QUY ĐỊNH CHUNG');
          setItems(data.rules.items || []);
        }
      }
    } catch (error) {
      console.error(error);
      addToast('Lỗi khi tải dữ liệu quy định', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      loadData();
      addToast('Đã khôi phục dữ liệu ban đầu', 'info');
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    const freshEvent = await getCurrentEvent();
    if (!freshEvent) return;
    
    setIsLoading(true);
    try {
      const newConfig = {
        ...freshEvent,
        rules: {
          ...freshEvent.rules,
          sectionTitle,
          items
        }
      };
      
      const success = await updateEventConfig(freshEvent.slug, newConfig);
      if (success) {
        addToast(`Cập nhật quy định "${sectionTitle}" thành công!`, 'success');
        setEvent(newConfig);
      } else {
        addToast('Lỗi khi lưu quy định', 'error');
      }
    } catch (error) {
      console.error(error);
      addToast('Đã xảy ra lỗi không xác định', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { title: '', content: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RuleItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <div className={styles.container}>
      {/* Tiêu đề Section */}
      <div className={styles.bannerCard} style={{ marginBottom: '2rem', borderLeft: '4px solid #8d4aff' }}>
        <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem' }}>Tiêu đề Section</h3>
        <input 
          type="text" 
          className={styles.input}
          value={sectionTitle}
          onChange={(e) => setSectionTitle(e.target.value)}
          placeholder="Ví dụ: QUY ĐỊNH CHUNG"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Danh sách quy định</h3>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{items.length} quy định</span>
      </div>

      <div className={styles.bannerList}>
        {items.map((item, index) => (
          <div key={index} className={styles.bannerCard} style={{ 
            padding: '1.5rem', 
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ position: 'absolute', right: '1rem', top: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                className={styles.deleteBtn}
                onClick={() => removeItem(index)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  background: 'linear-gradient(135deg, #8d4aff, #6a36c9)',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </span>
                <input 
                  type="text" 
                  className={styles.input}
                  style={{ fontWeight: 'bold', color: '#bca6ff' }}
                  value={item.title}
                  onChange={(e) => updateItem(index, 'title', e.target.value)}
                  placeholder="Tiêu đề quy định (ví dụ: Vé và check-in)"
                />
              </div>
              
              <textarea 
                className={styles.input}
                style={{ 
                  minHeight: '100px', 
                  resize: 'vertical',
                  padding: '0.75rem',
                  lineHeight: '1.6'
                }}
                value={item.content}
                onChange={(e) => updateItem(index, 'content', e.target.value)}
                placeholder="Nội dung quy định chi tiết..."
              />
            </div>
          </div>
        ))}
      </div>

      <button className={styles.addBtn} onClick={addItem} style={{ marginTop: '1rem' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        Thêm quy định mới
      </button>

      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ color: '#fff' }}>Đang lưu...</div>
        </div>
      )}
    </div>
  );
}
