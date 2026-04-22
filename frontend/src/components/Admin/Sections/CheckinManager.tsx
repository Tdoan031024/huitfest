import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getBaseUrl, authFetch } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import styles from './CheckinManager.module.css';

interface CheckinResult {
  kind: 'ok' | 'invalid' | 'wrong_event';
  status?: string;
  message?: string;
  ticketCode?: string;
  registration?: {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    checkedIn: boolean;
    note: string;
    studentId?: string;
    role?: string;
  };
  parsed?: {
    adminMeta: {
      checkInGate?: string;
      checkedInAt?: string;
      checkedInBy?: string;
      ticketCode?: string;
    };
  };
}

export default function CheckinManager() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { addToast } = useToast();
  
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('last_checkin_result');
      if (saved) {
        try { setResult(JSON.parse(saved)); } catch (e) {}
      }
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('ticketToken');
      if (token) {
        setInputValue(token);
        handleAutomaticFlow(token);
        const newUrl = window.location.pathname + '?checkin=1';
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Fetch cameras when scanning starts
  useEffect(() => {
    if (isScanning && cameras.length === 0) {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Auto-select back camera if possible
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      }).catch(err => {
        console.error("Error getting cameras", err);
        setError("Không thể truy cập danh sách camera. Hãy cấp quyền.");
      });
    }
  }, [isScanning]);

  // Handle Camera Start/Stop
  const toggleCamera = async () => {
    if (isCameraStarted) {
      await stopScanner();
    } else {
      await startScanner();
    }
  };

  const handleCheckin = async () => {
    if (!result || !result.registration) return;
    
    setLoading(true);
    setError('');
    try {
      // Ensure we use the clean ticket code from the result, not the raw input
      const codeToUse = result.ticketCode || inputValue.replace(/^#/, '').trim();
      
      const res = await authFetch(`${getBaseUrl()}/registrations/admin/tickets/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          code: codeToUse,
          gateId: 'Main Gate'
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi thực hiện check-in.');
      
      setResult(data);
      if (data.ticketCode) setInputValue(data.ticketCode);
      addToast('Check-in thành công!', 'success');
      
      // Tự động đóng modal và reset để quét người tiếp theo sau 1 giây
      setTimeout(() => {
        resetScannerUI();
      }, 1200);
    } catch (err: any) {
      console.error('Checkin error details:', err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Lỗi kết nối. Hãy kiểm tra lại phiên đăng nhập trên thiết bị này.');
      } else {
        setError(err.message || 'Lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };


  const resetScannerUI = () => {
    setResult(null);
    setInputValue('');
    setError('');
    
    // Auto-start camera if we have a selected ID
    if (selectedCameraId) {
      startScanner();
    }
  };

  const startScanner = async () => {
    if (!selectedCameraId) return;
    setError('');
    
    setIsCameraLoading(true);
    
    // Give React time to render the #reader element
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          selectedCameraId,
          {
            fps: 15,
            aspectRatio: 1.0
          },
          onScanSuccess,
          onScanFailure
        );
        setIsCameraStarted(true);
      } catch (err: any) {
        console.error("Start scanner error:", err);
        setError("Không thể khởi động camera: " + (err.message || "Lỗi không xác định"));
      } finally {
        setIsCameraLoading(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
    setIsCameraStarted(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (loading || result) return;
    
    let finalValue = decodedText.trim();
    
    // URL parsing if needed
    try {
      if (finalValue.startsWith('http')) {
        const url = new URL(finalValue);
        const token = url.searchParams.get('ticketCode') || url.searchParams.get('code') || url.searchParams.get('ticketToken') || url.searchParams.get('token');
        if (token) finalValue = token.trim();
      }
    } catch (e) {}

    // Final sanitization for raw codes
    if (!finalValue.startsWith('http')) {
       finalValue = finalValue.replace(/[^a-zA-Z0-9-]/g, '').trim();
    }

    if (!finalValue) return;

    setInputValue(finalValue);
    
    // We do NOT stop the scanner here to avoid browser network interruptions.
    // The loading/result guards above will prevent multiple scans.
    await verifyTicket(finalValue);
  }

  function onScanFailure(error: any) {
    // Silence errors to keep console clean
  }

  const handleAutomaticFlow = async (token: string) => {
    await verifyTicket(token);
  };

  const verifyTicket = async (codeOrToken: string): Promise<CheckinResult | null> => {
    if (!codeOrToken.trim() || loading) return null;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = codeOrToken.length > 30 ? { token: codeOrToken } : { code: codeOrToken };
      
      const res = await authFetch(`${getBaseUrl()}/registrations/admin/tickets/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống khi xác thực vé.');
      
      setError(''); // Clear any previous error explicitly
      setResult(data);
      // Update input field with the human-readable code for clarity
      if (data.ticketCode) setInputValue(data.ticketCode);
      return data;
    } catch (err: any) {
      console.error('Verify error details:', err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Lỗi kết nối (Network Error). Hãy đảm bảo bạn đã đăng nhập và mạng ổn định.');
      } else {
        setError(err.message || 'Lỗi không xác định khi xác thực.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Removed redundant performCheckIn

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    handleAutomaticFlow(inputValue);
  };

  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.inputSection} style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.title} style={{ justifyContent: 'center', marginBottom: '1rem' }}>ĐANG TẢI HỆ THỐNG...</div>
          <div className={styles.label}>Vui lòng chờ trong giây lát</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      
      {/* Input Section */}
      <div className={styles.inputSection}>
        <form onSubmit={handleManualInput} className={styles.formGroup}>
          <div className={styles.inputWrapper}>
            <div className={styles.controlsRow}>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Nhập mã vé..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className={`${styles.cameraBtn} ${isScanning ? styles.scanningActive : ''}`}
                onClick={() => setIsScanning(!isScanning)}
              >
                {isScanning ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
        </form>

        {isScanning && (
          <div className={styles.scannerControls}>
            <div className={styles.inputWrapper}>
              <label className={styles.label}>Chọn Camera</label>
              <select 
                className={styles.select}
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                disabled={isCameraStarted}
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label}</option>
                ))}
              </select>
            </div>
            
            <button 
              className={`${styles.actionBtn} ${isCameraStarted ? styles.stopBtn : styles.startBtn}`}
              onClick={toggleCamera}
            >
              {isCameraStarted ? 'DỪNG QUÉT' : 'BẮT ĐẦU QUÉT CAMERA'}
            </button>

            {(isCameraStarted || isCameraLoading) && (
              <div className={styles.scannerViewport}>
                {isCameraLoading && (
                  <div className={styles.scannerLoading}>
                    <div className={styles.pulse}></div>
                    <span>ĐANG KHỞI TẠO CAMERA...</span>
                  </div>
                )}
                <div className={styles.scannerLaser}></div>
                <div className={styles.scannerCorners}></div>
                <div className={styles.scannerOverlay}></div>
                <div id="reader" style={{ width: '100%' }}></div>
              </div>
            )}
          </div>
        )}
        {error && <div className={`${styles.warningBox} ${styles.error}`}>{error}</div>}
      </div>

      {/* Result Modal Overlay */}
      {result && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget && (result as any).status !== 'valid_pending_checkin') resetScannerUI();
        }}>
          <div className={`${styles.modalContent} ${styles.animateIn}`}>
            <button className={styles.closeModal} onClick={resetScannerUI}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className={`${styles.resultSection} ${((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') ? styles.valid : styles.invalid}`}>
              <div className={styles.statusHeader}>
                <div className={`${styles.statusIcon} ${((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') ? styles.valid : styles.invalid}`}>
                  {((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  )}
                </div>
                <div className={styles.statusContent}>
                  <h2 className={`${styles.statusTitle} ${((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') ? styles.valid : styles.invalid}`}>
                    {((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') ? 'VÉ HỢP LỆ' : 'KHÔNG HỢP LỆ'}
                  </h2>
                  <p className={styles.statusSub}>
                    {((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in')
                      ? ((result as any).status === 'already_checked_in' ? 'Vé này đã được sử dụng trước đó' : 'Vé sẵn sàng để vào cổng')
                      : (result.message || 'Mã vé không tồn tại hoặc đã bị huỷ')
                    }
                  </p>
                </div>
              </div>

              {((result as any).status === 'valid_pending_checkin' || (result as any).status === 'checked_in') && (
                <>
                  <div className={styles.grid}>
                    <div className={styles.gridItem}>
                      <div className={styles.gridLabel}>Khán giả</div>
                      <div className={styles.gridValue}>{result.registration?.fullName}</div>
                    </div>
                    <div className={styles.gridItem}>
                      <div className={styles.gridLabel}>Mã số vé</div>
                      <div className={`${styles.gridValue} ${styles.highlight}`}>#{result.ticketCode}</div>
                    </div>
                    <div className={styles.gridItem}>
                      <div className={styles.gridLabel}>Đối tượng</div>
                      <div className={styles.gridValue}>{result.registration?.role || 'Khán giả tự do'}</div>
                    </div>
                    <div className={styles.gridItem}>
                      <div className={styles.gridLabel}>Trường / Đơn vị</div>
                      <div className={styles.gridValue}>{result.registration?.studentId || 'N/A'}</div>
                    </div>
                  </div>

                  {result.registration?.checkedIn && (
                    <div className={`${styles.warningBox} ${styles.success}`}>
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                       <strong>Xác nhận:</strong> Khán giả đã vào cổng thành công.
                    </div>
                  )}
                </>
              )}

              {result.status === 'valid_pending_checkin' && (
                <div className={styles.actionSection} style={{ marginTop: '24px' }}>
                  <button 
                    className={styles.confirmBtn} 
                    onClick={handleCheckin}
                    disabled={loading}
                  >
                    {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN VÀO CỔNG'}
                  </button>
                </div>
              )}

              {result.status === 'checked_in' && (
                <div className={styles.actionSection} style={{ marginTop: '24px' }}>
                  <button 
                    className={styles.nextBtn} 
                    onClick={resetScannerUI}
                  >
                    QUÉT TIẾP TỤC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
