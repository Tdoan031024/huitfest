/**
 * Admin Upload Button Injector
 * Script này sẽ inject nút upload vào trang admin panel
 * Thêm vào head của admin/index.html
 */

(function () {
  'use strict';

  console.log('🚀 Admin Upload Injector loaded');

  const normalizeLooseText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Rewrite hard-coded upload endpoint in built admin bundle to current origin.
  const patchUploadEndpoint = () => {
    if (!window.fetch || window.__huitUploadFetchPatched) return;
    const originalFetch = window.fetch.bind(window);
    const runningUnderNodeApi = window.location.pathname === '/nodeapi' || window.location.pathname.startsWith('/nodeapi/');

    const rewriteApiUrl = (url) => {
      if (typeof url !== 'string' || !url) return url;

      let nextUrl = url;
      if (nextUrl.startsWith('http://localhost:3000/api/')) {
        nextUrl = `${window.location.origin}${nextUrl.replace('http://localhost:3000', '')}`;
      }

      if (runningUnderNodeApi && nextUrl.startsWith('/api/')) {
        nextUrl = `/nodeapi${nextUrl}`;
      }

      return nextUrl;
    };

    const isArtistSectionActive = () => {
      const titleNode = document.querySelector('[data-slot="card-title"]');
      const text = normalizeLooseText((titleNode && titleNode.textContent) || '');
      return text.includes('nghe') && text.includes('si');
    };

    const ensureGuestFolder = (init) => {
      if (!init || !init.body || !(init.body instanceof FormData)) return;
      const isUploadEndpoint = typeof init === 'object';
      if (!isUploadEndpoint) return;
      if (!isArtistSectionActive()) return;

      // Force artist image uploads to the guest folder, even if caller sent "uploads".
      init.body.set('folder', 'assets/images/khachmoi');
    };

    window.fetch = (input, init) => {
      let nextInput = input;
      if (typeof input === 'string') {
        nextInput = rewriteApiUrl(input);
      } else if (input instanceof Request) {
        const rewrittenUrl = rewriteApiUrl(input.url);
        if (rewrittenUrl !== input.url && rewrittenUrl) {
          nextInput = new Request(rewrittenUrl, input);
        }
      }

      const urlText = typeof nextInput === 'string' ? nextInput : (nextInput instanceof Request ? nextInput.url : '');
      if (urlText.includes('/api/upload/image')) {
        ensureGuestFolder(init);
      }

      return originalFetch(nextInput, init);
    };

    window.__huitUploadFetchPatched = true;
    console.log('✅ Upload endpoint patch active');
  };

  patchUploadEndpoint();

  const enforceFreshAdminConfig = async () => {
    if (window.__huitAdminConfigSyncStarted) return;
    window.__huitAdminConfigSyncStarted = true;

    const runningUnderNodeApi = window.location.pathname === '/nodeapi' || window.location.pathname.startsWith('/nodeapi/');
    const basePrefix = runningUnderNodeApi ? '/nodeapi' : '';
    const storageKeys = ['landingPageData', 'landingPageData.public.v2'];
    const reloadGuardKey = '__huitAdminConfigReloadGuard';
    const slugCandidates = ['huit-fest-2026', 'fptu-fest-2026', 'huitu-fest-2026'];

    const stableSerialize = (value) => {
      const seen = new WeakSet();
      return JSON.stringify(value, (key, val) => {
        if (!val || typeof val !== 'object') return val;
        if (seen.has(val)) return null;
        seen.add(val);

        if (Array.isArray(val)) return val;

        const sorted = {};
        Object.keys(val).sort().forEach((name) => {
          sorted[name] = val[name];
        });
        return sorted;
      });
    };

    const readStoredConfig = (key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    };

    const writeStoredConfig = (payload) => {
      const raw = JSON.stringify(payload);
      storageKeys.forEach((key) => {
        try {
          localStorage.setItem(key, raw);
        } catch (error) { }
      });
    };

    const getReloadGuard = () => {
      try {
        return sessionStorage.getItem(reloadGuardKey) === '1';
      } catch (error) {
        return false;
      }
    };

    const setReloadGuard = () => {
      try {
        sessionStorage.setItem(reloadGuardKey, '1');
      } catch (error) { }
    };

    const clearReloadGuard = () => {
      try {
        sessionStorage.removeItem(reloadGuardKey);
      } catch (error) { }
    };

    const fetchLatestConfig = async () => {
      for (let i = 0; i < slugCandidates.length; i += 1) {
        const slug = slugCandidates[i];
        const url = `${basePrefix}/api/events/${encodeURIComponent(slug)}/config?_ts=${Date.now()}`;
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          });

          if (response.status === 401 || response.status === 403) {
            return null;
          }

          if (!response.ok) {
            continue;
          }

          return response.json();
        } catch (error) {
          // Try next candidate slug.
        }
      }

      return null;
    };

    const latestConfig = await fetchLatestConfig();
    if (!latestConfig || typeof latestConfig !== 'object') {
      return;
    }

    let latestSignature = '';
    try {
      latestSignature = stableSerialize(latestConfig);
    } catch (error) {
      latestSignature = JSON.stringify(latestConfig);
    }

    const hasUpToDateSnapshot = storageKeys.some((key) => {
      const stored = readStoredConfig(key);
      if (!stored) return false;
      try {
        return stableSerialize(stored) === latestSignature;
      } catch (error) {
        return JSON.stringify(stored) === latestSignature;
      }
    });

    if (hasUpToDateSnapshot) {
      clearReloadGuard();
      return;
    }

    writeStoredConfig(latestConfig);

    if (getReloadGuard()) {
      return;
    }

    setReloadGuard();
    window.location.reload();
  };

  setTimeout(() => {
    enforceFreshAdminConfig().catch((error) => {
      console.warn('Admin config freshness sync skipped:', error);
    });
  }, 0);

  const normalizeImageUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const value = rawUrl.trim();
    if (!value) return '';

    if (value.startsWith('http://localhost:3000/')) {
      return value.replace('http://localhost:3000', window.location.origin);
    }

    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    return `/${value.replace(/^\/+/, '')}`;
  };

  const ensureBannerGuideline = (wrapper) => {
    if (!wrapper || wrapper.querySelector('[data-banner-guideline="1"]')) return;
    const hint = document.createElement('p');
    hint.setAttribute('data-banner-guideline', '1');
    hint.style.cssText = 'margin:6px 0 0;color:#a78bfa;font-size:11px;line-height:1.45;';
    hint.textContent = 'Khuyen nghi: anh ti le 3:4, kich thuoc 1200x1600 px, dung luong <= 500KB (uu tien WebP).';
    wrapper.appendChild(hint);
  };

  const isBannerField = (fieldRoot) => {
    if (!fieldRoot) return false;

    const card = fieldRoot.closest('[data-slot="card"]');
    const cardTitleNode = card ? card.querySelector('[data-slot="card-title"]') : null;
    const cardTitle = (cardTitleNode?.textContent || '').toLowerCase();
    const isBannerCard = cardTitle.includes('section 1') && cardTitle.includes('banner');
    if (!isBannerCard) return false;

    const nearLabel = fieldRoot.querySelector('label')
      || fieldRoot.previousElementSibling
      || fieldRoot.parentElement?.querySelector('label');
    const labelText = (nearLabel?.textContent || '').toLowerCase().trim();
    return labelText.includes('anh banner') || labelText.includes('ảnh banner');
  };

  const syncPreviewForInput = (input) => {
    if (!input) return;

    const fieldRoot = input.closest('.space-y-2') || input.parentElement;
    if (!fieldRoot) return;
    if (!isBannerField(fieldRoot)) return;

    ensureBannerGuideline(fieldRoot);

    const previewWrap = fieldRoot.querySelector('.mt-2.relative.group.w-max');
    if (!previewWrap) return;

    // Only update preview image that already exists in the admin UI.
    // Do not create new preview nodes to avoid duplicate preview boxes.
    const previewImg = previewWrap.querySelector('img');
    if (!previewImg) return;

    const normalized = normalizeImageUrl(input.value || '');

    if (normalized) {
      previewImg.src = normalized;
      previewImg.style.display = 'block';
    } else {
      previewImg.style.display = 'none';
      previewImg.removeAttribute('src');
    }
  };

  const cleanupNonBannerInjectedPreview = () => {
    // Remove all preview images previously injected by this script.
    const injectedPreviews = Array.from(document.querySelectorAll('img[data-upload-preview="1"]'));
    injectedPreviews.forEach((img) => {
      const wrapper = img.parentElement;
      img.remove();
      if (wrapper && wrapper.classList.contains('w-max') && wrapper.children.length === 0) {
        wrapper.remove();
      }
    });

    const nonBannerHints = Array.from(document.querySelectorAll('[data-banner-guideline="1"]'));
    nonBannerHints.forEach((hint) => {
      const fieldRoot = hint.closest('.space-y-2') || hint.parentElement;
      if (!fieldRoot || !isBannerField(fieldRoot)) {
        hint.remove();
      }
    });
  };

  const bindLivePreview = () => {
    cleanupNonBannerInjectedPreview();

    const imageUrlInputs = Array.from(document.querySelectorAll('input[data-slot="input"]'))
      .filter((input) => {
        const value = (input.value || '').trim().toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const fieldRoot = input.closest('.space-y-2') || input.parentElement;
        const likelyImageInput = value.includes('/assets/images/banner/') || placeholder.includes('url') || value.endsWith('.webp') || value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg');
        return !!(fieldRoot && likelyImageInput && isBannerField(fieldRoot));
      });

    imageUrlInputs.forEach((input) => {
      if (!input.dataset.previewBound) {
        input.addEventListener('input', () => syncPreviewForInput(input));
        input.addEventListener('change', () => syncPreviewForInput(input));
        input.dataset.previewBound = 'true';
      }

      syncPreviewForInput(input);
    });
  };

  const normalizeExistingPreviewUrls = () => {
    const imgs = Array.from(document.querySelectorAll('img[src^="http://localhost:3000/"]'));
    imgs.forEach((img) => {
      img.src = normalizeImageUrl(img.getAttribute('src') || '');
    });
  };

  const syncJourneyPreview = () => {
    const cards = Array.from(document.querySelectorAll('[data-slot="card"]'));

    cards.forEach((card) => {
      const titleNode = card.querySelector('[data-slot="card-title"]');
      const titleText = (titleNode?.textContent || '').toLowerCase();
      const isJourneyCard = titleText.includes('section 7') && (titleText.includes('hành trình') || titleText.includes('hanh trinh'));
      if (!isJourneyCard) return;

      const inputs = Array.from(card.querySelectorAll('input[data-slot="input"]'));
      inputs.forEach((input) => {
        const value = (input.value || '').trim();
        if (!value) return;
        const normalized = normalizeImageUrl(value);
        if (!normalized) return;

        const fieldRoot = input.closest('.space-y-2') || input.parentElement;
        if (!fieldRoot) return;

        const previewWrap = fieldRoot.querySelector('.mt-2.relative.group.w-max');
        if (!previewWrap) return;

        const previewImg = previewWrap.querySelector('img');
        if (!previewImg) return;

        previewImg.src = normalized;
        previewImg.style.display = 'block';
      });
    });
  };

  const enforceSingleSectionPreview = () => {
    const cards = Array.from(document.querySelectorAll('[data-slot="card"]'));

    cards.forEach((card) => {
      const titleNode = card.querySelector('[data-slot="card-title"]');
      const titleText = (titleNode?.textContent || '').toLowerCase();
      const isArtistCard = titleText.includes('section 3') && (titleText.includes('nghe') || titleText.includes('nghệ'));
      const isAboutCard = titleText.includes('section 2') && (titleText.includes('tiêu đề') || titleText.includes('tieu de') || titleText.includes('mô tả') || titleText.includes('mo ta'));
      if (!isArtistCard && !isAboutCard) return;

      // Remove banner recommendation text accidentally injected into artist section.
      card.querySelectorAll('[data-banner-guideline="1"]').forEach((node) => node.remove());

      const previewWrappers = Array.from(card.querySelectorAll('.mt-2.relative.group.w-max'));

      // Section 2 should show only the built-in preview image block, not the extra "Preview" box.
      if (isAboutCard) {
        previewWrappers.forEach((wrapper) => wrapper.remove());

        // Make the remaining built-in Section 2 preview image larger.
        const aboutImages = Array.from(card.querySelectorAll('img'));
        aboutImages.forEach((img) => {
          if (img.closest('button')) return;
          const src = (img.getAttribute('src') || '').toLowerCase();
          if (!src) return;
          if (!(src.includes('/assets/images/banner/') || src.includes('/uploads/'))) return;

          img.style.width = '250px';
          img.style.height = 'auto';
          img.style.maxHeight = '250px';
          img.style.objectFit = 'contain';
          img.style.borderRadius = '8px';
          img.style.display = 'block';
          img.style.marginTop = '8px';
        });
        return;
      }

      // Section 3: keep only the native artist preview block and remove duplicate "Preview" box.
      previewWrappers.forEach((wrapper) => {
        const text = (wrapper.textContent || '').toLowerCase();
        const img = wrapper.querySelector('img');
        const alt = (img?.getAttribute('alt') || '').toLowerCase();
        const isNativeArtistPreview = text.includes('xem truoc') || text.includes('xem trước');
        const isDuplicatePreview = alt === 'preview' || text.includes('preview') || img?.getAttribute('data-upload-preview') === '1';

        if (!isNativeArtistPreview && isDuplicatePreview) {
          wrapper.remove();
        }
      });
    });
  };

  // Chờ DOM load
  function init() {
    const injectResponsiveStyles = () => {
      if (document.getElementById('admin-responsive-fixes')) return;

      const responsiveStyle = document.createElement('style');
      responsiveStyle.id = 'admin-responsive-fixes';
      responsiveStyle.textContent = `
        html, body {
          max-width: 100%;
          overflow-x: hidden;
        }

        .huit-artist-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 4px;
          border: 1px solid rgba(147, 51, 234, 0.28);
          border-radius: 12px;
          background: rgba(88, 28, 135, 0.18);
        }

        .huit-artist-tab-btn {
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: rgba(216, 180, 254, 0.78);
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .huit-artist-tab-btn:hover {
          color: #ffffff;
          background: rgba(124, 58, 237, 0.2);
          border-color: rgba(147, 51, 234, 0.35);
        }

        .huit-artist-tab-btn.active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.92), rgba(6, 182, 212, 0.82));
          border-color: rgba(103, 232, 249, 0.42);
          box-shadow: 0 8px 20px rgba(76, 29, 149, 0.3);
        }

        .huit-artist-card {
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
          background: rgba(20, 14, 48, 0.4);
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
          transition: all 0.3s ease;
        }

        .huit-artist-card:hover {
          background: rgba(20, 14, 48, 0.6);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
        }

        .huit-artist-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
        }

        .huit-artist-card-title {
          font-size: 11px;
          font-weight: 800;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .huit-artist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .huit-artist-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .huit-artist-field label {
          color: rgba(167, 139, 250, 0.6);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-left: 4px;
        }

        .huit-artist-field input,
        .huit-artist-field textarea,
        .huit-artist-field select {
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.2);
          background: rgba(12, 7, 33, 0.6);
          color: #ffffff;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          width: 100%;
        }

        .huit-artist-field input:focus,
        .huit-artist-field textarea:focus,
        .huit-artist-field select:focus {
          border-color: rgba(167, 139, 250, 0.6);
          background: rgba(12, 7, 33, 0.8);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
        }
        
        .huit-artist-preview-block {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 14px;
          margin-top: 12px;
        }

        .huit-artist-preview-img {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: #000;
        }

        .huit-artist-preview-label {
          font-size: 10px;
          font-weight: 800;
          color: #22d3ee;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }

        .huit-artist-preview-name {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        @media (max-width: 1024px) {
          header.sticky > div:last-child {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
          }

          [data-slot="card-header"] {
            display: flex !important;
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px;
          }

          [data-slot="card-header"] > div:last-child {
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          main {
            padding: 14px !important;
          }

          .grid.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 767px) {
          .w-\\[260px\\] {
            width: min(82vw, 280px) !important;
          }

          header.sticky {
            height: auto !important;
            min-height: 60px;
            padding-top: 10px;
            padding-bottom: 10px;
            align-items: flex-start;
          }

          main {
            padding: 12px !important;
          }

          [data-slot="card-content"] {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .flex.gap-2.items-center {
            flex-wrap: wrap;
          }

          .text-lg {
            font-size: 1rem !important;
          }

          .huit-artist-tabs {
            flex-wrap: wrap;
          }

          .huit-artist-tab-btn {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
        }

        /* Hide sidebar scrollbar but keep functionality */
        aside .overflow-y-auto::-webkit-scrollbar,
        aside nav::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        aside .overflow-y-auto,
        aside nav {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `;

      document.head.appendChild(responsiveStyle);
    };

    injectResponsiveStyles();

    const runningUnderNodeApi = window.location.pathname === '/nodeapi' || window.location.pathname.startsWith('/nodeapi/');
    const basePrefix = runningUnderNodeApi ? '/nodeapi' : '';
    const apiBase = `${basePrefix}/api`;

    const REG_SIDEBAR_INACTIVE_CLASS = 'w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-[3px] border-transparent text-muted-foreground hover:text-white hover:bg-white/5';
    const REG_SIDEBAR_ACTIVE_CLASS = 'w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-[3px] border-transparent text-white bg-purple-600/20 border-l-purple-500';
    const registrationsUiState = window.__huitRegistrationsUiState || { isOpen: false };
    window.__huitRegistrationsUiState = registrationsUiState;

    const ensureRegistrationsPanelStyles = () => {
      if (document.getElementById('huit-registrations-inline-style')) return;

      const style = document.createElement('style');
      style.id = 'huit-registrations-inline-style';
      style.textContent = `
        .huit-reg-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .huit-reg-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .huit-reg-title h3 {
          margin: 0;
          font-size: 22px;
          color: #f8f5ff;
        }

        .huit-reg-title p {
          margin: 4px 0 0;
          color: #b8a9ea;
          font-size: 13px;
        }

        .huit-reg-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .huit-reg-btn {
          border: 1px solid rgba(124, 58, 237, 0.38);
          border-radius: 10px;
          background: rgba(124, 58, 237, 0.16);
          color: #f5ecff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          transition: all 0.2s ease;
        }

        .huit-reg-toggle-btn {
          border: 1px solid rgba(124, 58, 237, 0.45);
          border-radius: 10px;
          background: rgba(124, 58, 237, 0.12);
          color: #e9d5ff;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .huit-reg-toggle-btn.is-active {
          background: rgba(16, 185, 129, 0.22);
          border-color: rgba(16, 185, 129, 0.45);
          color: #86efac;
        }

        .huit-reg-toggle-btn.is-disabled {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.45);
          color: #fca5a5;
        }

        .huit-reg-btn.success {
          border-color: rgba(16, 185, 129, 0.42);
          background: rgba(16, 185, 129, 0.14);
          color: #c5fce4;
        }

        .huit-reg-panel,
        .huit-reg-stats,
        .huit-reg-table {
          border: 1px solid rgba(88, 28, 135, 0.35);
          border-radius: 12px;
          background: rgba(17, 9, 40, 0.92);
        }

        .huit-reg-panel {
          padding: 12px;
        }

        .huit-reg-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .huit-reg-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .huit-reg-field label {
          color: #b8a9ea;
          font-size: 12px;
          font-weight: 600;
        }

        .huit-reg-field input,
        .huit-reg-field select {
          height: 38px;
          border-radius: 9px;
          border: 1px solid rgba(125, 95, 191, 0.5);
          background: rgba(16, 11, 36, 0.88);
          color: #f3ecff;
          padding: 0 10px;
          font-size: 13px;
          outline: none;
        }

        .huit-reg-stats {
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .huit-reg-stat {
          border: 1px solid rgba(73, 48, 131, 0.5);
          border-radius: 10px;
          background: rgba(12, 7, 28, 0.75);
          padding: 10px;
        }

        .huit-reg-stat-key {
          color: #b8a9ea;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .huit-reg-stat-value {
          color: #ffffff;
          font-size: 28px;
          font-weight: 800;
        }

        .huit-reg-table-wrap {
          overflow: auto;
        }

        .huit-reg-table table {
          width: 100%;
          min-width: 1120px;
          border-collapse: collapse;
        }

        .huit-reg-table th,
        .huit-reg-table td {
          border-bottom: 1px solid rgba(77, 51, 138, 0.45);
          text-align: left;
          vertical-align: top;
          padding: 10px;
          font-size: 13px;
        }

        .huit-reg-table th:nth-child(8),
        .huit-reg-table td:nth-child(8) {
          min-width: 116px;
          text-align: center;
          vertical-align: middle;
        }

        .huit-reg-table th {
          color: #ddd6fe;
          background: rgba(19, 10, 45, 0.95);
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .huit-reg-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 94px;
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 5px 11px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .huit-reg-status.pending {
          background: linear-gradient(140deg, rgba(245, 158, 11, 0.24), rgba(245, 158, 11, 0.12));
          border-color: rgba(245, 158, 11, 0.4);
          color: #fcd34d;
        }

        .huit-reg-status.approved {
          background: linear-gradient(140deg, rgba(16, 185, 129, 0.24), rgba(16, 185, 129, 0.12));
          border-color: rgba(16, 185, 129, 0.4);
          color: #86efac;
        }

        .huit-reg-status.rejected {
          background: linear-gradient(140deg, rgba(239, 68, 68, 0.24), rgba(239, 68, 68, 0.12));
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .huit-reg-priority {
          color: #fde047;
          font-weight: 700;
        }

        .huit-reg-row-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .huit-reg-mini-btn {
          border: 1px solid rgba(96, 70, 163, 0.65);
          border-radius: 8px;
          background: rgba(17, 11, 40, 0.92);
          color: #f3ecff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 8px;
        }

        .huit-reg-mini-btn.success {
          border-color: rgba(16, 185, 129, 0.5);
          color: #a7f3d0;
        }

        .huit-reg-mini-btn.warn {
          border-color: rgba(245, 158, 11, 0.5);
          color: #fde68a;
        }

        .huit-reg-mini-btn.danger {
          border-color: rgba(239, 68, 68, 0.5);
          color: #fecaca;
        }

        .huit-reg-message {
          min-height: 18px;
          color: #b8a9ea;
          font-size: 13px;
        }

        .huit-reg-message.error {
          color: #fca5a5;
        }

        .huit-reg-message.success {
          color: #86efac;
        }

        @media (max-width: 1024px) {
          .huit-reg-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .huit-reg-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 767px) {
          .huit-reg-filter-grid,
          .huit-reg-stats {
            grid-template-columns: 1fr;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const setRegistrationsSidebarActive = (active) => {
      const sidebarBtn = document.querySelector('[data-registrations-manage-sidebar="1"]');
      if (!sidebarBtn) return;
      sidebarBtn.className = active ? REG_SIDEBAR_ACTIVE_CLASS : REG_SIDEBAR_INACTIVE_CLASS;
      if (active) clearAllNativeSidebarActive();
    };

    const clearAllNativeSidebarActive = () => {
      const sidebarNav = document.querySelector('aside nav');
      if (!sidebarNav) return;
      Array.from(sidebarNav.querySelectorAll('button, a')).forEach(item => {
        if (!item.dataset.sidebarArtistsExtraBtn && !item.dataset.registrationsManageSidebar) {
          // Standard shadcn/tailwind active classes
          item.classList.remove('bg-muted', 'text-primary', 'bg-accent', 'text-accent-foreground', 'bg-purple-600/20', 'text-purple-100');
          // Inline styles if any
          if (typeof item.className === 'string') {
             if (item.className.includes('bg-muted')) item.className = item.className.replace('bg-muted', '');
             if (item.className.includes('bg-accent')) item.className = item.className.replace('bg-accent', '');
          }
        }
      });
    };

    const hideNativeCardsForRegistrations = () => {
      const main = document.querySelector('main');
      if (main) {
        const container = main.querySelector('div:first-child') === main.firstElementChild ? main : (main.querySelector('div:first-child') || main);
        
        const anyCustomOpen = (window.__huitRegistrationsUiState && window.__huitRegistrationsUiState.isOpen) || 
                             (window.__huitArtistsExtraUiState && window.__huitArtistsExtraUiState.isOpen);

        Array.from(container.children).forEach(child => {
          if (child.id === 'huit-admin-registrations-card') {
            child.style.display = (window.__huitRegistrationsUiState && window.__huitRegistrationsUiState.isOpen) ? 'flex' : 'none';
          } else if (child.id === 'huit-admin-artists-extra-card') {
            child.style.display = (window.__huitArtistsExtraUiState && window.__huitArtistsExtraUiState.isOpen) ? 'flex' : 'none';
          } else {
            // Hide native card ONLY if any custom card is open
            child.style.display = anyCustomOpen ? 'none' : '';
          }
        });
      }
    };

    const restoreNativeCardsFromRegistrations = () => {
      const main = document.querySelector('main');
      if (main) {
        const container = main.querySelector('div:first-child') === main.firstElementChild ? main : (main.querySelector('div:first-child') || main);
        Array.from(container.children).forEach(child => {
          if (child.id === 'huit-admin-registrations-card' || child.id === 'huit-admin-artists-extra-card') {
            child.style.display = 'none';
          } else {
            child.style.display = '';
          }
        });
      }
    };

    const ensureRegistrationsInlineCard = () => {
      let card = document.getElementById('huit-admin-registrations-card');
      const main = document.querySelector('main');
      if (!main) return null;

      if (card) {
        if (card.parentElement !== main) {
          main.appendChild(card);
        }
        return card;
      }

      ensureRegistrationsPanelStyles();

      card = document.createElement('div');
      card.id = 'huit-admin-registrations-card';
      card.setAttribute('data-slot', 'card');
      card.setAttribute('data-size', 'default');
      card.className = 'group/card flex flex-col gap-4 overflow-hidden rounded-xl py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl border-purple-800/30 bg-[#0f0929]/90 shadow-2xl';
      card.style.display = 'none';

      card.innerHTML = `
        <div data-slot="card-header" class="group/card-header @container/card-header grid auto-rows-min gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 flex-row items-center justify-between border-b border-purple-900/25 pb-4">
          <div data-slot="card-title" class="font-heading group-data-[size=sm]/card:text-sm text-lg font-bold text-white">Quản lý đăng ký vé</div>
        </div>
        <div data-slot="card-content" class="px-4 group-data-[size=sm]/card:px-3 pt-6">
          <div class="huit-reg-wrap">
            <div class="huit-reg-title">
              <div>
                <h3>Danh sách đăng ký</h3>
                <p data-role="event-label">Đang tải dữ liệu sự kiện...</p>
                <div style="margin-top: 8px;">
                  <button type="button" class="huit-reg-toggle-btn" data-role="toggle-visibility-btn" title="Hiện/Ản nút đăng ký trên Landing Page">
                    <span class="indicator" style="width:8px;height:8px;border-radius:50%;background:currentColor;"></span>
                    <span class="label">Đang kiểm tra...</span>
                  </button>
                </div>
              </div>
              <div class="huit-reg-actions">
                <button type="button" class="huit-reg-btn" data-role="refresh-btn">Làm mới</button>
                <button type="button" class="huit-reg-btn success" data-role="export-btn">Xuất Excel</button>
              </div>
            </div>

            <div class="huit-reg-panel">
              <div class="huit-reg-filter-grid">
                <div class="huit-reg-field">
                  <label for="huit-reg-search">Tìm kiếm (họ tên, email, SĐT)</label>
                  <input id="huit-reg-search" data-role="search-input" type="text" placeholder="Nhập từ khóa..." />
                </div>
                <div class="huit-reg-field">
                  <label for="huit-reg-role">Nhóm đối tượng</label>
                  <select id="huit-reg-role" data-role="role-filter">
                    <option value="">Tất cả</option>
                    <option value="Học sinh THPT">Học sinh THPT</option>
                    <option value="Sinh viên HUIT">Sinh viên HUIT</option>
                    <option value="Thầy cô">Thầy cô</option>
                    <option value="Cán bộ HUIT">Cán bộ HUIT</option>
                    <option value="Cựu sinh viên HUIT">Cựu sinh viên HUIT</option>
                    <option value="Khán giả tự do">Khán giả tự do</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div class="huit-reg-field">
                  <label for="huit-reg-status">Trạng thái</label>
                  <select id="huit-reg-status" data-role="status-filter">
                    <option value="">Tất cả</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Từ chối</option>
                  </select>
                </div>
                <div class="huit-reg-field">
                  <label for="huit-reg-priority">Ưu tiên</label>
                  <select id="huit-reg-priority" data-role="priority-filter">
                    <option value="">Tất cả</option>
                    <option value="true">Ưu tiên</option>
                    <option value="false">Không ưu tiên</option>
                  </select>
                </div>
              </div>
              <div class="huit-reg-actions" style="margin-top:10px;">
                <button type="button" class="huit-reg-btn" data-role="apply-filter-btn">Áp dụng bộ lọc</button>
                <button type="button" class="huit-reg-btn" data-role="clear-filter-btn">Xóa lọc</button>
              </div>
            </div>

            <div class="huit-reg-stats">
              <div class="huit-reg-stat"><div class="huit-reg-stat-key">Tổng</div><div class="huit-reg-stat-value" data-role="st-total">0</div></div>
              <div class="huit-reg-stat"><div class="huit-reg-stat-key">Chờ duyệt</div><div class="huit-reg-stat-value" data-role="st-pending">0</div></div>
              <div class="huit-reg-stat"><div class="huit-reg-stat-key">Đã duyệt</div><div class="huit-reg-stat-value" data-role="st-approved">0</div></div>
              <div class="huit-reg-stat"><div class="huit-reg-stat-key">Từ chối</div><div class="huit-reg-stat-value" data-role="st-rejected">0</div></div>
              <div class="huit-reg-stat"><div class="huit-reg-stat-key">Ưu tiên</div><div class="huit-reg-stat-value" data-role="st-priority">0</div></div>
            </div>

            <div class="huit-reg-table">
              <div class="huit-reg-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Liên hệ</th>
                      <th>Đối tượng</th>
                      <th>THPT / MSSV</th>
                      <th>Ngày sinh</th>
                      <th>Mã giới thiệu</th>
                      <th>Trạng thái</th>
                      <th>Ưu tiên</th>
                      <th>Mã vé</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody data-role="table-body">
                    <tr><td colspan="11">Đang tải...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="huit-reg-message" data-role="message"></div>
          </div>
        </div>
      `;

      main.appendChild(card);

      if (card.dataset.regBound === '1') {
        return card;
      }

      card.dataset.regBound = '1';

      const regState = { items: [], loading: false };
      const eventLabel = card.querySelector('[data-role="event-label"]');
      const searchInput = card.querySelector('[data-role="search-input"]');
      const roleFilter = card.querySelector('[data-role="role-filter"]');
      const statusFilter = card.querySelector('[data-role="status-filter"]');
      const priorityFilter = card.querySelector('[data-role="priority-filter"]');
      const tableBody = card.querySelector('[data-role="table-body"]');
      const messageBox = card.querySelector('[data-role="message"]');
      const refreshBtn = card.querySelector('[data-role="refresh-btn"]');
      const exportBtn = card.querySelector('[data-role="export-btn"]');
      const applyFilterBtn = card.querySelector('[data-role="apply-filter-btn"]');
      const clearFilterBtn = card.querySelector('[data-role="clear-filter-btn"]');
      const stTotal = card.querySelector('[data-role="st-total"]');
      const stPending = card.querySelector('[data-role="st-pending"]');
      const stApproved = card.querySelector('[data-role="st-approved"]');
      const stRejected = card.querySelector('[data-role="st-rejected"]');
      const stPriority = card.querySelector('[data-role="st-priority"]');
      const toggleVisibilityBtn = card.querySelector('[data-role="toggle-visibility-btn"]');

      const setMessage = (text, type) => {
        if (!messageBox) return;
        messageBox.textContent = text || '';
        messageBox.className = `huit-reg-message${type ? ` ${type}` : ''}`;
      };

      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const statusLabel = (status) => {
        if (status === 'approved') return 'Đã duyệt';
        if (status === 'rejected') return 'Từ chối';
        return 'Chờ duyệt';
      };

      const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('vi-VN', { hour12: false });
      };

      const setCounters = (counters) => {
        stTotal.textContent = counters && counters.total ? String(counters.total) : '0';
        stPending.textContent = counters && counters.pending ? String(counters.pending) : '0';
        stApproved.textContent = counters && counters.approved ? String(counters.approved) : '0';
        stRejected.textContent = counters && counters.rejected ? String(counters.rejected) : '0';
        stPriority.textContent = counters && counters.priority ? String(counters.priority) : '0';
      };

      const buildQueryParams = () => {
        const params = new URLSearchParams();
        const search = String(searchInput?.value || '').trim();
        const role = String(roleFilter?.value || '').trim();
        const status = String(statusFilter?.value || '').trim();
        const priority = String(priorityFilter?.value || '').trim();

        if (search) params.set('search', search);
        if (role) params.set('role', role);
        if (status) params.set('status', status);
        if (priority) params.set('priority', priority);

        return params;
      };

      const renderTable = () => {
        if (!tableBody) return;

        if (regState.loading) {
          tableBody.innerHTML = '<tr><td colspan="11">Đang tải...</td></tr>';
          return;
        }

        if (!regState.items.length) {
          tableBody.innerHTML = '<tr><td colspan="11">Không có dữ liệu.</td></tr>';
          return;
        }

        const rows = regState.items.map((item) => [
          '<tr>',
          `<td>${item.id}</td>`,
          `<td>${escapeHtml(item.fullName)}</td>`,
          `<td><div>${escapeHtml(item.email)}</div><div>${escapeHtml(item.phone)}</div><div style="color:#a392da;font-size:12px;">${escapeHtml(formatDate(item.createdAt))}</div></td>`,
          `<td>${escapeHtml(item.audience || '')}</td>`,
          `<td>${escapeHtml(item.schoolOrStudentId || '')}</td>`,
          `<td>${escapeHtml(item.birthDate || '')}</td>`,
          `<td>${escapeHtml(item.referralCode || '')}</td>`,
          `<td><span class="huit-reg-status ${item.status}">${statusLabel(item.status)}</span></td>`,
          `<td>${item.priority ? '<span class="huit-reg-priority">Ưu tiên</span>' : ''}</td>`,
          `<td>${escapeHtml(item.ticketCode || '')}</td>`,
          `<td><div class="huit-reg-row-actions"><button class="huit-reg-mini-btn success" data-action="approve" data-id="${item.id}">Duyệt</button><button class="huit-reg-mini-btn success" data-action="approve-email" data-id="${item.id}">Duyệt + Email</button><button class="huit-reg-mini-btn danger" data-action="reject" data-id="${item.id}">Từ chối</button><button class="huit-reg-mini-btn warn" data-action="priority" data-id="${item.id}">${item.priority ? 'Bỏ ưu tiên' : 'Ưu tiên'}</button></div>${item.rejectedReason ? `<div style="margin-top:6px;color:#fca5a5;">Lý do: ${escapeHtml(item.rejectedReason)}</div>` : ''}</td>`,
          '</tr>',
        ].join('')).join('');

        tableBody.innerHTML = rows;
      };

      const loadData = async () => {
        regState.loading = true;
        renderTable();
        setMessage('');

        const params = buildQueryParams();
        const query = params.toString();
        const url = `${apiBase}/registrations/admin${query ? `?${query}` : ''}`;

        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });

          if (response.status === 401) {
            window.location.href = `${apiBase}/admin/auth/login-page`;
            return;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const payload = await response.json();
          regState.items = Array.isArray(payload.items) ? payload.items : [];
          if (eventLabel) {
            eventLabel.textContent = payload.eventTitle
              ? `${payload.eventTitle} - quản lý đăng ký vé`
              : 'Quản lý đăng ký vé';
          }
          if (payload.registrationOpen !== undefined) {
            updateToggleVisibilityBtn(payload.registrationOpen);
          }
          setCounters(payload.counters || {});
        } catch (error) {
          regState.items = [];
          setCounters({});
          setMessage(`Không thể tải dữ liệu đăng ký. ${error && error.message ? error.message : ''}`, 'error');
        } finally {
          regState.loading = false;
          renderTable();
        }
      };

      const updateToggleVisibilityBtn = (isOpen) => {
        if (!toggleVisibilityBtn) return;
        toggleVisibilityBtn.disabled = false;
        toggleVisibilityBtn.dataset.isOpen = isOpen ? 'true' : 'false';
        toggleVisibilityBtn.classList.remove('is-active', 'is-disabled');
        toggleVisibilityBtn.classList.add(isOpen ? 'is-active' : 'is-disabled');

        const label = toggleVisibilityBtn.querySelector('.label');
        if (label) {
          label.textContent = isOpen ? 'Nút đăng ký: ĐANG HIỆN' : 'Nút đăng ký: ĐANG ẨN';
        }
      };

      if (toggleVisibilityBtn) {
        if (!toggleVisibilityBtn.dataset.boundToggle) {
          toggleVisibilityBtn.dataset.boundToggle = '1';
          toggleVisibilityBtn.addEventListener('click', async () => {
            const isOpen = toggleVisibilityBtn.dataset.isOpen === 'true';
            const nextState = !isOpen;

            toggleVisibilityBtn.disabled = true;
            const label = toggleVisibilityBtn.querySelector('.label');
            if (label) label.textContent = 'Đang xử lý...';

            try {
              const slug = 'huit-fest-2026';
              const response = await fetch(`${apiBase}/events/${encodeURIComponent(slug)}/toggle-registration`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ open: nextState }),
              });

              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              updateToggleVisibilityBtn(nextState);
              showNotification(`✅ Đã ${nextState ? 'HIỆN' : 'ẨN'} nút đăng ký thành công!`, 'success');
            } catch (error) {
              updateToggleVisibilityBtn(isOpen);
              showNotification(`❌ Lỗi: ${error.message}`, 'error');
            }
          });
        }
      }

      const updateRegistration = async (id, data) => {
        setMessage('Đang cập nhật...', '');
        try {
          const response = await fetch(`${apiBase}/registrations/admin/${encodeURIComponent(String(id))}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
          }

          const updated = await response.json();
          await loadData();

          if (updated && updated.emailResult && updated.emailResult.sent === false) {
            setMessage(updated.emailResult.message || 'Cập nhật thành công nhưng gửi email thất bại.', 'error');
          } else if (updated && updated.emailResult && updated.emailResult.sent === true) {
            setMessage(updated.emailResult.message || 'Cập nhật thành công và đã gửi email.', 'success');
          } else {
            setMessage('Cập nhật thành công.', 'success');
          }
        } catch (error) {
          setMessage(`Cập nhật thất bại. ${error && error.message ? error.message : ''}`, 'error');
        }
      };

      tableBody.addEventListener('click', async (event) => {
        const target = event.target && event.target.closest
          ? event.target.closest('button[data-action][data-id]')
          : null;
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = Number(target.getAttribute('data-id'));
        if (!Number.isFinite(id)) return;

        const item = regState.items.find((entry) => entry.id === id);
        if (!item) return;

        if (action === 'approve') {
          await updateRegistration(id, { status: 'approved' });
          return;
        }

        if (action === 'approve-email') {
          await updateRegistration(id, { status: 'approved', sendEmail: true });
          return;
        }

        if (action === 'reject') {
          const reason = window.prompt('Nhập lý do từ chối (không bắt buộc):', item.rejectedReason || '');
          if (reason === null) return;
          await updateRegistration(id, { status: 'rejected', reason });
          return;
        }

        if (action === 'priority') {
          await updateRegistration(id, { priority: !item.priority });
        }
      });

      refreshBtn.addEventListener('click', () => {
        loadData();
      });

      applyFilterBtn.addEventListener('click', () => {
        loadData();
      });

      clearFilterBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (priorityFilter) priorityFilter.value = '';
        loadData();
      });

      exportBtn.addEventListener('click', () => {
        const params = buildQueryParams();
        const query = params.toString();
        const url = `${apiBase}/registrations/admin/export${query ? `?${query}` : ''}`;
        window.open(url, '_blank');
      });

      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          loadData();
        }
      });

      card.__huitRegistrationsLoad = loadData;
      return card;
    };

    const openRegistrationsInlinePanel = async () => {
      const card = ensureRegistrationsInlineCard();
      if (!card) return;

      registrationsUiState.isOpen = true;
      hideNativeCardsForRegistrations();
      card.style.display = 'flex';
      setRegistrationsSidebarActive(true);

      if (typeof card.__huitRegistrationsLoad === 'function') {
        await card.__huitRegistrationsLoad();
      }
    };

    const closeRegistrationsInlinePanel = () => {
      const card = document.getElementById('huit-admin-registrations-card');
      if (card) {
        card.style.display = 'none';
      }
      registrationsUiState.isOpen = false;
      setRegistrationsSidebarActive(false);
      restoreNativeCardsFromRegistrations();
    };

    const artistsExtraUiState = window.__huitArtistsExtraUiState || { isOpen: false };
    window.__huitArtistsExtraUiState = artistsExtraUiState;

    const setArtistsExtraSidebarActive = (active) => {
      const sidebarBtn = document.querySelector('[data-sidebar-artists-extra-btn="1"]');
      if (!sidebarBtn) return;
      sidebarBtn.className = active ? REG_SIDEBAR_ACTIVE_CLASS : REG_SIDEBAR_INACTIVE_CLASS;
      if (active) clearAllNativeSidebarActive();
    };

    const openArtistsExtraInlinePanel = async () => {
      const card = ensureArtistsExtraInlineCard();
      if (!card) return;

      artistsExtraUiState.isOpen = true;
      hideNativeCardsForRegistrations();
      card.style.display = 'flex';
      setArtistsExtraSidebarActive(true);

      if (typeof card.__huitArtistsExtraLoad === 'function') {
        await card.__huitArtistsExtraLoad();
      }
    };

    const closeArtistsExtraInlinePanel = () => {
      const card = document.getElementById('huit-admin-artists-extra-card');
      if (card) {
        card.style.display = 'none';
      }
      artistsExtraUiState.isOpen = false;
      setArtistsExtraSidebarActive(false);
      restoreNativeCardsFromRegistrations();
    };

    const ensureRegistrationsSidebarButton = (sidebarNav) => {
      if (!sidebarNav) return;

      let sidebarBtn = sidebarNav.querySelector('[data-registrations-manage-sidebar="1"]');
      if (!sidebarBtn) {
        sidebarBtn = document.createElement('button');
        sidebarBtn.type = 'button';
        sidebarBtn.setAttribute('data-registrations-manage-sidebar', '1');
        sidebarBtn.className = REG_SIDEBAR_INACTIVE_CLASS;
        sidebarBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="M8 8h8"></path>
            <path d="M8 12h8"></path>
            <path d="M8 16h5"></path>
          </svg>
          Quản lý đăng ký
        `;
        sidebarNav.prepend(sidebarBtn);

        // First timer: auto open
        if (!window.__huitInitialRegOpenDone) {
          window.__huitInitialRegOpenDone = true;
          setTimeout(() => {
            if (typeof openRegistrationsInlinePanel === 'function') openRegistrationsInlinePanel();
          }, 800);
        }
      } else {
        // Ensure always at the top (React might move it)
        if (sidebarNav.firstChild !== sidebarBtn) {
          sidebarNav.prepend(sidebarBtn);
        }
      }

      setRegistrationsSidebarActive(registrationsUiState.isOpen);

      if (sidebarNav.dataset.registrationsBound === '1') return;
      sidebarNav.dataset.registrationsBound = '1';

      sidebarNav.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const regBtn = target.closest('[data-registrations-manage-sidebar="1"]');
        if (regBtn) {
          event.preventDefault();
          event.stopPropagation();
          if (window.__huitArtistsExtraUiState && window.__huitArtistsExtraUiState.isOpen) closeArtistsExtraInlinePanel();
          openRegistrationsInlinePanel();
          return;
        }

        const artBtn = target.closest('[data-sidebar-artists-extra-btn="1"]');
        if (artBtn) {
          event.preventDefault();
          event.stopPropagation();
          if (window.__huitRegistrationsUiState && window.__huitRegistrationsUiState.isOpen) closeRegistrationsInlinePanel();
          openArtistsExtraInlinePanel();
          return;
        }

        const navControl = target.closest('button, a');
        if (!navControl) return;

        // Close our panels if clicking any OTHER sidebar button
        if (window.__huitRegistrationsUiState && window.__huitRegistrationsUiState.isOpen) closeRegistrationsInlinePanel();
        if (window.__huitArtistsExtraUiState && window.__huitArtistsExtraUiState.isOpen) closeArtistsExtraInlinePanel();
      }, true);
    };

    const simplifyHeaderActions = () => {
      const header = document.querySelector('header.sticky');
      if (!header) return;

      const actionWrap = header.querySelector('div:last-child');
      if (!actionWrap) return;

      actionWrap.querySelectorAll('button').forEach((btn) => {
        if (btn.getAttribute('data-admin-logout-btn') === '1') {
          btn.style.display = 'inline-flex';
          return;
        }
        btn.style.display = 'none';
      });

      if (!actionWrap.querySelector('[data-main-site-btn="1"]')) {
        const mainBtn = document.createElement('a');
        mainBtn.setAttribute('data-main-site-btn', '1');
        mainBtn.href = `${basePrefix}/`;
        mainBtn.textContent = 'Về trang chính';
        mainBtn.style.cssText = [
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'height:30px',
          'padding:0 12px',
          'border-radius:10px',
          'border:1px solid rgba(124, 58, 237, 0.45)',
          'background:rgba(124, 58, 237, 0.15)',
          'color:#e9d5ff',
          'font-size:12px',
          'font-weight:700',
          'text-decoration:none',
          'white-space:nowrap',
          'transition:all .2s ease'
        ].join(';');

        mainBtn.addEventListener('mouseenter', () => {
          mainBtn.style.background = 'rgba(124, 58, 237, 0.28)';
          mainBtn.style.transform = 'translateY(-1px)';
        });

        mainBtn.addEventListener('mouseleave', () => {
          mainBtn.style.background = 'rgba(124, 58, 237, 0.15)';
          mainBtn.style.transform = 'translateY(0)';
        });

        actionWrap.appendChild(mainBtn);
      }

      const headerRegistrationBtn = actionWrap.querySelector('[data-registrations-manage-btn="1"]');
      if (headerRegistrationBtn) {
        headerRegistrationBtn.remove();
      }

      const legacyArtistsExtraBtn = actionWrap.querySelector('[data-artists-extra-btn="1"]');
      if (legacyArtistsExtraBtn) {
        legacyArtistsExtraBtn.remove();
      }

      if (!actionWrap.querySelector('[data-admin-logout-btn="1"]')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.setAttribute('data-admin-logout-btn', '1');
        logoutBtn.textContent = 'Đăng xuất';
        logoutBtn.style.cssText = [
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'height:30px',
          'padding:0 12px',
          'margin-left:8px',
          'border-radius:10px',
          'border:1px solid rgba(239, 68, 68, 0.45)',
          'background:rgba(239, 68, 68, 0.12)',
          'color:#fecaca',
          'font-size:12px',
          'font-weight:700',
          'cursor:pointer',
          'white-space:nowrap',
          'transition:all .2s ease'
        ].join(';');

        logoutBtn.addEventListener('mouseenter', () => {
          logoutBtn.style.background = 'rgba(239, 68, 68, 0.22)';
          logoutBtn.style.transform = 'translateY(-1px)';
        });

        logoutBtn.addEventListener('mouseleave', () => {
          logoutBtn.style.background = 'rgba(239, 68, 68, 0.12)';
          logoutBtn.style.transform = 'translateY(0)';
        });

        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch(`${basePrefix}/api/admin/auth/logout`, {
              method: 'POST',
              credentials: 'include'
            });
          } catch (error) {
            console.warn('Logout request failed, redirecting anyway.', error);
          } finally {
            window.location.href = `${basePrefix}/api/admin/auth/login-page`;
          }
        });

        actionWrap.appendChild(logoutBtn);
      }

      const sidebarNav = document.querySelector('aside nav');
      ensureRegistrationsSidebarButton(sidebarNav);
    };

    const isSection3ArtistCard = (card) => {
      if (!card) return false;
      const titleNode = card.querySelector('[data-slot="card-title"]');
      const titleText = normalizeLooseText(titleNode?.textContent || '');
      return titleText.includes('section 3') && titleText.includes('nghe') && titleText.includes('si');
    };

    const ensureArtistSectionTabs = () => {
      const sidebarNav = document.querySelector('aside nav');
      if (!sidebarNav) return;

      const nativeArtistBtn = Array.from(sidebarNav.querySelectorAll('button, a'))
        .find(b => !b.dataset.huitArtistsExtra && !b.dataset.registrationsManageSidebar && normalizeLooseText(b.textContent).includes('nghe si'));

      if (nativeArtistBtn && !nativeArtistBtn.dataset.huitRenamed) {
        const textEl = Array.from(nativeArtistBtn.querySelectorAll('*'))
          .find(el => el.childNodes.length === 1 && normalizeLooseText(el.textContent).includes('nghe si')) || nativeArtistBtn;
        textEl.textContent = 'Nghệ sĩ 1';
        nativeArtistBtn.dataset.huitRenamed = '1';
      }

      ensureArtistsExtraSidebarButton(sidebarNav, nativeArtistBtn);
    };

    const ensureArtistsExtraSidebarButton = (sidebarNav, nativeBtn) => {
      if (!sidebarNav || sidebarNav.querySelector('[data-sidebar-artists-extra-btn="1"]')) return;

      const baseBtn = nativeBtn || Array.from(sidebarNav.querySelectorAll('button, a'))
        .find(b => normalizeLooseText(b.textContent).includes('nghe si'));
      if (!baseBtn) return;

      const btn = baseBtn.cloneNode(true);
      btn.setAttribute('data-sidebar-artists-extra-btn', '1');
      btn.dataset.huitArtistsExtra = '1';
      delete btn.dataset.huitRenamed;
      btn.removeAttribute('href');
      btn.style.marginTop = '4px';

      const textEl = Array.from(btn.querySelectorAll('*'))
        .find(el => el.childNodes.length === 1 && normalizeLooseText(el.textContent).includes('nghe si')) || btn;
      textEl.textContent = 'Nghệ sĩ 2';

      btn.className = REG_SIDEBAR_INACTIVE_CLASS;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openArtistsExtraInlinePanel();
      });

      baseBtn.parentNode.insertBefore(btn, baseBtn.nextSibling);

      Array.from(sidebarNav.querySelectorAll('button, a')).forEach(navItem => {
        if (!navItem.dataset.huitArtistsExtra && !navItem.dataset.registrationsManageSidebar && !navItem.dataset.huitBoundClose) {
          navItem.dataset.huitBoundClose = '1';
          navItem.addEventListener('click', () => {
            if (artistsExtraUiState.isOpen) closeArtistsExtraInlinePanel();
            if (registrationsUiState.isOpen) closeRegistrationsInlinePanel();
          });
        }
      });
    };


    const ensureArtistsExtraInlineCard = () => {
      let card = document.getElementById('huit-admin-artists-extra-card');
      const main = document.querySelector('main');
      if (!main) return null;

      if (card) {
        // Essential: Re-append if orphaned by React re-render
        if (card.parentElement !== main) {
          main.appendChild(card);
        }
        return card;
      }

      if (!card) {
        card = document.createElement('div');
        card.id = 'huit-admin-artists-extra-card';
        card.className = 'w-full rounded-xl border border-purple-800/30 bg-[#0f0929]/90 shadow-2xl p-6 mb-8';
        card.style.display = 'none';
        card.style.flexDirection = 'column';
        card.style.width = '100%';
        card.style.maxWidth = '100%';
        card.innerHTML = `
          <!-- Header Row -->
          <div class="flex flex-row items-center justify-between border-b border-purple-900/25 pb-5 mb-8 w-full">
            <div class="flex flex-col">
              <div class="text-xl font-bold text-white flex items-center gap-3">
                 <span class="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full"></span>
                 Section 3: Danh sách Nghệ sĩ
              </div>
              <p class="text-purple-300/40 text-[11px] mt-1.5 uppercase tracking-widest font-bold ml-4">Cấu hình danh sách nghệ sĩ 2 (Vùng phụ)</p>
            </div>
            <div class="flex items-center gap-4">
              <button type="button" class="huit-reg-btn" data-role="refresh-btn" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#9ca3af; font-size:11px; padding:9px 18px; border-radius:10px; font-weight:600;">
                Reset
              </button>
              <button type="button" class="huit-reg-btn success" data-role="save-btn" style="background:linear-gradient(135deg, #7c3aed, #0891b2); border:none; padding:11px 26px; font-weight:700; color:white; border-radius:12px; font-size:12.5px; box-shadow: 0 10px 25px -10px rgba(124, 58, 237, 0.6);">
                Save Changes
              </button>
            </div>
          </div>

          <!-- Content Part -->
          <div class="w-full">
            <div class="huit-artist-field" style="margin-bottom: 36px; max-width: 100%;">
              <label>Tiêu đề Section (Nghệ sĩ 2)</label>
              <input type="text" data-role="section-title-input" placeholder="Ví dụ: Sự Xuất Hiện Của Các Ngôi Sao" style="background:rgba(15,9,41,0.5); border:1px solid rgba(139,92,246,0.3); width: 100%;">
            </div>

            <div id="huit-artists-extra-list" class="space-y-8">
               <!-- Artist items will be injected here -->
            </div>

            <button type="button" data-role="add-btn" class="w-full py-7 mt-8 border-2 border-dashed border-purple-800/30 rounded-2xl text-purple-400 hover:text-purple-200 hover:border-purple-500/50 hover:bg-purple-600/5 transition-all flex items-center justify-center gap-2 font-bold text-sm bg-purple-900/10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Thêm nghệ sĩ mới vào danh sách
            </button>
          </div>
        `;
        main.appendChild(card);

        const listWrap = card.querySelector('#huit-artists-extra-list');
        const sectionTitleInput = card.querySelector('[data-role="section-title-input"]');
        let state = {
          sectionTitle: '',
          artists: [],
          loading: false,
          configUrl: '',
          resolvedSlug: ''
        };

        const renderItems = () => {
          listWrap.innerHTML = '';
          if (state.artists.length === 0) {
            listWrap.innerHTML = '<div style="text-align:center; padding:40px; color:rgba(139, 92, 246, 0.5);">Chưa có nghệ sĩ nào. Nhấn "+ Thêm nghệ sĩ" để bắt đầu.</div>';
            return;
          }

          state.artists.forEach((artist, index) => {
            const artistItem = document.createElement('div');
            artistItem.className = 'huit-artist-card';
            artistItem.innerHTML = `
              <div class="huit-artist-card-header">
                <div class="huit-artist-card-title">
                  <div class="p-1 px-1.5 bg-purple-800/30 rounded-lg text-purple-400" style="display:inline-flex; border:1px solid rgba(139,92,246,0.1); margin-right:8px;">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                  </div>
                  <span style="font-weight:700; color:#a78bfa; letter-spacing:1.5px; font-size:10px; opacity:0.8;">NGHỆ SĨ #${index + 1}</span>
                </div>
                <button type="button" class="p-1.5 text-red-500/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" data-role="delete-btn" title="Xóa">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
              <div class="huit-artist-grid">
                <!-- Left Column -->
                <div class="space-y-6">
                  <div class="huit-artist-field">
                    <label>Tên nghệ sĩ</label>
                    <input type="text" data-role="name" value="${artist.name || ''}" placeholder="VD: LyHan" style="background:rgba(20,14,48,0.4);">
                  </div>
                  <div class="huit-artist-field">
                    <label>Trạng thái</label>
                    <select data-role="status" style="background:rgba(20,14,48,0.4); cursor:pointer;">
                      <option value="revealed" ${artist.status === 'revealed' ? 'selected' : ''}>Đã công bố</option>
                      <option value="hidden" ${artist.status === 'hidden' ? 'selected' : ''}>Chưa công bố</option>
                    </select>
                  </div>
                   <div class="huit-artist-field">
                    <label>Mô tả / Tiểu sử</label>
                    <textarea data-role="description" rows="4" style="resize:none; background:rgba(20,14,48,0.4);" placeholder="Thảo Ly...">${artist.description || ''}</textarea>
                  </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-6">
                   <div class="huit-artist-field">
                    <label>Ảnh đại diện</label>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <div class="relative flex-1">
                         <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:rgba(139,92,246,0.3);">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </span>
                        <input type="text" data-role="image" value="${artist.image || ''}" style="padding-left:40px; background:rgba(20,14,48,0.4); border-color:rgba(139,92,246,0.15); color:rgba(255,255,255,0.7); font-size:12px;" placeholder="URL ảnh...">
                      </div>
                      <button type="button" class="huit-reg-btn" data-role="upload-btn" style="padding:10px 16px; display:flex; gap:6px; align-items:center; background:rgba(124,58,237,0.12); border:1px solid rgba(124,58,237,0.3); color:#e9d5ff; font-weight:700; border-radius:10px; font-size:11px;">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        Upload
                      </button>
                    </div>
                    <p style="font-size:10.5px; color:rgba(167,139,250,0.3); font-style:normal; margin-top:4px;">Khuyến nghị: ảnh tỉ lệ 3:4, kích thước 1200x1600 px, dung lượng <= 500KB (ưu tiên WebP).</p>
                  </div>

                  <!-- Preview Block Cloned Exactly -->
                  <div style="margin-top:16px; display:flex; gap:16px; padding:12px; background:rgba(0,0,0,0.2); border:1px solid rgba(139,92,246,0.1); border-radius:12px;">
                    <div style="position:relative; width:80px; height:80px; border-radius:10px; overflow:hidden; border:1px solid rgba(139,92,246,0.2);">
                       <img src="${artist.image || '/assets/images/placeholder-artist.webp'}" style="width:100%; height:100%; object-fit:cover;" alt="Preview" data-role="preview-img">
                    </div>
                    <div style="display:flex; flex-direction:column; justify-content:center;">
                      <div style="font-size:10px; font-weight:800; color:rgba(255,255,255,0.9); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">XEM TRƯỚC</div>
                      <div style="font-size:14px; font-weight:600; color:#ffffff; opacity:0.9;" data-role="preview-name">${artist.name || 'Tên nghệ sĩ'}</div>
                    </div>
                  </div>
                </div>
              </div>
            `;

            // Bind inputs back to state and update preview
            const previewImg = artistItem.querySelector('[data-role="preview-img"]');
            const previewName = artistItem.querySelector('[data-role="preview-name"]');

            artistItem.querySelectorAll('input, select, textarea').forEach(input => {
              input.addEventListener('input', () => {
                const role = input.dataset.role;
                if (role) {
                  artist[role] = input.value;
                  if (role === 'name' && previewName) previewName.textContent = input.value || 'Tên nghệ sĩ';
                  if (role === 'image' && previewImg) previewImg.src = input.value || '/assets/images/placeholder-artist.webp';
                }
              });
            });

            // Delete item
            artistItem.querySelector('[data-role="delete-btn"]').addEventListener('click', () => {
              state.artists.splice(index, 1);
              renderItems();
            });

            // Upload image
            const imageInput = artistItem.querySelector('[data-role="image"]');
            artistItem.querySelector('[data-role="upload-btn"]').addEventListener('click', () => {
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = 'image/*';
              fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('folder', 'assets/images/khachmoi');
                  const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data && data.url) {
                    imageInput.value = data.url;
                    artist.image = data.url;
                    if (previewImg) previewImg.src = data.url;
                    showNotification('✅ Đã tải ảnh lên.', 'success');
                  }
                } catch (err) {
                  showNotification('❌ Lỗi tải ảnh.', 'error');
                }
              };
              fileInput.click();
            });

            listWrap.appendChild(artistItem);
          });
        };

        const loadData = async () => {
          if (state.loading) return;
          state.loading = true;
          const slugCandidates = ['huit-fest-2026', 'fptu-fest-2026', 'huitu-fest-2026'];
          for (const slug of slugCandidates) {
            try {
              const res = await fetch(`/api/events/${slug}/config?_ts=${Date.now()}`, { credentials: 'include' });
              if (res.ok) {
                const json = await res.json();
                state.configUrl = `/api/events/${slug}/config`;
                state.resolvedSlug = slug;
                const raw = json.artistsExtra || { sectionTitle: '', artists: [] };
                state.sectionTitle = raw.sectionTitle || '';
                state.artists = Array.isArray(raw.artists) ? JSON.parse(JSON.stringify(raw.artists)) : [];
                sectionTitleInput.value = state.sectionTitle;
                renderItems();
                break;
              }
            } catch (e) { }
          }
          state.loading = false;
        };

        sectionTitleInput.addEventListener('change', () => {
          state.sectionTitle = sectionTitleInput.value;
        });

        card.querySelector('[data-role="add-btn"]').addEventListener('click', () => {
          state.artists.push({ id: `ax2-${Date.now()}`, name: '', image: '', status: 'revealed', description: '' });
          renderItems();
        });

        card.querySelector('[data-role="refresh-btn"]').addEventListener('click', loadData);

        card.querySelector('[data-role="save-btn"]').addEventListener('click', async () => {
          if (!state.configUrl) return;
          const btn = card.querySelector('[data-role="save-btn"]');
          btn.disabled = true;
          btn.textContent = 'Đang lưu...';

          try {
            const configRes = await fetch(state.configUrl, { credentials: 'include' });
            const currentConfig = await configRes.json();

            const payload = {
              ...currentConfig,
              artistsExtra: {
                sectionTitle: state.sectionTitle,
                artists: state.artists.map(a => ({
                  id: a.id,
                  name: a.name,
                  image: a.image,
                  status: a.status,
                  description: a.description,
                  hints: []
                }))
              }
            };

            const putRes = await fetch(state.configUrl, {
              method: 'PUT',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (putRes.ok) {
              showNotification('✅ Đã lưu Danh sách nghệ sĩ 2.', 'success');
            } else {
              throw new Error('Save failed');
            }
          } catch (e) {
            showNotification('❌ Lỗi khi lưu dữ liệu.', 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = 'Lưu thay đổi';
          }
        });

        card.__huitArtistsExtraLoad = loadData;
      } else if (card.parentElement !== mainContent) {
        mainContent.appendChild(card);
      }
      return card;
    };

    const setInputValueAndDispatch = (inputEl, nextValue) => {
      const prototype = Object.getPrototypeOf(inputEl);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (descriptor && typeof descriptor.set === 'function') {
        descriptor.set.call(inputEl, nextValue);
      } else {
        inputEl.value = nextValue;
      }

      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const resolveUploadFolderForInput = (inputEl) => {
      const card = inputEl.closest('[data-slot="card"]');
      const titleNode = card ? card.querySelector('[data-slot="card-title"]') : null;
      const titleText = (titleNode?.textContent || '').toLowerCase();

      if (titleText.includes('footer') || titleText.includes('sponsor')) {
        return 'assets/images/sponsors';
      }
      if (titleText.includes('section 2')) {
        return 'assets/images/banner';
      }
      return 'assets/images/logo';
    };

    // Tìm tất cả input có label "Logo URL"
    const injectUploadButtons = () => {
      // Tìm tất cả các Logo URL inputs
      const logoInputs = Array.from(document.querySelectorAll('input'))
        .filter(input => {
          const label = input.previousElementSibling;
          return label && label.textContent &&
            (label.textContent.includes('Logo URL') ||
              label.textContent.includes('Logo url') ||
              label.textContent.toLowerCase().includes('logo'));
        });

      console.log(`Found ${logoInputs.length} logo URL inputs`);

      logoInputs.forEach(input => {
        // Kiểm tra xem đã có nút upload chưa
        if (input.dataset.uploadInjected) return;
        input.dataset.uploadInjected = 'true';

        // Tạo nút chọn file (icon thư mục)
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.innerHTML = '📁 Chọn file';
        uploadBtn.style.cssText = `
          margin-left: 8px;
          padding: 6px 12px;
          background: rgba(124, 58, 237, 0.16);
          color: #e9d5ff;
          border: 1px solid rgba(147, 51, 234, 0.35);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        `;

        uploadBtn.addEventListener('mouseenter', () => {
          uploadBtn.style.transform = 'translateY(-2px)';
          uploadBtn.style.boxShadow = '0 4px 12px rgba(147, 51, 234, 0.25)';
          uploadBtn.style.background = 'rgba(124, 58, 237, 0.24)';
        });

        uploadBtn.addEventListener('mouseleave', () => {
          uploadBtn.style.transform = 'translateY(0)';
          uploadBtn.style.boxShadow = 'none';
          uploadBtn.style.background = 'rgba(124, 58, 237, 0.16)';
        });

        // Tạo input file ẩn
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        // Xử lý upload
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          uploadBtn.disabled = true;
          uploadBtn.innerHTML = '⏳ Đang tải...';

          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', resolveUploadFolderForInput(input));

            const response = await fetch('/api/upload/image', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();

            // Set URL vào input theo cách React có thể bắt được state update.
            setInputValueAndDispatch(input, data.url);

            // Success feedback
            uploadBtn.innerHTML = '✅ Đã chọn';
            setTimeout(() => {
              uploadBtn.innerHTML = '📁 Chọn file';
            }, 2000);

            // Show notification
            showNotification('✅ Upload thành công!', 'success');

          } catch (error) {
            console.error('Upload error:', error);
            uploadBtn.innerHTML = '❌ Lỗi';
            setTimeout(() => {
              uploadBtn.innerHTML = '📁 Chọn file';
            }, 2000);
            showNotification('❌ Upload thất bại: ' + error.message, 'error');
          } finally {
            uploadBtn.disabled = false;
            fileInput.value = ''; // Reset
          }
        });

        uploadBtn.addEventListener('click', () => {
          fileInput.click();
        });

        // Chèn nút và file input
        input.parentNode.style.position = 'relative';
        input.parentNode.style.display = 'flex';
        input.parentNode.style.alignItems = 'center';
        input.style.flex = '1';

        input.after(uploadBtn);
        uploadBtn.after(fileInput);
      });
    };

    // Notification helper
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ${type === 'success' ? 'background: #4caf50;' : 'background: #f44336;'}
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // Add animations
    if (!document.getElementById('upload-injector-styles')) {
      const style = document.createElement('style');
      style.id = 'upload-injector-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const runEnhancements = () => {
      injectUploadButtons();
      simplifyHeaderActions();
      ensureArtistSectionTabs();
      bindLivePreview();
      normalizeExistingPreviewUrls();
      syncJourneyPreview();
      enforceSingleSectionPreview();

      // Ensure panels stay visible/hidden if React re-renders main content
      const regsOpen = window.__huitRegistrationsUiState && window.__huitRegistrationsUiState.isOpen;
      const artistsOpen = window.__huitArtistsExtraUiState && window.__huitArtistsExtraUiState.isOpen;

      if (regsOpen || artistsOpen) {
        if (typeof hideNativeCardsForRegistrations === 'function') hideNativeCardsForRegistrations();
        if (typeof clearAllNativeSidebarActive === 'function') clearAllNativeSidebarActive();
        
        if (regsOpen && typeof ensureRegistrationsInlineCard === 'function') ensureRegistrationsInlineCard();
        if (artistsOpen && typeof ensureArtistsExtraInlineCard === 'function') ensureArtistsExtraInlineCard();
      }

      // Update Header Title
      const headerH2 = document.querySelector('header h2');
      if (headerH2 && (headerH2.textContent === 'Landing Page Editor' || headerH2.textContent === 'Landing Page EditorZ')) {
        headerH2.textContent = 'Chào mừng bạn đến với Trang Quản trị HUIT Fest';
      }
    };

    let refreshTimer = null;
    const scheduleEnhancements = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      // Debounce to wait for React/Next DOM updates before touching nodes.
      refreshTimer = setTimeout(runEnhancements, 90);
    };

    // Run once after the current render cycle.
    scheduleEnhancements();

    // Re-inject khi có thay đổi DOM (cho dynamic content)
    const observer = new MutationObserver(() => {
      scheduleEnhancements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Re-run when user switches section via sidebar/header controls.
    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest('nav button, header button, [data-slot="card"] button')
        : null;
      if (!target) return;
      scheduleEnhancements();
    }, true);

    console.log('✅ Upload buttons injected');
  }

  // Init khi DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
