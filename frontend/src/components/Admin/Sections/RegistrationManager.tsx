'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getBaseUrl, toggleRegistration, getCurrentEvent, bulkUpdateRegistrations, authFetch } from '@/lib/api';
import styles from './RegistrationManager.module.css';
import { useAdmin } from '@/app/admin/AdminContext';
import { useToast } from '@/context/ToastContext';

interface Registration {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  referralCode: string;
  userType: string;
  studentId: string;
  school: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: boolean;
  ticketCode?: string;
  checkedIn: boolean;
  createdAt: string;
}

export default function RegistrationManager() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [counters, setCounters] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [regOpen, setRegOpen] = useState(true);
  // localStatusChanges mapping: id -> { status?, priority? }
  const [localChanges, setLocalChanges] = useState<Record<number, { status?: 'pending' | 'approved' | 'rejected', priority?: boolean }>>({});
  
  const [sendEmailBulk, setSendEmailBulk] = useState(true);
  
  const { saveTrigger, resetTrigger, setUnsavedChanges } = useAdmin();
  const { addToast } = useToast();
  const lastSaveTrigger = useRef(saveTrigger);
  const lastResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    setUnsavedChanges(Object.keys(localChanges).length);
  }, [localChanges, setUnsavedChanges]);

  useEffect(() => {
    // Reset count when tab changes or component unmounts
    return () => setUnsavedChanges(0);
  }, [setUnsavedChanges]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${getBaseUrl()}/registrations/admin`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.items || []);
        setCounters(data.counters || { total: 0, pending: 0, approved: 0, rejected: 0 });
        setLocalChanges({}); // Clear local changes on refresh
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    const event = await getCurrentEvent();
    if (event) {
      setRegOpen(!!event.registrationOpen);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    fetchStatus();
  }, []);

  // Listen to global save trigger
  useEffect(() => {
    if (saveTrigger > lastSaveTrigger.current) {
      handleSave();
    }
    lastSaveTrigger.current = saveTrigger;
  }, [saveTrigger]);

  // Listen to global reset trigger
  useEffect(() => {
    if (resetTrigger > lastResetTrigger.current) {
      fetchRegistrations();
      fetchStatus();
      setLocalChanges({});
      addToast('Đã khôi phục dữ liệu!', 'success');
    }
    lastResetTrigger.current = resetTrigger;
  }, [resetTrigger]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 1. Save Toggle State
      const toggleSuccess = await toggleRegistration('huitu-fest-2026', regOpen);
      
      // 2. Save Changes (Status & Priority)
      const changedIds = Object.keys(localChanges).map(Number);
      let statusSuccess = true;
      
      if (changedIds.length > 0) {
        for (const id of changedIds) {
          const change = localChanges[id];
          // Determine if we should send email for this specific item
          // If it's being approved and bulk send email is on, or if it was part of a bulk approve
          const ok = await bulkUpdateRegistrations(
            [id], 
            change.status, 
            change.priority, 
            (change.status === 'approved' && sendEmailBulk)
          );
          if (!ok) statusSuccess = false;
        }
      }

      if (toggleSuccess && statusSuccess) {
        addToast('Đã lưu tất cả thay đổi thành công!', 'success');
        setSelectedIds([]); // Clear selection after save
        await fetchRegistrations();
        await fetchStatus();
      } else {
        addToast('Có lỗi xảy ra khi lưu một số thay đổi.', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      addToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLocal = () => {
    setRegOpen(!regOpen);
  };

  const handleStatusChangeLocal = (id: number, val: string) => {
    const original = registrations.find(r => r.id === id);
    
    let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    let newPriority = false;

    if (val === 'priority') {
      newStatus = 'pending';
      newPriority = true;
    } else {
      newStatus = val as any;
      newPriority = false;
    }

    if (original?.status === newStatus && original?.priority === newPriority) {
      const newChanges = { ...localChanges };
      delete newChanges[id];
      setLocalChanges(newChanges);
    } else {
      setLocalChanges({ 
        ...localChanges, 
        [id]: { status: newStatus, priority: newPriority } 
      });
    }
  };

  // Keep for potential internal use but we'll use combined logic
  const handlePriorityToggleLocal = (id: number) => {
    const original = registrations.find(r => r.id === id);
    const currentStatus = localChanges[id]?.status ?? original?.status;
    const newPriority = !(localChanges[id]?.priority ?? original?.priority);
    // ... logic would go here
  };

  const filteredData = registrations.filter(item => {
    // 1. Search filter
    const matchesSearch = 
      item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    // 2. Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'priority') {
        matchesStatus = item.priority === true;
      } else if (statusFilter === 'checkedIn') {
        matchesStatus = item.checkedIn === true;
      } else {
        matchesStatus = item.status === statusFilter && !item.priority;
      }
    }

    // 3. User type filter
    const matchesType = typeFilter === 'all' || item.userType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const applyBulkAction = (status?: 'pending' | 'approved' | 'rejected', priority?: boolean) => {
    const newChanges = { ...localChanges };
    selectedIds.forEach(id => {
      newChanges[id] = { 
        ...newChanges[id],
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {})
      };
    });
    setLocalChanges(newChanges);
    addToast(`Đã áp dụng thay đổi cho ${selectedIds.length} mục. Nhấn Lưu để hoàn tất.`, 'success');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tổng đăng ký</span>
          <span className={styles.statValue}>{counters.total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Đã duyệt</span>
          <span className={styles.statValue}>{counters.approved}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Chờ xử lý</span>
          <span className={styles.statValue}>{counters.pending}</span>
        </div>
        <div className={`${styles.statCard} ${regOpen ? styles.openCard : styles.closedCard}`}>
          <span className={styles.statLabel}>Trạng thái Đăng ký</span>
          <div className={styles.toggleRow}>
            <span className={styles.statusLabel}>{regOpen ? 'ĐANG MỞ' : 'ĐANG ĐÓNG'}</span>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={regOpen} 
                onChange={handleToggleLocal}
                disabled={loading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchBox}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Tìm theo tên, email hoặc SĐT..." 
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filters}>
            <select 
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="priority">Ưu tiên</option>
              <option value="approved">Đã duyệt</option>
              <option value="checkedIn">Đã check-in</option>
              <option value="rejected">Từ chối</option>
            </select>

            <select 
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tất cả đối tượng</option>
              {[...new Set(registrations.map(r => r.userType))].filter(Boolean).map(type => (
                <option key={type} value={type || ''}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {selectedIds.length > 0 && (
            <div className={styles.bulkActions}>
              <span className={styles.bulkCount}>Đã chọn {selectedIds.length} mục</span>
              <label className={styles.sendEmailLabel} title="Gửi mail kèm vé khi Duyệt">
                <input 
                  type="checkbox" 
                  checked={sendEmailBulk} 
                  onChange={(e) => setSendEmailBulk(e.target.checked)} 
                />
                Gửi Mail
              </label>
              <button onClick={() => applyBulkAction('approved')} className={styles.bulkBtnApprove}>Duyệt</button>
              <button onClick={() => applyBulkAction('rejected')} className={styles.bulkBtnReject}>Từ chối</button>
              <button onClick={() => applyBulkAction(undefined, true)} className={styles.bulkBtnPriority}>Ưu tiên</button>
            </div>
          )}
          <button className={styles.refreshBtn} onClick={fetchRegistrations} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Họ tên</th>
              <th>Ngày sinh</th>
              <th>SĐT</th>
              <th>Email</th>
              <th>Bạn là</th>
              <th>MSSV / Trường</th>
              <th>Mã GT</th>
              <th style={{ minWidth: '130px' }}>Trạng thái</th>
              <th>Mã vé</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading && registrations.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Không có dữ liệu</td></tr>
            ) : (
              filteredData.map((reg) => {
                const change = localChanges[reg.id];
                const currentStatus = change?.status ?? reg.status;
                const currentPriority = change?.priority ?? reg.priority;
                const isChanged = !!change;
                
                // Determine display value for the merged combo box
                const displayValue = currentPriority ? 'priority' : currentStatus;

                return (
                  <tr key={reg.id} className={`${isChanged ? styles.changedRow : ''} ${selectedIds.includes(reg.id) ? styles.selectedRow : ''}`}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(reg.id)}
                        onChange={() => toggleSelectOne(reg.id)}
                      />
                    </td>
                    <td className={styles.nameCell}>
                      {reg.fullName}
                      {isChanged && <span className={styles.dot}></span>}
                    </td>
                    <td>{reg.birthDate}</td>
                    <td>{reg.phone}</td>
                    <td>{reg.email}</td>
                    <td>{reg.userType}</td>
                    <td style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                      {reg.studentId || reg.school || '-'}
                    </td>
                    <td>{reg.referralCode || '-'}</td>
                    <td>
                      <select 
                        className={`${styles.statusSelect} ${reg.checkedIn ? styles.checkedIn : styles[currentStatus]} ${currentPriority ? styles.isPriority : ''}`}
                        value={reg.checkedIn ? 'checkedIn' : displayValue}
                        onChange={(e) => handleStatusChangeLocal(reg.id, e.target.value)}
                        disabled={reg.checkedIn}
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="priority">Ưu tiên</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="checkedIn" disabled>Đã check-in</option>
                        <option value="rejected">Từ chối</option>
                      </select>
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {reg.ticketCode ? `#${reg.ticketCode}` : '-'}
                    </td>
                    <td>{formatDate(reg.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
