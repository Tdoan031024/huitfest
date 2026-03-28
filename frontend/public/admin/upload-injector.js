/**
 * Admin Upload Button Injector
 * Script này sẽ inject nút upload vào trang admin panel
 * Thêm vào head của admin/index.html
 */

(function() {
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
      `;

      document.head.appendChild(responsiveStyle);
    };

    injectResponsiveStyles();

    const simplifyHeaderActions = () => {
      const header = document.querySelector('header.sticky');
      if (!header) return;

      const runningUnderNodeApi = window.location.pathname === '/nodeapi' || window.location.pathname.startsWith('/nodeapi/');
      const basePrefix = runningUnderNodeApi ? '/nodeapi' : '';

      const actionWrap = header.querySelector('div:last-child');
      if (!actionWrap) return;

      // Hide default admin action buttons (Preview/Export/Import/Reset)
      actionWrap.querySelectorAll('button').forEach((btn) => {
        if (btn.getAttribute('data-admin-logout-btn') === '1') {
          btn.style.display = 'inline-flex';
          return;
        }
        btn.style.display = 'none';
      });

      // Keep only one button to open the main site
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

      const legacyArtistsExtraBtn = actionWrap.querySelector('[data-artists-extra-btn="1"]');
      if (legacyArtistsExtraBtn) {
        legacyArtistsExtraBtn.remove();
      }

      // Add logout button
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
            await fetch('/api/admin/auth/logout', {
              method: 'POST',
              credentials: 'include'
            });
          } catch (error) {
            console.warn('Logout request failed, redirecting anyway.', error);
          } finally {
            window.location.href = '/api/admin/auth/login-page';
          }
        });

        actionWrap.appendChild(logoutBtn);
      }
    };

    const isSection3ArtistCard = (card) => {
      if (!card) return false;
      const titleNode = card.querySelector('[data-slot="card-title"]');
      const titleText = normalizeLooseText(titleNode?.textContent || '');
      return titleText.includes('section 3') && titleText.includes('nghe') && titleText.includes('si');
    };

    const ensureArtistSectionTabs = () => {
      const artistCard = Array.from(document.querySelectorAll('[data-slot="card"]')).find(isSection3ArtistCard);
      if (!artistCard) return;

      const contentWrap = artistCard.querySelector('[data-slot="card-content"]');
      if (!contentWrap) return;

      const runningUnderNodeApi = window.location.pathname === '/nodeapi' || window.location.pathname.startsWith('/nodeapi/');
      const basePrefix = runningUnderNodeApi ? '/nodeapi' : '';

      const normalizeText = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      const tabState = window.__huitArtistTabsState || {
        activeTab: 'list1',
        list1Snapshot: null,
        list1Original: null,
        list2Snapshot: null,
        list2Original: null,
        configUrl: '',
        resolvedSlug: '',
        isSwitching: false,
      };
      window.__huitArtistTabsState = tabState;

      const deepClone = (obj) => {
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch (error) {
          return obj;
        }
      };

      const wait = (ms) => new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

      const findControlByLabel = (rootEl, pattern, selector = 'input,textarea,select') => {
        if (!rootEl) return null;
        const labels = Array.from(rootEl.querySelectorAll('label'));
        const target = labels.find((label) => pattern.test(normalizeText(label.textContent || '')));
        if (!target) return null;

        const parent = target.parentElement;
        if (parent) {
          const direct = parent.querySelector(selector);
          if (direct) return direct;
        }

        let sibling = target.nextElementSibling;
        while (sibling) {
          if (sibling.matches(selector)) return sibling;
          const nested = sibling.querySelector(selector);
          if (nested) return nested;
          sibling = sibling.nextElementSibling;
        }
        return null;
      };

      const getSectionTitleInput = () => {
        return findControlByLabel(contentWrap, /tieu de section/, 'input');
      };

      const getAddArtistButton = () => {
        return Array.from(contentWrap.querySelectorAll('button'))
          .find((btn) => normalizeText(btn.textContent || '').includes('them nghe si')) || null;
      };

      const getArtistCardRoots = () => {
        const pushUniqueRoot = (bucket, node) => {
          if (!node || bucket.includes(node)) return;
          bucket.push(node);
        };

        const rootsFromDeleteButtons = [];
        const deleteButtons = Array.from(contentWrap.querySelectorAll('button'))
          .filter((btn) => /text-red|red-/.test(btn.className || ''));

        deleteButtons.forEach((btn) => {
          let current = btn.parentElement;
          while (current && current !== contentWrap) {
            const text = normalizeText(current.textContent || '');
            if (text.includes('ten nghe si') && text.includes('trang thai') && text.includes('mo ta')) {
              pushUniqueRoot(rootsFromDeleteButtons, current);
              break;
            }
            current = current.parentElement;
          }
        });

        const rootsFromNameInputs = [];
        const nameInputs = Array.from(contentWrap.querySelectorAll('input'))
          .filter((input) => {
            const fieldText = normalizeText(input.parentElement?.textContent || '');
            return fieldText.includes('ten nghe si');
          });

        nameInputs.forEach((input) => {
          let current = input.parentElement;
          while (current && current !== contentWrap) {
            const text = normalizeText(current.textContent || '');
            if (text.includes('ten nghe si') && text.includes('trang thai')) {
              pushUniqueRoot(rootsFromNameInputs, current);
              break;
            }
            current = current.parentElement;
          }
        });

        const roots = rootsFromDeleteButtons.length > 0
          ? rootsFromDeleteButtons
          : rootsFromNameInputs;

        return roots.sort((a, b) => {
          if (a === b) return 0;
          const pos = a.compareDocumentPosition(b);
          return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });
      };

      const getDeleteButtonFromCard = (cardRoot) => {
        if (!cardRoot) return null;
        const buttons = Array.from(cardRoot.querySelectorAll('button'));
        const redBtn = buttons.find((btn) => /text-red|red-/.test(btn.className || ''));
        if (redBtn) return redBtn;
        return buttons.find((btn) => normalizeText(btn.textContent || '') === '') || null;
      };

      const extractArtistFormState = () => {
        const sectionTitleInput = getSectionTitleInput();
        const cards = getArtistCardRoots();

        const artists = cards.map((cardRoot, index) => {
          const nameInput = findControlByLabel(cardRoot, /ten nghe si/, 'input');
          const imageInput = findControlByLabel(cardRoot, /anh dai dien|anh nghe si|image/, 'input');
          const statusSelect = findControlByLabel(cardRoot, /trang thai/, 'select');
          const descInput = findControlByLabel(cardRoot, /mo ta|tieu su/, 'textarea');

          return {
            id: `ax-${index + 1}`,
            name: nameInput ? String(nameInput.value || '') : '',
            image: imageInput ? String(imageInput.value || '') : '',
            status: statusSelect ? String(statusSelect.value || 'revealed') : 'revealed',
            description: descInput ? String(descInput.value || '') : '',
          };
        });

        return {
          sectionTitle: sectionTitleInput ? String(sectionTitleInput.value || '') : '',
          artists,
        };
      };

      const syncArtistCardCount = async (targetCount) => {
        const safeCount = Math.max(0, Number(targetCount || 0));
        const addBtn = getAddArtistButton();

        if (addBtn) {
          let guard = 0;
          while (getArtistCardRoots().length < safeCount && guard < 20) {
            addBtn.click();
            guard += 1;
            await wait(50);
          }
        }

        let removeGuard = 0;
        while (getArtistCardRoots().length > safeCount && removeGuard < 40) {
          const cards = getArtistCardRoots();
          const lastCard = cards[cards.length - 1];
          const deleteBtn = getDeleteButtonFromCard(lastCard);
          if (!deleteBtn) break;
          deleteBtn.click();
          removeGuard += 1;
          await wait(40);
        }
      };

      const applyArtistFormState = async (state) => {
        const nextState = state && typeof state === 'object'
          ? state
          : { sectionTitle: '', artists: [] };

        const artists = Array.isArray(nextState.artists) ? nextState.artists : [];
        await syncArtistCardCount(artists.length);

        const sectionTitleInput = getSectionTitleInput();
        if (sectionTitleInput) {
          setInputValueAndDispatch(sectionTitleInput, String(nextState.sectionTitle || ''));
        }

        const cards = getArtistCardRoots();
        cards.forEach((cardRoot, index) => {
          const artist = artists[index] || {
            name: '', image: '', description: '', status: 'revealed',
          };

          const nameInput = findControlByLabel(cardRoot, /ten nghe si/, 'input');
          const imageInput = findControlByLabel(cardRoot, /anh dai dien|anh nghe si|image/, 'input');
          const statusSelect = findControlByLabel(cardRoot, /trang thai/, 'select');
          const descInput = findControlByLabel(cardRoot, /mo ta|tieu su/, 'textarea');

          if (nameInput) {
            setInputValueAndDispatch(nameInput, String(artist.name || ''));
          }
          if (imageInput) {
            setInputValueAndDispatch(imageInput, String(artist.image || artist.imageUrl || ''));
          }
          if (statusSelect) {
            setInputValueAndDispatch(statusSelect, String(artist.status || 'revealed'));
          }
          if (descInput) {
            setInputValueAndDispatch(descInput, String(artist.description || ''));
          }
        });

        await wait(20);
      };

      const normalizeArtistsExtra = (raw) => {
        const source = raw && typeof raw === 'object' ? raw : {};
        const items = Array.isArray(source.artists) ? source.artists : [];
        return {
          sectionTitle: String(source.sectionTitle || ''),
          artists: items.map((artist, index) => ({
            id: String(artist?.id || `ax2-${index + 1}`),
            name: String(artist?.name || ''),
            image: String(artist?.image || artist?.imageUrl || ''),
            description: String(artist?.description || ''),
            status: String(artist?.status || 'revealed'),
          })),
        };
      };

      const fetchArtistsExtraConfig = async () => {
        const slugCandidates = ['huit-fest-2026', 'fptu-fest-2026', 'huitu-fest-2026'];
        const candidates = tabState.resolvedSlug
          ? [tabState.resolvedSlug, ...slugCandidates.filter((item) => item !== tabState.resolvedSlug)]
          : slugCandidates;

        for (let idx = 0; idx < candidates.length; idx += 1) {
          const slug = candidates[idx];
          const url = `${basePrefix}/api/events/${encodeURIComponent(slug)}/config`;

          try {
            const response = await fetch(`${url}?_ts=${Date.now()}`, {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            });
            if (!response.ok) {
              continue;
            }

            const json = await response.json();
            tabState.configUrl = url;
            tabState.resolvedSlug = slug;

            const next = normalizeArtistsExtra(json?.artistsExtra);
            tabState.list2Snapshot = deepClone(next);
            tabState.list2Original = deepClone(next);
            return true;
          } catch (error) {
            // Continue to next candidate slug.
          }
        }

        return false;
      };

      const saveArtistsExtraFromForm = async () => {
        if (!tabState.configUrl) {
          const loaded = await fetchArtistsExtraConfig();
          if (!loaded || !tabState.configUrl) {
            showNotification('❌ Không tải được cấu hình artistsExtra để lưu.', 'error');
            return false;
          }
        }

        const latestResponse = await fetch(`${tabState.configUrl}?_ts=${Date.now()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!latestResponse.ok) {
          showNotification(`❌ Không đọc được config trước khi lưu (HTTP ${latestResponse.status}).`, 'error');
          return false;
        }

        const latestConfig = await latestResponse.json();
        const currentForm = extractArtistFormState();
        const payload = {
          ...latestConfig,
          artistsExtra: {
            sectionTitle: String(currentForm.sectionTitle || ''),
            artists: currentForm.artists.map((artist, index) => ({
              id: String(artist.id || `ax2-${index + 1}`),
              name: String(artist.name || ''),
              image: String(artist.image || ''),
              description: String(artist.description || ''),
              status: String(artist.status || 'revealed'),
              hints: [],
            })),
          },
        };

        const putResponse = await fetch(tabState.configUrl, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!putResponse.ok) {
          showNotification(`❌ Lưu artistsExtra thất bại (HTTP ${putResponse.status}).`, 'error');
          return false;
        }

        tabState.list2Snapshot = deepClone(payload.artistsExtra);
        tabState.list2Original = deepClone(payload.artistsExtra);
        try {
          localStorage.setItem('landingPageData.public.v2', JSON.stringify(payload));
        } catch (error) {}

        showNotification('✅ Đã lưu Danh sách nghệ sĩ 2.', 'success');
        return true;
      };

      let tabsBar = contentWrap.querySelector('[data-artists-tabs-wrap="1"]');
      if (!tabsBar) {
        tabsBar = document.createElement('div');
        tabsBar.className = 'huit-artist-tabs';
        tabsBar.setAttribute('data-artists-tabs-wrap', '1');
        tabsBar.innerHTML = `
          <button type="button" class="huit-artist-tab-btn active" data-artist-tab="list1">Danh sách nghệ sĩ 1</button>
          <button type="button" class="huit-artist-tab-btn" data-artist-tab="list2">Danh sách nghệ sĩ 2</button>
        `;
        contentWrap.insertBefore(tabsBar, contentWrap.firstChild);
      }

      const headerActions = artistCard.querySelector('[data-slot="card-header"] > div:last-child');
      const actionButtons = headerActions ? Array.from(headerActions.querySelectorAll('button')) : [];
      const resetBtn = actionButtons.find((btn) => normalizeText(btn.textContent || '').includes('reset'));
      const saveBtn = actionButtons.find((btn) => normalizeText(btn.textContent || '').includes('save'));

      if (saveBtn && saveBtn.dataset.huitTab2SaveBound !== '1') {
        saveBtn.dataset.huitTab2SaveBound = '1';
        saveBtn.addEventListener('click', async (event) => {
          if (tabState.activeTab !== 'list2') {
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();
          saveBtn.disabled = true;
          try {
            await saveArtistsExtraFromForm();
          } finally {
            saveBtn.disabled = false;
          }
        }, true);
      }

      if (resetBtn && resetBtn.dataset.huitTab2ResetBound !== '1') {
        resetBtn.dataset.huitTab2ResetBound = '1';
        resetBtn.addEventListener('click', async (event) => {
          if (tabState.activeTab !== 'list2') {
            return;
          }
          event.preventDefault();
          event.stopImmediatePropagation();

          const source = tabState.list2Original || { sectionTitle: '', artists: [] };
          tabState.list2Snapshot = deepClone(source);
          await applyArtistFormStateWithRetry(source);
          showNotification('✅ Đã reset Danh sách nghệ sĩ 2.', 'success');
        }, true);
      }

      const updateTabButtonState = (activeTab) => {
        tabsBar.querySelectorAll('[data-artist-tab]').forEach((btn) => {
          const isActive = btn.getAttribute('data-artist-tab') === activeTab;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      };

      const applyArtistFormStateWithRetry = async (state) => {
        await applyArtistFormState(state);
        // Some React-controlled inputs render late after section switch; apply again to prevent mixed tab data.
        await wait(120);
        await applyArtistFormState(state);
      };

      const setArtistTabState = async (activeTab) => {
        const nextTab = activeTab === 'list2' ? 'list2' : 'list1';
        const isInitialized = contentWrap.dataset.artistTabInitialized === '1';

        if (!tabState.list1Snapshot) {
          // Tab 1 binds to current section-3 form state (artists).
          const currentArtists = extractArtistFormState();
          tabState.list1Snapshot = deepClone(currentArtists);
          tabState.list1Original = deepClone(currentArtists);
        }

        if (tabState.isSwitching) {
          return;
        }

        const previousTab = tabState.activeTab || 'list1';
        if (isInitialized && previousTab === nextTab) {
          updateTabButtonState(nextTab);
          contentWrap.dataset.artistActiveTab = nextTab;
          return;
        }

        tabState.isSwitching = true;
        try {
          contentWrap.dataset.artistActiveTab = nextTab;

          if (isInitialized) {
            if (previousTab === 'list1') {
              tabState.list1Snapshot = extractArtistFormState();
            }
            if (previousTab === 'list2') {
              tabState.list2Snapshot = extractArtistFormState();
            }
          }

          tabState.activeTab = nextTab;

          if (nextTab === 'list2') {
            if (!tabState.list2Snapshot) {
              const loaded = await fetchArtistsExtraConfig();
              if (!loaded) {
                tabState.list2Snapshot = { sectionTitle: '', artists: [] };
                tabState.list2Original = deepClone(tabState.list2Snapshot);
              }
            }
            await applyArtistFormStateWithRetry(tabState.list2Snapshot || { sectionTitle: '', artists: [] });
          } else {
            await applyArtistFormStateWithRetry(tabState.list1Snapshot || { sectionTitle: '', artists: [] });
          }

          contentWrap.dataset.artistTabInitialized = '1';
          updateTabButtonState(nextTab);
        } finally {
          tabState.isSwitching = false;
        }
      };

      tabsBar.querySelectorAll('[data-artist-tab]').forEach((btn) => {
        if (btn.dataset.boundClick === '1') return;
        btn.dataset.boundClick = '1';
        btn.addEventListener('click', async () => {
          const tab = btn.getAttribute('data-artist-tab') || 'list1';
          await setArtistTabState(tab);
        });
      });

      const activeTab = tabState.activeTab || contentWrap.dataset.artistActiveTab || 'list1';
      setArtistTabState(activeTab);
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
