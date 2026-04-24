const isServer = typeof window === 'undefined';

export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim();
  }

  if (!isServer && typeof window !== 'undefined') {
    return '/api';
  }

  return 'http://127.0.0.1:3005/api';
}

// Luôn dùng relative path cho ảnh để đồng nhất Hydration giữa Server và Client.
// Việc Proxy ảnh sẽ được xử lý trong next.config.js
export const BASE_IMAGE_URL = '';

// Helper to get token from storage
function getAuthToken(): string | null {
  if (isServer) return null;
  const token = localStorage.getItem('huit_admin_token');
  if (token) console.log('[Auth] Token found in localStorage');
  return token;
}

// Helper for fetch with authentication fallback
export async function authFetch(baseUrl: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
    'bypass-tunnel-reminder': 'true' // Vượt tường Pinggy programmatic
  } as Record<string, string>;

  let fetchUrl = baseUrl;

  // Add Bearer token to headers if it exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`; // Vẫn giữ cho chuẩn
    
    // Đảm bảo 100% token đến được backend qua query param (Bất tử qua mọi proxy)
    const urlObj = new URL(baseUrl, 'http://dummy.com'); // dùng dummy domain để parse path
    urlObj.searchParams.set('admin_token', token);
    
    // Lấy lại path + query
    fetchUrl = baseUrl.includes('http') ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
  }

  console.log(`[authFetch] Requesting: ${fetchUrl}`);
  
  try {
    const res = await fetch(fetchUrl, {
      cache: 'no-store', // Tắt vĩnh viễn Cache cho Auth request
      ...options,
      headers,
      credentials: 'include', // Still keep cookies for dual-support
    });

    // Debug phản hồi để bắt thóp Pinggy
    const contentType = res.headers.get('content-type');
    console.log(`[authFetch] Status: ${res.status}, Type: ${contentType}`);

    if (contentType && contentType.includes('text/html')) {
      console.warn('[authFetch] CẢNH BÁO: Nhận được HTML thay vì JSON. Có thể Pinggy đang chặn!');
    }

    return res;
  } catch (error) {
    console.error(`[authFetch] Connection Error for ${fetchUrl}:`, error);
    throw error;
  }
}


export interface Artist {
  id: number | string;
  name: string;
  description: string;
  image: string | null;
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
}

export interface EventData {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  heroImage: string | null;
  startAt: string;
  artists?: {
    title?: string;
    artists: Artist[];
  };
  agenda: AgendaItem[];
  instructions?: {
    sectionTitle?: string;
    notes?: string[];
    items: Array<{ title: string; content: string }>;
  };
  rules?: {
    sectionTitle: string;
    content: string;
    items?: Array<{ title: string; content: string }>;
  };
  journey?: {
    sectionTitle?: string;
    title?: string;
    items: Array<{ title: string; content: string; image?: string }>;
  };
  artistsExtra?: {
    title?: string;
    artists: Artist[];
  };
  timeline?: {
    sectionTitle?: string;
    bannerImage?: string;
    items: AgendaItem[];
  };
  videoSection?: {
    title?: string;
  };
  sponsors?: any[];
  footer?: any;
  videoUrl?: string | null;
  registrationOpen?: boolean;
}

export interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  birthDate?: string;
  referralCode?: string;
  userType?: string;
  studentId?: string;
  school?: string;
}

export async function getCurrentEvent(): Promise<EventData | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/events/current`, {
      cache: 'no-store',
      headers: {
        'bypass-tunnel-reminder': 'true' // Vượt tường Pinggy programmatic
      },
      credentials: 'include',
    });
    
    if (!res.ok) return null;
    
    const event = await res.json();
    if (!event) return null;
    
    return {
      id: event.id,
      slug: event.slug,
      name: event.title || 'HUIT FEST 2026',
      subtitle: event.subtitle,
      description: event.description || '',
      heroImage: event.heroImage,
      startAt: event.startAt,
      videoUrl: event.videoUrl,
      artists: event.artists || { artists: [] },
      artistsExtra: event.artistsExtra || { artists: [] },
      timeline: event.timeline || { items: [] },
      agenda: event.timeline?.items || [],
      instructions: event.instructions || { items: [] },
      rules: event.rules ? {
        ...event.rules,
        sectionTitle: event.rules.sectionTitle || 'QUY ĐỊNH CHUNG',
        items: event.rules.items || []
      } : {
        sectionTitle: 'QUY ĐỊNH CHUNG',
        content: '',
        items: []
      },
      journey: event.journey || { items: [] },
      sponsors: event.sponsors || [],
      footer: event.footer || {},
      videoSection: event.videoSection || { title: 'HUIT FEST 2026 - OFFICIAL TRAILER' },
      registrationOpen: !!event.registrationOpen,
    };
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}

export async function registerTicket(data: RegistrationData): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Registration failed');
  }

  return res.json();
}

export async function getBanners(): Promise<any[]> {
  try {
    const res = await authFetch(`${getBaseUrl()}/banners`, { 
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch banners:', error);
    return [];
  }
}

export async function updateBanners(banners: any[]): Promise<any> {
  const res = await authFetch(`${getBaseUrl()}/banners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(banners),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to update banners';
    try {
      const errorData = await res.json();
      errorMsg = `Server error: ${errorData.message || JSON.stringify(errorData)}`;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return await res.json();
}

export async function uploadImage(file: File, folder: string = 'uploads'): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await authFetch(`${getBaseUrl()}/upload/image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Upload failed');
    } catch (e) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
  }

  return await res.json();
}

export async function updateEventConfig(slug: string, config: any): Promise<boolean> {
  const finalSlug = slug || 'huitu-fest-2026';
  try {
    const dataToSave = { ...config };

    if (dataToSave.name !== undefined && !dataToSave.title) {
      dataToSave.title = dataToSave.name;
    }

    if (dataToSave.footer) {
      dataToSave.footer = {
        ...dataToSave.footer,
        phone: dataToSave.footer.phone || '',
        email: dataToSave.footer.email || '',
        facebook: dataToSave.footer.facebook || '',
        tiktok: dataToSave.footer.tiktok || '',
        sectionTitle: dataToSave.footer.sectionTitle || 'ĐỐI TÁC CHIẾN LƯỢC',
      };
    }

    if (Array.isArray(dataToSave.agenda)) {
      dataToSave.timeline = {
        ...(dataToSave.timeline || {}),
        items: dataToSave.agenda
      };
      delete dataToSave.agenda;
    }

    if (Array.isArray(dataToSave.artists)) {
      dataToSave.artists = {
        artists: dataToSave.artists
      };
    } else if (dataToSave.artist && Array.isArray(dataToSave.artist) && !dataToSave.artists) {
      dataToSave.artists = {
        artists: dataToSave.artist
      };
    }
    if (dataToSave.artist) delete dataToSave.artist;

    if (Array.isArray(dataToSave.artistsExtra)) {
      dataToSave.artistsExtra = {
        artists: dataToSave.artistsExtra
      };
    } else if (dataToSave.artistExtra && Array.isArray(dataToSave.artistExtra) && (!dataToSave.artistsExtra || Array.isArray(dataToSave.artistsExtra))) {
      dataToSave.artistsExtra = {
        artists: dataToSave.artistExtra
      };
    }
    if (dataToSave.artistExtra) delete dataToSave.artistExtra;

    if (dataToSave.rules) {
      const rulesContent = dataToSave.rules;
      dataToSave.rules = {
        sectionTitle: rulesContent.sectionTitle || 'QUY ĐỊNH CHUNG',
        content: rulesContent.content || '',
        items: rulesContent.items || []
      };
    }

    if (dataToSave.instructions) {
      const instrContent = dataToSave.instructions;
      dataToSave.instructions = {
        sectionTitle: instrContent.sectionTitle || 'CÁCH THỨC NHẬN VÉ',
        notes: instrContent.notes || [],
        items: instrContent.items || []
      };
    }

    if (dataToSave.journey) {
      const journeyContent = dataToSave.journey;
      dataToSave.journey = {
        sectionTitle: journeyContent.sectionTitle || 'HÀNH TRÌNH HUIT FEST',
        items: journeyContent.items || []
      };
    }

    if (dataToSave.videoSection) {
      dataToSave.videoSection = {
        title: dataToSave.videoSection.title || 'HUIT FEST 2026 - OFFICIAL TRAILER'
      };
    }

    const res = await authFetch(`${getBaseUrl()}/events/${finalSlug}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave),
    });
    
    return res.ok;
  } catch (error) {
    console.error('updateEventConfig error:', error);
    return false;
  }
}

export async function adminLogout(): Promise<boolean> {
  try {
    const res = await authFetch(`${getBaseUrl()}/admin/auth/logout`, {
      method: 'POST',
    });
    if (!isServer) {
        localStorage.removeItem('huit_admin_token');
    }
    return res.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

export async function adminLogin(username: string, password: string): Promise<{ ok: boolean; message?: string }> {
  const loginUrl = `${getBaseUrl()}/admin/auth/login`;
  console.log(`[Auth] Attempting login at: ${loginUrl}`);

  try {
    let res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn(`[Auth] POST login failed with status ${res.status}, trying GET fallback...`);
      const loginGetUrl = `${getBaseUrl()}/admin/auth/login-get?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}`;
      res = await fetch(loginGetUrl, {
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken && !isServer) {
        localStorage.setItem('huit_admin_token', data.accessToken);
      }
      return { ok: true };
    }

    const errorData = await res.json();
    return { ok: false, message: errorData.message || 'Sai tên đăng nhập hoặc mật khẩu.' };
  } catch (error) {
    console.error('[Auth] Login fetch error:', error);
    
    // TRƯỜNG HỢP KHẨN CẤP: Nếu fetch bị lỗi hoàn toàn (do tunnel chặn POST), thử GET lần cuối
    try {
      console.log('[Auth] Connection error, attempting emergency GET fallback...');
      const loginGetUrl = `${getBaseUrl()}/admin/auth/login-get?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}`;
      const res = await fetch(loginGetUrl, {
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken && !isServer) {
          localStorage.setItem('huit_admin_token', data.accessToken);
        }
        return { ok: true };
      }
    } catch (innerError) {
      console.error('[Auth] Emergency fallback also failed:', innerError);
    }

    return { ok: false, message: 'Lỗi kết nối máy chủ. Vui lòng kiểm tra tunnel backend.' };
  }
}

export async function getAdminMe(): Promise<any> {
  try {
    const url = `${getBaseUrl()}/admin/auth/me`;
    console.log(`Checking session at: ${url}`);
    const res = await authFetch(url, {
      method: 'GET',
    });
    
    console.log(`Session check status: ${res.status}`);
    
    if (!res.ok) {
        // Chỉ xóa token nếu thực sự là lỗi xác thực (401, 403). Các lỗi 50x (như Gateway Timeout của Pinggy) thì giữ lại.
        if (!isServer && (res.status === 401 || res.status === 403)) {
          localStorage.removeItem('huit_admin_token');
        }
        return null;
    }
    
    const data = await res.json();
    console.log('Session data:', data);
    return data;
  } catch (error) {
    console.error('Session check connection error:', error);
    return null;
  }
}

export interface SiteSettings {
  siteName: string;
  siteLogo: string | null;
  siteBanner: string | null;
  siteDescription: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
  ticketLogoUrl?: string | null;
  ticketBannerUrl?: string | null;
  ticketPortalUrl?: string | null;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const res = await authFetch(`${getBaseUrl()}/settings`, {
      cache: 'no-store',
    });
    
    const contentType = res.headers.get('content-type');
    if (!res.ok || (contentType && contentType.includes('text/html'))) {
      console.warn('getSiteSettings: Received non-JSON response or error status');
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
    return null;
  }
}

export async function updateSiteSettings(data: Partial<SiteSettings>): Promise<boolean> {
  try {
    const res = await authFetch(`${getBaseUrl()}/settings`, {
      method: 'PUT',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to update site settings:', error);
    return false;
  }
}

export async function toggleRegistration(slug: string, open: boolean): Promise<boolean> {
  try {
    const res = await authFetch(`${getBaseUrl()}/events/${slug}/toggle-registration`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to toggle registration:', error);
    return false;
  }
}

export async function updateRegistrationStatus(id: number, status: string): Promise<boolean> {
  try {
    const res = await authFetch(`${getBaseUrl()}/registrations/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to update registration status:', error);
    return false;
  }
}

export async function bulkUpdateRegistrations(ids: number[], status?: string, priority?: boolean, sendEmail?: boolean): Promise<boolean> {
  try {
    const res = await authFetch(`${getBaseUrl()}/registrations/admin/bulk`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status, priority, sendEmail }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed bulk update registrations:', error);
    return false;
  }
}
