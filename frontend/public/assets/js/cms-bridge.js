(function() {
  const STORAGE_KEY = 'landingPageData.public.v2';

  const EVENT_SLUG_CANDIDATES = ['huit-fest-2026', 'fptu-fest-2026', 'huitu-fest-2026'];
  let resolvedApiUrl = null;
  let countdownTimer = null;
  let activeLoadSeq = 0;
  let hasInitialized = false;
  let lastValidArtists = [];
  let lastRenderedArtistSlots = [];
  let lastRenderedArtistsBySlot = Object.create(null);
  let swipers = [];

  function initArtistSwiper() {
    // Wait for Swiper to be available
    if (typeof Swiper === 'undefined') {
      setTimeout(initArtistSwiper, 100);
      return;
    }

    const selectors = ['[data-guest-strip]', '[data-guest-strip-extra]'];
    selectors.forEach(selector => {
      const el = document.querySelector(selector);
      if (!el || !el.classList.contains('swiper')) return;

      // Only init if visible or after a short delay
      if (el.swiper) el.swiper.destroy(true, true);

      const swiper = new Swiper(el, {
        slidesPerView: 2,
        spaceBetween: 10,
        centeredSlides: false,
        loop: true,
        grabCursor: true,
        preventClicks: false,
        autoplay: {
          delay: 3500,
          disableOnInteraction: false,
        },
        breakpoints: {
          768: {
            slidesPerView: 4,
            spaceBetween: 20,
            autoplay: false
          },
          1024: {
            slidesPerView: 5,
            spaceBetween: 25,
            autoplay: false
          }
        },
        on: {
          click: function(s, e) {
            const card = e.target.closest('.music-guest-card');
            if (!card) return;
            
            const guestId = card.getAttribute('data-guest-id');
            const isDuplicate = card.closest('.swiper-slide-duplicate');
            
            if (isDuplicate && guestId) {
              const masterCard = s.el.querySelector(`.music-guest-card[data-guest-id="${guestId}"]:not(.swiper-slide-duplicate)`);
              if (masterCard) {
                 masterCard.click();
              }
            }
            
            // Sync all visual states after any change
            setTimeout(() => {
              const masterCard = s.el.querySelector(`.music-guest-card[data-guest-id="${guestId}"]:not(.swiper-slide-duplicate)`);
              if (!masterCard) return;
              const isActive = masterCard.classList.contains('is-active');
              s.el.querySelectorAll(`.music-guest-card[data-guest-id="${guestId}"]`).forEach(el => {
                el.classList.toggle('is-active', isActive);
              });
            }, 50);
          }
        }
      });
    });
  }

  function clearCountdownTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function disableTemplateCountdownEngine() {
    const countdownRoot = document.getElementById('COUNTDOWN6');
    if (!countdownRoot) {
      return;
    }

    // Disable LadiPage default countdown runner (it relies on these attrs).
    countdownRoot.removeAttribute('data-type');
    countdownRoot.removeAttribute('data-minute');
    countdownRoot.removeAttribute('data-endtime');
    countdownRoot.removeAttribute('data-daily-start');
    countdownRoot.removeAttribute('data-daily-end');

    ['COUNTDOWN_ITEM21', 'COUNTDOWN_ITEM22', 'COUNTDOWN_ITEM23', 'COUNTDOWN_ITEM24'].forEach((id) => {
      const item = document.getElementById(id);
      if (item) {
        item.removeAttribute('data-item-type');
      }
    });
  }

  function ensureCountdownSpanOnly() {
    const textEls = document.querySelectorAll('#COUNTDOWN6 .ladi-countdown-text');
    textEls.forEach((textEl) => {
      let span = textEl.querySelector('span');
      if (!span) {
        span = document.createElement('span');
      }
      // Remove duplicated text layers and keep one span only.
      textEl.innerHTML = '';
      textEl.appendChild(span);
    });
  }

  function toggleCountdownByData(countdownData) {
    const group = document.getElementById('GROUP245');
    const hasTarget = !!(countdownData && countdownData.targetDate && !Number.isNaN(new Date(countdownData.targetDate).getTime()));

    if (!hasTarget) {
      clearCountdownTimer();
      if (group) {
        group.style.display = 'none';
      }
      return false;
    }

    if (group) {
      group.style.display = '';
    }

    disableTemplateCountdownEngine();
    ensureCountdownSpanOnly();
    return true;
  }

  function pad2(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function startCountdown(targetDate) {
    disableTemplateCountdownEngine();
    ensureCountdownSpanOnly();

    const dayEl = document.querySelector('#COUNTDOWN_ITEM21 .ladi-countdown-text span');
    const hourEl = document.querySelector('#COUNTDOWN_ITEM22 .ladi-countdown-text span');
    const minuteEl = document.querySelector('#COUNTDOWN_ITEM23 .ladi-countdown-text span');
    const secondEl = document.querySelector('#COUNTDOWN_ITEM24 .ladi-countdown-text span');

    if (!dayEl || !hourEl || !minuteEl || !secondEl) {
      return;
    }

    const targetMs = new Date(targetDate).getTime();
    if (Number.isNaN(targetMs)) {
      return;
    }

    clearCountdownTimer();

    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        dayEl.textContent = '00';
        hourEl.textContent = '00';
        minuteEl.textContent = '00';
        secondEl.textContent = '00';
        clearCountdownTimer();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      dayEl.textContent = pad2(days);
      hourEl.textContent = pad2(hours);
      minuteEl.textContent = pad2(minutes);
      secondEl.textContent = pad2(seconds);
    };

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function removeIdsDeep(rootEl) {
    if (!rootEl || rootEl.nodeType !== 1) {
      return;
    }
    rootEl.removeAttribute('id');
    rootEl.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  }

  function copyComputedStylesDeep(sourceEl, targetEl) {
    if (!sourceEl || !targetEl || sourceEl.nodeType !== 1 || targetEl.nodeType !== 1) {
      return;
    }

    const style = window.getComputedStyle(sourceEl);
    const keys = [
      'position', 'display', 'width', 'height', 'top', 'left', 'right', 'bottom',
      'zIndex', 'overflow', 'boxSizing', 'padding', 'paddingTop', 'paddingRight',
      'paddingBottom', 'paddingLeft', 'margin', 'border', 'borderRadius',
      'background', 'backgroundColor', 'backgroundImage', 'backgroundPosition',
      'backgroundSize', 'backgroundRepeat', 'fontFamily', 'fontSize', 'fontWeight',
      'lineHeight', 'letterSpacing', 'textAlign', 'color', 'whiteSpace', 'opacity'
    ];

    keys.forEach((key) => {
      targetEl.style[key] = style[key];
    });

    const sourceChildren = sourceEl.children;
    const targetChildren = targetEl.children;
    const len = Math.min(sourceChildren.length, targetChildren.length);
    for (let i = 0; i < len; i += 1) {
      copyComputedStylesDeep(sourceChildren[i], targetChildren[i]);
    }
  }

  function cloneWithInlineStyles(templateEl) {
    const clone = templateEl.cloneNode(true);
    copyComputedStylesDeep(templateEl, clone);
    removeIdsDeep(clone);
    return clone;
  }

  function ensureTimelineImageFxStyles() {
    if (document.getElementById('timeline-image-fx-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'timeline-image-fx-style';
    style.textContent = `
      .timeline-side-image-frame {
        position: absolute;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid rgba(167, 214, 255, 0.48);
        box-shadow: 0 20px 34px rgba(5, 14, 46, 0.5), 0 0 24px rgba(115, 146, 255, 0.26);
        background: linear-gradient(145deg, rgba(18, 26, 71, 0.72), rgba(13, 18, 52, 0.88));
        animation: timelineImageFloat 6.4s ease-in-out infinite;
        transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        z-index: 4;
      }

      .timeline-side-image-frame::before {
        content: "";
        position: absolute;
        inset: -1px;
        background: linear-gradient(130deg, rgba(116, 222, 255, 0.22), rgba(202, 154, 255, 0.2) 45%, rgba(63, 125, 255, 0.24));
        pointer-events: none;
        z-index: 1;
      }

      .timeline-side-image-bg {
        border-radius: inherit;
        clip-path: inset(0 round 18px);
        filter: saturate(1.05) contrast(1.02);
        z-index: 2;
      }

      .timeline-side-image-frame:hover {
        transform: translateY(-3px) scale(1.012);
        border-color: rgba(180, 228, 255, 0.7);
        box-shadow: 0 24px 38px rgba(5, 14, 46, 0.6), 0 0 36px rgba(146, 165, 255, 0.34);
      }

      @keyframes timelineImageFloat {
        0% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
        100% { transform: translateY(0); }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureFooterLogoMarqueeStyles() {
    if (document.getElementById('cms-footer-logo-marquee-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'cms-footer-logo-marquee-style';
    style.textContent = `
      .cms-footer-logo-marquee {
        position: absolute;
        left: 0;
        right: 0;
        overflow: hidden;
        z-index: 2;
        padding: 0 34px;
      }

      .cms-footer-logo-track {
        display: flex;
        align-items: center;
        gap: 30px;
        width: max-content;
        white-space: nowrap;
        will-change: transform;
        animation: cmsFooterLogoSlideRight var(--cms-footer-speed, 28s) linear infinite;
      }

      .cms-footer-logo-item {
        width: 172px;
        min-width: 172px;
        height: 98px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .cms-footer-logo-item img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
      }

      @keyframes cmsFooterLogoSlideRight {
        from { transform: translateX(-50%); }
        to { transform: translateX(0%); }
      }

      @media (max-width: 767px) {
        .cms-footer-logo-marquee {
          padding: 0 14px;
        }

        .cms-footer-logo-track {
          gap: 18px;
        }

        .cms-footer-logo-item {
          width: 124px;
          min-width: 124px;
          height: 72px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function sanitizeArtistList(rawArtists) {
    if (!Array.isArray(rawArtists)) {
      return [];
    }

    return rawArtists
      .filter((artist) => artist && typeof artist === 'object')
      .map((artist, index) => ({
        id: artist.id || `artist-extra-${index + 1}`,
        name: artist.name || '',
        image: artist.image || artist.imageUrl || '',
        description: artist.description || '',
        status: artist.status === 'hidden' ? 'hidden' : 'revealed',
      }))
      .filter((artist) => artist.name || artist.image || artist.description);
  }

  function ensureSecondaryArtistSection() {
    const existing = document.getElementById('MUSIC_HINT_SECTION_EXTRA');
    if (existing) {
      return existing;
    }

    const baseSection = document.getElementById('MUSIC_HINT_SECTION');
    if (!baseSection || !baseSection.parentElement) {
      return null;
    }

    const cloned = baseSection.cloneNode(true);
    cloned.id = 'MUSIC_HINT_SECTION_EXTRA';
    cloned.setAttribute('data-secondary-artist-section', '1');
    // Cloned markup may carry init flags from section 1; clear them so section 2 can bind events.
    cloned.removeAttribute('data-guest-reveal-bound');

    const strip = cloned.querySelector('[data-guest-strip]');
    if (strip) {
      strip.removeAttribute('data-guest-strip');
      strip.setAttribute('data-guest-strip-extra', '1');
    }

    cloned.querySelectorAll('.music-guest-card').forEach((card, idx) => {
      const slotId = `guest-extra-${String(idx + 1).padStart(2, '0')}`;
      card.classList.remove('is-active', 'is-revealed');
      card.classList.add('is-hidden');
      card.setAttribute('data-guest-id', slotId);
      card.setAttribute('aria-disabled', 'true');
      card.tabIndex = -1;
      card.removeAttribute('data-guest-reveal-bound');
    });

    baseSection.insertAdjacentElement('afterend', cloned);
    return cloned;
  }

  function ensureSecondaryArtistCardCount(strip, requiredCount) {
    const wrapper = strip.querySelector('.swiper-wrapper') || strip;
    const cards = Array.from(wrapper.querySelectorAll('.music-guest-card'));
    if (cards.length === 0) {
      return cards;
    }

    const template = cards[cards.length - 1];
    while (cards.length < requiredCount) {
      const clone = template.cloneNode(true);
      const slotId = `guest-extra-${String(cards.length + 1).padStart(2, '0')}`;
      clone.classList.remove('is-active', 'is-revealed');
      clone.classList.add('is-hidden');
      clone.setAttribute('data-guest-id', slotId);
      clone.setAttribute('aria-disabled', 'true');
      clone.tabIndex = -1;

      const thumb = clone.querySelector('.music-guest-thumb');
      if (thumb) {
        thumb.style.backgroundImage = '';
      }

      const nameEl = clone.querySelector('.music-guest-name');
      if (nameEl) {
        nameEl.textContent = 'Chưa công bố';
      }

      wrapper.appendChild(clone);
      cards.push(clone);
    }

    return cards;
  }

  function renderSecondaryArtistsSection(data) {
    const sectionConfig = data && (data.artistsExtra || data.artistsSecondary || data.artistsSecond);
    const existingSection = document.getElementById('MUSIC_HINT_SECTION_EXTRA');

    if (!sectionConfig || typeof sectionConfig !== 'object') {
      if (existingSection) {
        existingSection.style.display = 'none';
      }
      return;
    }

    const section = existingSection || ensureSecondaryArtistSection();
    if (!section) {
      return;
    }

    const titleText = String(sectionConfig.sectionTitle || '').trim();
    const artists = sanitizeArtistList(sectionConfig.artists);
    if (!titleText && artists.length === 0) {
      section.style.display = 'none';
      return;
    }

    const titleEl = section.querySelector('.music-hint-head h3');
    if (titleEl) {
      titleEl.textContent = titleText || 'Danh sách nghệ sĩ';
    }

    const strip = section.querySelector('[data-guest-strip-extra]');
    if (!strip) {
      section.style.display = 'none';
      return;
    }

    const requiredCount = Math.max(artists.length, 5);
    const cards = ensureSecondaryArtistCardCount(strip, requiredCount);
    cards.forEach((card, index) => {
      const artist = artists[index];

      if (!artist) {
        card.style.display = 'none';
        card.classList.remove('is-active');
        card.classList.remove('is-revealed');
        card.classList.add('is-hidden');
        card.setAttribute('aria-disabled', 'true');
        card.tabIndex = -1;
        return;
      }

      card.style.display = '';
      card.classList.toggle('is-revealed', artist.status === 'revealed');
      card.classList.toggle('is-hidden', artist.status !== 'revealed');
      card.setAttribute('aria-disabled', 'false');
      card.tabIndex = 0;
      card.setAttribute('data-guest-description', artist.description || 'Thông tin nghệ sĩ đang được cập nhật.');
      card.setAttribute('data-guest-hints', '[]');

      const thumb = card.querySelector('.music-guest-thumb');
      if (thumb) {
        thumb.style.backgroundImage = artist.image ? `url("${artist.image}")` : '';
      }

      const nameEl = card.querySelector('.music-guest-name');
      if (nameEl) {
        nameEl.textContent = artist.name || 'Chưa công bố';
      }
    });

    if (typeof window.initGuestHintRevealSection === 'function') {
      window.initGuestHintRevealSection(section);
    }

    initArtistSwiper();
    section.style.display = '';
  }

  function readLocalData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function getTimelineItemCount(data) {
    if (!data || !data.timeline || !Array.isArray(data.timeline.items)) {
      return 0;
    }
    return data.timeline.items.filter((item) => item && (item.time || item.title || item.description)).length;
  }

  function pickFreshestData(localData, apiData) {
    if (apiData) return apiData;
    return localData || null;
  }

  async function fetchApiData(timeoutMs = 7000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const urlCandidates = resolvedApiUrl
      ? [resolvedApiUrl]
      : EVENT_SLUG_CANDIDATES.map((slug) => `/api/events/${slug}/config`);

    try {
      for (let i = 0; i < urlCandidates.length; i += 1) {
        const baseUrl = urlCandidates[i];
        const res = await fetch(`${baseUrl}?_ts=${Date.now()}`, {
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!res.ok) {
          continue;
        }

        resolvedApiUrl = baseUrl;
        return await res.json();
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function loadData() {
    const loadSeq = ++activeLoadSeq;

    // Hide default countdown until CMS data explicitly enables it.
    toggleCountdownByData(null);

    const localData = readLocalData();

    // STEP 1: Always fetch fresh data first to avoid replaying stale local cache.
    const apiData = await fetchApiData(7000);

    // Ignore stale completion from earlier load attempts.
    if (loadSeq !== activeLoadSeq) {
      return;
    }
    
    // STEP 2: Apply API data when available. Local cache is fallback only.
    const finalData = pickFreshestData(localData, apiData);

    if (finalData) {
      applyData(finalData);
      document.body.classList.add('cms-ready');
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
      } catch (e) {}
    } else if (!localData) {
      // Step 3: Fallback to show at least whatever LadiPage has if everything else fails
      console.warn('HUIT FEST CMS: no local data and API unavailable.');
      document.body.classList.add('cms-ready');
    }
  }

  function applyData(data) {
    // 1. Banner
    if (data.banners && data.banners.length > 0) {
      const firstBanner = data.banners[0];
      const heroBg = document.querySelector('#SECTION14 > .ladi-section-background');
      if (heroBg && firstBanner.image) {
        heroBg.style.backgroundImage = `url("${firstBanner.image}")`;
      }
    }

    // 2. About Section
    const aboutSec = document.getElementById('ABOUT_HUIT_SECTION');
    if (aboutSec && data.about) {
      const h3 = aboutSec.querySelector('h3');
      if (h3) h3.textContent = data.about.heading;
      const ps = aboutSec.querySelectorAll('.about-huit-copy p');
      if (ps.length > 0 && data.about.description) {
         // Replace paragraphs. We split by double newline as done in admin
         const descParts = data.about.description.split('\n\n');
         ps.forEach((p, i) => {
            if (descParts[i]) p.textContent = descParts[i];
            else if (i >= descParts.length) p.style.display = 'none';
         });
      }
      const logo = aboutSec.querySelector('.about-huit-logo');
      if (logo && data.about.logoImage) logo.src = data.about.logoImage;
    }

    // 3. Artists
    const artistStrip = document.querySelector('[data-guest-strip]');
    if (artistStrip && data.artists && data.artists.artists) {
      const cards = artistStrip.querySelectorAll('.music-guest-card');
      const normalizedArtists = Array.isArray(data.artists.artists)
        ? data.artists.artists.filter((artist) => artist && (artist.id || artist.name || artist.image))
        : [];

      const artists = normalizedArtists.length >= 1
        ? normalizedArtists
        : (lastValidArtists.length >= 1 ? lastValidArtists : normalizedArtists);

      if (normalizedArtists.length >= 1) {
        lastValidArtists = normalizedArtists;
      }

      const usedArtistIndexes = new Set();
      const nextRenderedSlots = new Array(cards.length);
      const nextRenderedBySlot = Object.create(null);

      const toSlotId = (value, fallbackIndex) => {
        const fallback = `guest-${String(fallbackIndex + 1).padStart(2, '0')}`;
        if (value === null || value === undefined) {
          return fallback;
        }
        const raw = String(value).trim();
        if (!raw) {
          return fallback;
        }
        const match = raw.match(/^guest-(\d{1,2})$/i);
        if (match) {
          return `guest-${match[1].padStart(2, '0')}`;
        }
        if (/^\d+$/.test(raw)) {
          return `guest-${raw.padStart(2, '0')}`;
        }
        return raw;
      };

      const getCandidateSlotId = (artist) => {
        if (!artist) {
          return '';
        }
        const rawSlot = artist.slotId || artist.slot || artist.guestId || artist.guest_id || artist.position;
        if (rawSlot === null || rawSlot === undefined || rawSlot === '') {
          return '';
        }
        return toSlotId(rawSlot, -1);
      };

      const getArtistIdentity = (artist) => {
        if (!artist) {
          return '';
        }
        const id = artist.id ? String(artist.id).trim() : '';
        const name = artist.name ? String(artist.name).trim().toLowerCase() : '';
        if (id) {
          return `id:${id}`;
        }
        if (name) {
          return `name:${name}`;
        }
        return '';
      };

      const takeArtistBySlotId = (targetSlotId) => {
        if (!targetSlotId) {
          return null;
        }
        for (let idx = 0; idx < artists.length; idx += 1) {
          if (usedArtistIndexes.has(idx)) {
            continue;
          }
          const candidate = artists[idx];
          const candidateSlotId = getCandidateSlotId(candidate);
          if (candidateSlotId && candidateSlotId === targetSlotId) {
            usedArtistIndexes.add(idx);
            return candidate;
          }
        }
        return null;
      };

      const takeArtistById = (targetId) => {
        if (!targetId) {
          return null;
        }
        for (let idx = 0; idx < artists.length; idx += 1) {
          if (usedArtistIndexes.has(idx)) {
            continue;
          }
          const candidate = artists[idx];
          const candidateId = candidate && candidate.id ? String(candidate.id).trim() : '';
          if (candidateId && candidateId === targetId) {
            usedArtistIndexes.add(idx);
            return candidate;
          }
        }
        return null;
      };

      const takeArtistByIdentity = (targetIdentity) => {
        if (!targetIdentity) {
          return null;
        }
        for (let idx = 0; idx < artists.length; idx += 1) {
          if (usedArtistIndexes.has(idx)) {
            continue;
          }
          const candidate = artists[idx];
          if (getArtistIdentity(candidate) === targetIdentity) {
            usedArtistIndexes.add(idx);
            return candidate;
          }
        }
        return null;
      };

      const takeArtistByIndex = (targetIndex, expectedSlotId) => {
        if (targetIndex < 0 || targetIndex >= artists.length || usedArtistIndexes.has(targetIndex)) {
          return null;
        }
        const candidate = artists[targetIndex];
        const candidateSlotId = getCandidateSlotId(candidate);
        // If the artist at this index explicitly wants a different slot, don't grab them as a fallback for this slot.
        // This prevents 'jumping' slots when we have a partial or shuffled payload.
        if (candidateSlotId && expectedSlotId && candidateSlotId !== expectedSlotId) {
          return null;
        }
        usedArtistIndexes.add(targetIndex);
        return candidate;
      };

      const takeNextUnusedArtist = () => {
        for (let idx = 0; idx < artists.length; idx += 1) {
          if (usedArtistIndexes.has(idx)) {
            continue;
          }
          usedArtistIndexes.add(idx);
          return artists[idx];
        }
        return null;
      };

      cards.forEach((card, i) => {
        const slotId = toSlotId(card.getAttribute('data-guest-id'), i);
        const previousArtistForSlot = lastRenderedArtistsBySlot[slotId] || lastRenderedArtistSlots[i] || null;

        let artist = takeArtistBySlotId(slotId);

        if (!artist) {
          artist = takeArtistById(slotId);
        }

        if (!artist && previousArtistForSlot) {
          const prevBySlotIdentity = getArtistIdentity(previousArtistForSlot);
          artist = takeArtistByIdentity(prevBySlotIdentity);
        }

        if (!artist && previousArtistForSlot) {
          // Preserve slot to prevent card jumping/disappearing when incoming payload is partial.
          artist = previousArtistForSlot;
        }

        if (!artist) {
          artist = takeArtistByIndex(i, slotId);
        }

        if (!artist) {
          // Final fallback: next available unused artist who DOES NOT belong to any specific slot
          for (let idx = 0; idx < artists.length; idx += 1) {
            if (usedArtistIndexes.has(idx)) continue;
            const candidate = artists[idx];
            if (!getCandidateSlotId(candidate)) {
              usedArtistIndexes.add(idx);
              artist = candidate;
              break;
            }
          }
        }

        if (!artist) {
          const preservedArtist = previousArtistForSlot;

          if (!preservedArtist) {
            // Hide truly empty slots so only configured artists are shown.
            card.style.display = 'none';
            card.classList.remove('is-active');
            nextRenderedSlots[i] = null;
            return;
          }

          card.style.display = '';
          nextRenderedSlots[i] = preservedArtist;
          if (preservedArtist) {
            nextRenderedBySlot[slotId] = preservedArtist;
          }
          return;
        }

        nextRenderedSlots[i] = artist;
        nextRenderedBySlot[slotId] = artist;
        card.style.display = '';
        card.classList.remove('is-revealed', 'is-hidden');
        card.classList.add(artist.status === 'revealed' ? 'is-revealed' : 'is-hidden');

        const thumb = card.querySelector('.music-guest-thumb');
        if (thumb) {
          thumb.style.backgroundImage = artist.image ? `url("${artist.image}")` : '';
        }

        const nameEl = card.querySelector('.music-guest-name');
        if (nameEl) {
          nameEl.textContent = artist.name || 'Chưa công bố';
        }

        // Update data attributes if used by guest-hints-reveal.js
        const rawHints = Array.isArray(artist.hints) ? artist.hints : [];
        const cleanedHints = rawHints
          .map((hint) => ({
            type: hint && hint.image ? 'image' : 'text',
            content: (hint && hint.text) ? String(hint.text).trim() : '',
            src: (hint && hint.image) ? String(hint.image).trim() : '',
            caption: (hint && hint.text) ? String(hint.text).trim() : '',
          }))
          .filter((hint) => hint.content || hint.src);

        // Keep guest-id stable per slot so click/detail behavior doesn't drift between cards.
        card.setAttribute('data-guest-id', slotId);
        card.setAttribute('data-guest-description', artist.description || 'Thông tin khách mời đang được cập nhật.');
        card.setAttribute('data-guest-hints', JSON.stringify(artist.status === 'revealed' ? [] : cleanedHints));
      });

      Object.keys(nextRenderedBySlot).forEach((slotId) => {
        if (nextRenderedBySlot[slotId]) {
          lastRenderedArtistsBySlot[slotId] = nextRenderedBySlot[slotId];
        }
      });

      if (nextRenderedSlots.filter(Boolean).length >= 1) {
        lastRenderedArtistSlots = nextRenderedSlots;
      }

      const secTitle = document.querySelector('.music-hint-head h3');
      if (secTitle) secTitle.textContent = data.artists.sectionTitle;

      // Re-trigger detail refresh if a card is currently active to ensure UI/Detail sync
      if (typeof window.refreshActiveGuestDetail === 'function') {
        window.refreshActiveGuestDetail();
      }
      
      if (typeof window.initGuestHintRevealSection === 'function') {
        window.initGuestHintRevealSection(artistStrip.closest('.ladi-section'));
      }

      initArtistSwiper();
    }

    renderSecondaryArtistsSection(data);

    // 4. Countdown (CMS-driven only)
    if (toggleCountdownByData(data.countdown)) {
      startCountdown(data.countdown.targetDate);

      const countTitle = document.querySelector('#HEADLINE184 span');
      if (countTitle && data.countdown.sectionTitle) {
        countTitle.textContent = data.countdown.sectionTitle;
      }
    }

    // 5. Ticket Steps
    if (data.ticket) {
      const ticketTitleMain = document.querySelector('#HEADLINE222 .ladi-headline');
      const ticketTitleSub = document.querySelector('#HEADLINE239 .ladi-headline');
      if (data.ticket.sectionTitle) {
        if (ticketTitleMain) {
          ticketTitleMain.textContent = data.ticket.sectionTitle;
        }
        // Avoid duplicated heading when layout has 2 title nodes.
        if (ticketTitleSub) {
          ticketTitleSub.textContent = '';
        }
      }

      const sectionEl = document.getElementById('SECTION19');
      const sectionContainer = sectionEl ? sectionEl.querySelector('.ladi-container') : null;
      const noteGroup = document.getElementById('GROUP325');
      const countdownGroup = document.getElementById('GROUP245');
      const ticketHeadingGroup = document.getElementById('GROUP347');
      const ticketPrimaryGroups = [
        ticketHeadingGroup,
        document.getElementById('GROUP304'),
        document.getElementById('GROUP305'),
        document.getElementById('GROUP307')
      ].filter(Boolean);

      const ticketViewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const isTicketMobile = ticketViewportWidth < 768;

      ticketPrimaryGroups.forEach((el) => {
        if (!el.dataset.cmsBaseTop) {
          el.dataset.cmsBaseTop = String(el.offsetTop);
        }
      });

      if (isTicketMobile && ticketHeadingGroup) {
        let headingBaseTop = Number(ticketHeadingGroup.dataset.cmsBaseTop || ticketHeadingGroup.offsetTop);
        
        // Push heading up if countdown is visible
        if (countdownGroup) {
          const countdownStyle = window.getComputedStyle(countdownGroup);
          if (countdownStyle.display !== 'none' && countdownStyle.visibility !== 'hidden') {
            const countdownBottom = countdownGroup.offsetTop + countdownGroup.offsetHeight;
            const desiredGapFromCountdown = 40; // Closer to countdown
            const shiftUp = Math.max(0, headingBaseTop - (countdownBottom + desiredGapFromCountdown));
            headingBaseTop = Math.max(0, headingBaseTop - shiftUp);
          }
        }
        
        ticketHeadingGroup.style.top = `${Math.round(headingBaseTop)}px`;

        const stepGroups = ticketPrimaryGroups.filter((el) => el && el !== ticketHeadingGroup);
        if (stepGroups.length > 0) {
          const headingBottom = headingBaseTop + ticketHeadingGroup.offsetHeight;
          const targetHeadingToStepGap = -20; // Very close gap, negative to compensate for empty box height
          const stepStartTop = headingBottom + targetHeadingToStepGap;
          
          const firstStepBase = Number(stepGroups[0].dataset.cmsBaseTop || stepGroups[0].offsetTop);
          const totalShift = firstStepBase - stepStartTop;

          // Pull all step groups up
          stepGroups.forEach((el) => {
            const baseTop = Number(el.dataset.cmsBaseTop || el.offsetTop);
            el.style.top = `${Math.round(baseTop - totalShift)}px`;
          });
        }
      } else {
        // Desktop fallback
        ticketPrimaryGroups.forEach((el) => {
          const baseTop = Number(el.dataset.cmsBaseTop || el.offsetTop);
          el.style.top = `${Math.round(baseTop)}px`;
        });
      }

      if (noteGroup && !noteGroup.dataset.cmsBaseTop) {
        noteGroup.dataset.cmsBaseTop = String(noteGroup.offsetTop);
      }
      if (sectionEl && !sectionEl.dataset.cmsBaseHeight) {
        sectionEl.dataset.cmsBaseHeight = String(sectionEl.offsetHeight);
      }

      if (sectionContainer) {
        sectionContainer.querySelectorAll('.cms-ticket-step-dynamic').forEach((el) => el.remove());
      }

      const steps = Array.isArray(data.ticket.steps)
        ? data.ticket.steps.filter((step) => step && (step.title || step.description))
        : [];

      // Note: LadiPage might split titles into multiple elements
      const ticketSteps = [
        document.getElementById('GROUP304'),
        document.getElementById('GROUP305'),
        document.getElementById('GROUP307')
      ];

      // Keep first 3 static slots, then clone additional slots dynamically.
      ticketSteps.forEach((group, i) => {
        if (!group) return;
        group.style.display = steps[i] ? '' : 'none';
      });
      
      steps.forEach((step, i) => {
        const group = ticketSteps[i];
        if (group) {
          const titleEl = group.querySelector('.ladi-headline');
          if (titleEl) titleEl.textContent = step.title;
          const descEl = group.querySelector('.ladi-paragraph');
          if (descEl) descEl.textContent = step.description;
        }
      });

      if (sectionContainer && ticketSteps[0] && ticketSteps[1] && ticketSteps[2] && steps.length > 3) {
        const first = ticketSteps[0];
        const second = ticketSteps[1];
        const template = ticketSteps[2];
        const firstFrame = first.querySelector('.ladi-box.ladi-transition') || first.querySelector('.ladi-box');
        const secondFrame = second.querySelector('.ladi-box.ladi-transition') || second.querySelector('.ladi-box');
        const templateFrame = template.querySelector('.ladi-box.ladi-transition') || template.querySelector('.ladi-box');

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const columns = viewportWidth >= 992 ? 3 : 1;
        const sectionRect = sectionContainer.getBoundingClientRect();
        const firstRect = (firstFrame || first).getBoundingClientRect();
        const secondRect = (secondFrame || second).getBoundingClientRect();
        const templateRect = (templateFrame || template).getBoundingClientRect();
        const topStart = firstRect.top - sectionRect.top;
        const leftStart = firstRect.left - sectionRect.left;
        const cardWidth = Math.round(templateRect.width || firstRect.width);
        const mobileAvailableCardWidth = Math.max(180, Math.round((sectionRect.width || viewportWidth) - leftStart - 8));
        const resolvedCardWidth = columns === 1 ? Math.min(cardWidth, mobileAvailableCardWidth) : cardWidth;
        const cardHeight = Math.round(templateRect.height || firstRect.height);
        const colGap = columns === 3 ? Math.max(Math.round(secondRect.left - firstRect.left - cardWidth), 0) : 0;
        const rowGap = cardHeight + (columns === 3 ? 24 : 20);
        const row2Top = topStart + rowGap;
        const templateHeadline = template.querySelector('.ladi-headline');
        const templateDesc = template.querySelector('.ladi-paragraph');
        const templateImageBg = template.querySelector('.ladi-image-background');
        const templateFrameStyle = templateFrame ? window.getComputedStyle(templateFrame) : null;
        const templateHeadlineStyle = templateHeadline ? window.getComputedStyle(templateHeadline) : null;
        const templateDescStyle = templateDesc ? window.getComputedStyle(templateDesc) : null;
        const templateImageStyle = templateImageBg ? window.getComputedStyle(templateImageBg) : null;

        const extraWrap = document.createElement('div');
        extraWrap.className = 'cms-ticket-step-dynamic cms-ticket-extra-wrap';
        extraWrap.style.position = 'absolute';
        extraWrap.style.left = `${leftStart}px`;
        extraWrap.style.top = `${row2Top}px`;
        extraWrap.style.display = 'grid';
        extraWrap.style.gridTemplateColumns = columns === 3 ? `repeat(3, ${resolvedCardWidth}px)` : `${resolvedCardWidth}px`;
        extraWrap.style.columnGap = `${colGap}px`;
        extraWrap.style.rowGap = '16px';
        extraWrap.style.width = columns === 3
          ? `${resolvedCardWidth * 3 + colGap * 2}px`
          : `${resolvedCardWidth}px`;
        extraWrap.style.zIndex = '3';

        for (let i = 3; i < steps.length; i += 1) {
          const step = steps[i];
          const card = document.createElement('article');
          card.className = 'cms-ticket-extra-card';
          card.style.position = 'relative';
          card.style.width = `${resolvedCardWidth}px`;
          card.style.height = `${cardHeight}px`;
          card.style.border = templateFrameStyle ? templateFrameStyle.border : '1px solid rgba(183, 209, 255, 0.85)';
          card.style.borderRadius = templateFrameStyle ? templateFrameStyle.borderRadius : '10px';
          card.style.background = templateFrameStyle ? templateFrameStyle.background : 'rgba(16, 22, 66, 0.7)';
          card.style.boxShadow = templateFrameStyle ? templateFrameStyle.boxShadow : '0 10px 24px rgba(5, 10, 45, 0.45)';
          card.style.boxSizing = 'border-box';
          card.style.padding = '20px 14px 14px 14px';
          card.style.overflow = 'visible';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.justifyContent = 'flex-start';

          const iconEl = document.createElement('div');
          iconEl.style.position = 'absolute';
          iconEl.style.width = '46px';
          iconEl.style.height = '46px';
          iconEl.style.left = '10px';
          iconEl.style.top = '-18px';
          iconEl.style.zIndex = '2';
          iconEl.style.backgroundRepeat = 'no-repeat';
          iconEl.style.backgroundPosition = 'center';
          iconEl.style.backgroundSize = 'contain';
          iconEl.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))';
          if (templateImageStyle && templateImageStyle.backgroundImage && templateImageStyle.backgroundImage !== 'none') {
            iconEl.style.backgroundImage = templateImageStyle.backgroundImage;
          }

          const titleEl = document.createElement('h3');
          titleEl.textContent = step.title || `Bước ${i + 1}`;
          titleEl.style.margin = '22px 0 8px 0';
          titleEl.style.fontSize = templateHeadlineStyle ? templateHeadlineStyle.fontSize : '30px';
          titleEl.style.lineHeight = templateHeadlineStyle ? templateHeadlineStyle.lineHeight : '1.2';
          titleEl.style.color = templateHeadlineStyle ? templateHeadlineStyle.color : '#ffffff';
          titleEl.style.fontFamily = templateHeadlineStyle ? templateHeadlineStyle.fontFamily : "'Open Sans', sans-serif";
          titleEl.style.fontWeight = templateHeadlineStyle ? templateHeadlineStyle.fontWeight : '700';
          titleEl.style.letterSpacing = templateHeadlineStyle ? templateHeadlineStyle.letterSpacing : '0px';

          const descEl = document.createElement('p');
          descEl.textContent = (step.description && String(step.description).trim()) || ' '; 
          descEl.style.margin = '0';
          descEl.style.whiteSpace = 'pre-line';
          descEl.style.fontSize = templateDescStyle ? templateDescStyle.fontSize : '15px';
          descEl.style.lineHeight = templateDescStyle ? templateDescStyle.lineHeight : '1.5';
          descEl.style.color = templateDescStyle ? templateDescStyle.color : '#ffffff';
          descEl.style.fontFamily = templateDescStyle ? templateDescStyle.fontFamily : "'Open Sans', sans-serif";
          descEl.style.fontWeight = templateDescStyle ? templateDescStyle.fontWeight : '400';
          if (!step.description || !String(step.description).trim()) {
            descEl.style.display = 'none';
          }

          card.appendChild(iconEl);

          card.appendChild(titleEl);
          card.appendChild(descEl);
          extraWrap.appendChild(card);
        }

        sectionContainer.appendChild(extraWrap);
      }

      if (noteGroup && sectionEl && ticketSteps[0] && ticketSteps[1]) {
        const baseNoteTop = Number(noteGroup.dataset.cmsBaseTop || noteGroup.offsetTop);
        const baseSectionHeight = Number(sectionEl.dataset.cmsBaseHeight || sectionEl.offsetHeight);

        const dynamicSteps = sectionContainer
          ? Array.from(sectionContainer.querySelectorAll('.cms-ticket-step-dynamic'))
          : [];

        const allStepEls = [...ticketSteps.filter(Boolean), ...dynamicSteps]
          .filter((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });

        const stepBottom = allStepEls.reduce((maxBottom, el) => {
          return Math.max(maxBottom, el.offsetTop + el.offsetHeight);
        }, ticketSteps[0].offsetTop + ticketSteps[0].offsetHeight);

        const noteGap = isTicketMobile ? 12 : 24;
        const noteTop = isTicketMobile
          ? stepBottom + noteGap
          : (steps.length > 3
            ? Math.max(baseNoteTop, stepBottom + noteGap)
            : baseNoteTop);

        noteGroup.style.top = `${noteTop}px`;

        const minSectionHeight = noteTop + noteGroup.offsetHeight + (isTicketMobile ? 5 : 32);
        const finalSectionHeight = isTicketMobile
          ? minSectionHeight
          : Math.max(baseSectionHeight, minSectionHeight);
        sectionEl.style.height = `${finalSectionHeight}px`;
      }
      
      const noteEl = document.querySelector('#LIST_PARAGRAPH8 ul');
      if (noteEl && data.ticket.note) {
        const lines = data.ticket.note.split('\n').filter(l => l.trim());
        noteEl.innerHTML = lines.map(l => `<li>${l}</li>`).join('');
      }
    }

    // 6. Timeline
    const timelineGroup = document.getElementById('GROUP344');
    if (timelineGroup && data.timeline && data.timeline.items) {
      const timelineSection = document.getElementById('SECTION18');
      const timelineContainer = timelineSection ? timelineSection.querySelector('.ladi-container') : null;
      const timelineInner = timelineGroup.querySelector('.ladi-group');

      const items = [
        document.getElementById('GROUP285'),
        document.getElementById('GROUP286'),
        document.getElementById('GROUP287'),
        document.getElementById('GROUP288'),
        document.getElementById('GROUP289')
      ].filter(Boolean); // Only work with existing items

      const timelineItems = Array.isArray(data.timeline.items)
        ? data.timeline.items.filter((item) => item && (item.time || item.timeLabel || item.title || item.description))
        : [];

      const timelineViewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const timelineVerticalGap = timelineViewportWidth < 768 ? 12 : 16;
      const isTimelineMobile = timelineViewportWidth < 768;
      const minParagraphWidth = isTimelineMobile ? 170 : 320;
      const maxParagraphWidth = isTimelineMobile ? 272 : 395;
      const paragraphSidePadding = isTimelineMobile ? 18 : 40;
      const targetTimeBoxWidth = isTimelineMobile ? 110 : 192;

      const toNumber = (value, fallback = 0) => {
        const next = Number.parseFloat(String(value ?? ''));
        return Number.isFinite(next) ? next : fallback;
      };

      const fitTimelineGroupLayout = (groupEl) => {
        if (!groupEl) return 0;

        const paragraphText = groupEl.querySelector('.ladi-paragraph');
        const paragraphEl = paragraphText ? paragraphText.parentElement : null;

        if (!paragraphText || !paragraphEl) {
          return groupEl.offsetHeight || toNumber(window.getComputedStyle(groupEl).height, 0);
        }

        const isMobile = isTimelineMobile;
        const groupParent = groupEl.parentElement;
        const parentWidth = (groupParent && (groupParent.clientWidth || groupParent.offsetWidth))
          || (timelineContainer ? (timelineContainer.clientWidth || timelineContainer.offsetWidth) : 0);
        const groupLeft = groupEl.offsetLeft || toNumber(window.getComputedStyle(groupEl).left, 0);
        const viewportRightPadding = isMobile ? 16 : 10;
        const maxGroupWidthByViewport = parentWidth > 0
          ? Math.max(isMobile ? 220 : 300, parentWidth - groupLeft - viewportRightPadding)
          : Number.POSITIVE_INFINITY;

        paragraphText.style.whiteSpace = 'normal';
        paragraphText.style.wordBreak = 'normal';
        paragraphText.style.overflowWrap = 'break-word';
        paragraphText.style.lineHeight = isMobile ? '1.42' : '1.45';
        paragraphText.style.maxWidth = '100%';

        const textContainers = Array.from(groupEl.querySelectorAll('.ladi-box'))
          .map((box) => box.parentElement)
          .filter((holder, idx, arr) => holder && arr.indexOf(holder) === idx)
          .filter((holder) => {
            if (!holder) return false;
            const holderWidth = holder.offsetWidth || toNumber(window.getComputedStyle(holder).width, 0);
            const holderLeft = holder.offsetLeft || toNumber(window.getComputedStyle(holder).left, 0);
            return holderWidth > (isMobile ? 110 : 180) && holderLeft > (isMobile ? 90 : 150);
          });

        const timeContainer = paragraphEl.parentElement
          ? Array.from(paragraphEl.parentElement.children).find((child) => {
              const width = child.offsetWidth || toNumber(window.getComputedStyle(child).width, 0);
              const left = child.offsetLeft || toNumber(window.getComputedStyle(child).left, 0);
              return width > 80 && width < 190 && left < (isMobile ? 120 : 160);
            })
          : null;
        const timeTextHolder = groupEl.querySelector('.ladi-headline')?.parentElement || null;
        const timeText = groupEl.querySelector('.ladi-headline');

        if (isMobile) {
          const targetGroupWidth = Number.isFinite(maxGroupWidthByViewport)
            ? Math.max(220, maxGroupWidthByViewport)
            : Math.max(220, groupEl.offsetWidth || toNumber(window.getComputedStyle(groupEl).width, 220));

          groupEl.style.setProperty('width', `${Math.round(targetGroupWidth)}px`, 'important');
          if (Number.isFinite(maxGroupWidthByViewport)) {
            groupEl.style.setProperty('max-width', `${Math.round(maxGroupWidthByViewport)}px`, 'important');
          }

          const mobileOuterPadding = 14;
          const mobileInnerPadding = 12;
          const mobileTopPadding = 2;
          const mobileGap = 10;
          const mobileCenterBiasLeft = -45; // Empirically determined nudge to better center the time box and paragraph under the timeline dot
          const availableMobileWidth = Math.max(200, targetGroupWidth - (mobileOuterPadding * 2));
          const mobileCardWidth = Math.max(190, Math.min(320, availableMobileWidth));
          const mobileCardLeft = Math.max(
            8,
            Math.round((targetGroupWidth - mobileCardWidth) / 2) + mobileCenterBiasLeft
          );
          let timeBottom = mobileTopPadding;

          if (timeContainer) {
            const timeLabel = String(timeText?.textContent || '').trim();
            const estimatedTimeWidth = (timeLabel.length * 9) + 30;
            const effectiveTimeBoxWidth = Math.max(
              104,
              Math.min(148, estimatedTimeWidth, mobileCardWidth - 8)
            );

            timeContainer.style.setProperty('left', `${mobileCardLeft + 4}px`, 'important');
            timeContainer.style.setProperty('top', `${mobileTopPadding}px`, 'important');
            timeContainer.style.setProperty('width', `${Math.round(effectiveTimeBoxWidth)}px`, 'important');

            if (timeTextHolder) {
              timeTextHolder.style.setProperty('left', `${mobileCardLeft + 13}px`, 'important');
              timeTextHolder.style.setProperty('top', `${mobileTopPadding + 6}px`, 'important');
              timeTextHolder.style.setProperty('width', `${Math.round(Math.max(80, effectiveTimeBoxWidth - 18))}px`, 'important');
            }

            timeBottom = (timeContainer.offsetTop || mobileTopPadding) + (timeContainer.offsetHeight || 48);
          } else if (timeTextHolder) {
            timeTextHolder.style.setProperty('left', `${mobileCardLeft + 13}px`, 'important');
            timeTextHolder.style.setProperty('top', `${mobileTopPadding + 6}px`, 'important');
            timeBottom = (timeTextHolder.offsetTop || mobileTopPadding) + (timeTextHolder.offsetHeight || 36);
          }

          const paragraphLeft = mobileCardLeft;
          const paragraphTop = Math.round(timeBottom + mobileGap + 8);
          const paragraphWidth = mobileCardWidth;

          paragraphEl.style.setProperty('left', `${paragraphLeft}px`, 'important');
          paragraphEl.style.setProperty('top', `${paragraphTop}px`, 'important');
          paragraphEl.style.setProperty('width', `${Math.round(paragraphWidth)}px`, 'important');
          paragraphEl.style.setProperty('height', 'auto', 'important');
          paragraphEl.style.setProperty('overflow', 'visible', 'important');
          paragraphEl.style.setProperty('padding', `10px ${mobileInnerPadding}px`, 'important');
          paragraphEl.style.setProperty('box-sizing', 'border-box', 'important');
          paragraphEl.style.setProperty('border-radius', '14px', 'important');
          paragraphEl.style.setProperty('border', '1px solid rgba(167, 214, 255, 0.55)', 'important');
          paragraphEl.style.setProperty('background', 'rgba(27, 56, 97, 0.56)', 'important');

          textContainers.forEach((holder) => {
            holder.style.setProperty('display', 'none', 'important');
          });

          const textBoxBottom = 0;

          const paragraphBottom = (paragraphEl.offsetTop || paragraphTop) + (paragraphEl.offsetHeight || 0);
          const baseGroupHeight = groupEl.offsetHeight || toNumber(window.getComputedStyle(groupEl).height, 0);
          const finalGroupHeight = Math.max(baseGroupHeight, timeBottom + 4, paragraphBottom + 10, textBoxBottom + 8);

          groupEl.style.setProperty('height', `${Math.ceil(finalGroupHeight)}px`, 'important');
          const inner = groupEl.querySelector('.ladi-group');
          if (inner) {
            inner.style.setProperty('height', `${Math.ceil(finalGroupHeight)}px`, 'important');
          }

          return Math.ceil(finalGroupHeight);
        }

        const paragraphTop = paragraphEl.offsetTop || toNumber(window.getComputedStyle(paragraphEl).top, isMobile ? 9 : 12);
        const paragraphLeft = paragraphEl.offsetLeft || toNumber(window.getComputedStyle(paragraphEl).left, isMobile ? 138 : 214);
        const lineChunks = String(paragraphText.textContent || '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const longestLineLength = lineChunks.reduce((maxLen, line) => Math.max(maxLen, line.length), 0);
        const estimatedParagraphWidth = (longestLineLength * (isMobile ? 6.9 : 7.3)) + (isMobile ? 30 : 34);
        const maxParagraphWidthByViewport = Number.isFinite(maxGroupWidthByViewport)
          ? Math.max(140, maxGroupWidthByViewport - paragraphLeft - (isMobile ? 24 : 20))
          : maxParagraphWidth;
        const effectiveMinParagraphWidth = Math.min(minParagraphWidth, maxParagraphWidthByViewport);
        const adaptiveParagraphWidth = Math.max(
          effectiveMinParagraphWidth,
          Math.min(maxParagraphWidth, estimatedParagraphWidth, maxParagraphWidthByViewport)
        );

        paragraphEl.style.setProperty('width', `${Math.round(adaptiveParagraphWidth)}px`, 'important');
        paragraphEl.style.setProperty('height', 'auto', 'important');
        paragraphEl.style.setProperty('overflow', 'visible', 'important');

        const textBoxLeft = Math.max(0, paragraphLeft - (isMobile ? 12 : 18));
        const requestedTextBoxWidth = adaptiveParagraphWidth + paragraphSidePadding;
        const currentGroupWidth = groupEl.offsetWidth || toNumber(window.getComputedStyle(groupEl).width, 0);
        const maxExpandedGroupWidth = currentGroupWidth + (isMobile ? 48 : 88);
        const requestedGroupWidth = textBoxLeft + requestedTextBoxWidth + 8;
        let targetGroupWidth = Math.max(currentGroupWidth, Math.min(requestedGroupWidth, maxExpandedGroupWidth));
        if (Number.isFinite(maxGroupWidthByViewport)) {
          targetGroupWidth = Math.min(targetGroupWidth, maxGroupWidthByViewport);
        }
        if (isMobile && targetGroupWidth < 180) {
          targetGroupWidth = Number.isFinite(maxGroupWidthByViewport)
            ? Math.min(180, maxGroupWidthByViewport)
            : 180;
        }
        groupEl.style.setProperty('width', `${Math.round(targetGroupWidth)}px`, 'important');
        if (Number.isFinite(maxGroupWidthByViewport)) {
          groupEl.style.setProperty('max-width', `${Math.round(maxGroupWidthByViewport)}px`, 'important');
        }

        const maxTextBoxWidth = Math.max(120, targetGroupWidth - textBoxLeft - (isMobile ? 6 : 8));
        const targetTextBoxWidth = Math.max(120, Math.min(requestedTextBoxWidth, maxTextBoxWidth));
        textContainers.forEach((holder) => {
          holder.style.setProperty('left', `${Math.round(textBoxLeft)}px`, 'important');
          holder.style.setProperty('width', `${Math.round(targetTextBoxWidth)}px`, 'important');
          holder.style.setProperty('box-sizing', 'border-box', 'important');
          holder.style.setProperty('overflow', 'hidden', 'important');
        });

        const baseTextBoxHeight = textContainers.reduce((maxHeight, holder) => {
          const holderHeight = holder.offsetHeight || toNumber(window.getComputedStyle(holder).height, 0);
          return Math.max(maxHeight, holderHeight);
        }, 0);

        if (timeContainer) {
          const timeLeft = timeContainer.offsetLeft || toNumber(window.getComputedStyle(timeContainer).left, 0);
          const effectiveTimeBoxWidth = isMobile
            ? Math.max(92, Math.min(targetTimeBoxWidth, paragraphLeft - 12))
            : targetTimeBoxWidth;
          timeContainer.style.setProperty('width', `${Math.round(effectiveTimeBoxWidth)}px`, 'important');

          if (timeTextHolder) {
            timeTextHolder.style.setProperty('width', `${Math.round(effectiveTimeBoxWidth - (isMobile ? 18 : 24))}px`, 'important');
            timeTextHolder.style.setProperty('left', `${Math.round(timeLeft + (isMobile ? 9 : 12))}px`, 'important');
          }
        }

        const timeBottom = timeContainer
          ? (timeContainer.offsetTop + timeContainer.offsetHeight)
          : ((groupEl.querySelector('.ladi-headline')?.parentElement?.offsetTop || 0) + (groupEl.querySelector('.ladi-headline')?.parentElement?.offsetHeight || 0));

        const baseGroupHeight = groupEl.offsetHeight || toNumber(window.getComputedStyle(groupEl).height, 0);
        const finalGroupHeight = Math.max(baseGroupHeight, baseTextBoxHeight, timeBottom + (isMobile ? 4 : 6));
        groupEl.style.setProperty('height', `${Math.ceil(finalGroupHeight)}px`, 'important');

        const inner = groupEl.querySelector('.ladi-group');
        if (inner) {
          inner.style.setProperty('height', `${Math.ceil(finalGroupHeight)}px`, 'important');
        }

        return Math.ceil(finalGroupHeight);
      };

      const relayoutStaticTimelineItems = (visibleGroups) => {
        if (!Array.isArray(visibleGroups) || visibleGroups.length === 0) {
          return;
        }

        let nextTop = visibleGroups[0].offsetTop || toNumber(window.getComputedStyle(visibleGroups[0]).top, 0);
        visibleGroups.forEach((groupEl) => {
          const fittedHeight = fitTimelineGroupLayout(groupEl);
          groupEl.style.setProperty('top', `${Math.round(nextTop)}px`, 'important');
          nextTop += Math.max(fittedHeight, groupEl.offsetHeight || 0) + timelineVerticalGap;
        });
      };

      if (timelineInner) {
        timelineInner.querySelectorAll('.cms-timeline-item-dynamic').forEach((el) => el.remove());
      }

      // 6.1 Populate first 5 slots
      items.forEach((group, i) => {
        const item = timelineItems[i];
        if (!item) {
          group.style.display = 'none';
          return;
        }

        group.style.display = '';
        const timeEl = group.querySelector('.ladi-headline');
        if (timeEl) timeEl.textContent = item.time || item.timeLabel || '';
        const descEl = group.querySelector('.ladi-paragraph');
        if (descEl) descEl.innerHTML = `<strong>${item.title || ''}</strong><br>${item.description || ''}`;
      });

      const visibleStaticItems = items.filter((group) => window.getComputedStyle(group).display !== 'none');
      relayoutStaticTimelineItems(visibleStaticItems);

      // 6.2 Handle cloning for items > 5
      if (timelineInner && visibleStaticItems.length > 0 && timelineItems.length > visibleStaticItems.length) {
        const staticCount = visibleStaticItems.length;
        const template = visibleStaticItems[staticCount - 1]; // Use last visible slot as template
        const leftStart = template.offsetLeft;
        let nextTop = template.offsetTop + template.offsetHeight + timelineVerticalGap;

        for (let i = staticCount; i < timelineItems.length; i += 1) {
          const item = timelineItems[i];
          const clone = template.cloneNode(true);
          
          clone.removeAttribute('id');
          clone.dataset.cmsDynamic = 'timeline-item';
          clone.classList.add('cms-timeline-item-dynamic');
          clone.classList.remove('ladi-animation');
          clone.querySelectorAll('.ladi-animation').forEach((el) => el.classList.remove('ladi-animation'));

          clone.style.setProperty('display', 'block', 'important'); 
          clone.style.position = 'absolute';
          clone.style.setProperty('top', `${Math.round(nextTop)}px`, 'important');
          clone.style.left = `${leftStart}px`;
          clone.style.setProperty('opacity', '1', 'important');
          clone.style.setProperty('visibility', 'visible', 'important');
          clone.style.transform = 'none';

          const cloneRootGroup = clone.querySelector('.ladi-group');
          if (cloneRootGroup) {
            cloneRootGroup.style.setProperty('opacity', '1', 'important');
            cloneRootGroup.style.setProperty('visibility', 'visible', 'important');
          }

          const timeEl = clone.querySelector('.ladi-headline');
          if (timeEl) timeEl.textContent = item.time || item.timeLabel || '';
          const descEl = clone.querySelector('.ladi-paragraph');
          if (descEl) descEl.innerHTML = `<strong>${item.title || ''}</strong><br>${item.description || ''}`;

          timelineInner.appendChild(clone);
          const fittedCloneHeight = fitTimelineGroupLayout(clone);
          nextTop += Math.max(fittedCloneHeight, clone.offsetHeight || 0) + timelineVerticalGap;
        }

        // 6.3 Update heights
        const visibleTimelineItems = Array.from(timelineInner.children)
          .filter((el) => el && el.nodeType === 1)
          .filter((el) => window.getComputedStyle(el).display !== 'none');
        const lastVisibleItem = visibleTimelineItems.length > 0
          ? visibleTimelineItems[visibleTimelineItems.length - 1]
          : null;
        const totalInnerHeight = lastVisibleItem
          ? (lastVisibleItem.offsetTop + lastVisibleItem.offsetHeight + 12)
          : timelineGroup.offsetHeight;

        if (!timelineGroup.dataset.cmsBaseHeight) {
          timelineGroup.dataset.cmsBaseHeight = String(timelineGroup.offsetHeight);
        }
        
        timelineGroup.style.setProperty('height', `${Math.max(Number(timelineGroup.dataset.cmsBaseHeight), totalInnerHeight)}px`, 'important');
        if (timelineInner) {
          timelineInner.style.setProperty('height', '100%', 'important');
        }
      }

      // 6.4 Update section final height
      if (timelineSection && timelineContainer) {
        timelineSection.style.setProperty('overflow-x', 'hidden', 'important');
        timelineContainer.style.setProperty('overflow-x', 'hidden', 'important');

        if (!timelineSection.dataset.cmsBaseHeight) {
          timelineSection.dataset.cmsBaseHeight = String(timelineSection.offsetHeight);
        }
        
        // Force reflow/calculation
        const children = Array.from(timelineContainer.children);
        const maxBottom = children.reduce((max, el) => {
          const id = el.id || '';
          if (!el || el.style.display === 'none') return max;
          
          // For the main timeline content group, we must check its children heights
          // because the group itself often has a fixed base height in LadiPage
          if (id === 'GROUP344') {
             const innerChildren = Array.from(el.querySelectorAll('.ladi-element'))
               .filter(child => child.parentElement.parentElement === el || child.parentElement === el);
             
             let innerMax = 0;
             innerChildren.forEach(child => {
               if (window.getComputedStyle(child).display !== 'none') {
                 innerMax = Math.max(innerMax, child.offsetTop + child.offsetHeight);
               }
             });
             return Math.max(max, el.offsetTop + innerMax);
          }
          
          const isContent = id.startsWith('GROUP') || id.startsWith('HEADLINE') || id.startsWith('PARAGRAPH');
          if (!isContent) return max;
          
          return Math.max(max, el.offsetTop + el.offsetHeight);
        }, 0);
        
        if (maxBottom > 0) {
          timelineSection.style.setProperty('height', `${maxBottom + 50}px`, 'important');
        } else {
          timelineSection.style.setProperty('height', `${timelineSection.dataset.cmsBaseHeight}px`, 'important');
        }
        timelineSection.classList.add('cms-loaded');
      } else {
        if (timelineSection) timelineSection.classList.add('cms-loaded');
      }
      
      const tlTitle = document.getElementById('HEADLINE_TIMELINE');
      if (tlTitle) tlTitle.querySelector('h3').textContent = data.timeline.sectionTitle || 'Time-line chương trình';

      const timelineImageWrap = document.getElementById('IMAGE264');
      const timelineImage = timelineImageWrap ? timelineImageWrap.querySelector('.ladi-image-background') : null;

      if (timelineImageWrap && timelineImage && timelineContainer && timelineGroup) {
        ensureTimelineImageFxStyles();

        if (timelineViewportWidth < 768) {
          timelineImageWrap.style.setProperty('display', 'none', 'important');
        } else {
          timelineImageWrap.style.setProperty('display', 'block', 'important');

        const containerWidth = timelineContainer.clientWidth || timelineContainer.offsetWidth || 0;
        const groupLeft = timelineGroup.offsetLeft || 0;
        const groupRight = groupLeft + (timelineGroup.offsetWidth || 0);

        const visibleTimelineRows = timelineInner
          ? Array.from(timelineInner.children)
            .filter((el) => el && el.nodeType === 1)
            .filter((el) => {
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              const id = el.id || '';
              return id.startsWith('GROUP') || el.classList.contains('cms-timeline-item-dynamic');
            })
          : [];

        let contentTopAbs = timelineGroup.offsetTop || 0;
        let contentBottomAbs = contentTopAbs + (timelineGroup.offsetHeight || 0);
        let contentRightAbs = groupRight;
        let firstRowTopAbs = contentTopAbs;

        if (visibleTimelineRows.length > 0) {
          const rowTopRel = visibleTimelineRows.reduce((minVal, el) => Math.min(minVal, el.offsetTop || 0), Number.POSITIVE_INFINITY);
          const rowBottomRel = visibleTimelineRows.reduce((maxVal, el) => Math.max(maxVal, (el.offsetTop || 0) + (el.offsetHeight || 0)), 0);
          const rowRightRel = visibleTimelineRows.reduce((maxVal, el) => Math.max(maxVal, (el.offsetLeft || 0) + (el.offsetWidth || 0)), 0);

          if (Number.isFinite(rowTopRel)) {
            contentTopAbs = (timelineGroup.offsetTop || 0) + rowTopRel;
            contentBottomAbs = (timelineGroup.offsetTop || 0) + rowBottomRel;
            firstRowTopAbs = contentTopAbs;
          }
          contentRightAbs = (timelineGroup.offsetLeft || 0) + rowRightRel;
        }

        const imageGap = timelineViewportWidth < 768 ? 10 : 18;

        const desiredImageWidth = timelineViewportWidth >= 1400
          ? 390
          : timelineViewportWidth >= 1200
            ? 350
            : timelineViewportWidth >= 992
              ? 315
              : 250;

        const rightAnchor = Math.max(contentRightAbs, groupLeft + 320);
        const availableWidth = Math.max(220, containerWidth - rightAnchor - imageGap);
        const targetWidth = Math.max(220, Math.min(desiredImageWidth, availableWidth));
        const targetHeight = Math.round(targetWidth * 0.75);

        const imageZoneLeft = rightAnchor + imageGap;
        const imageZoneWidth = Math.max(targetWidth, containerWidth - imageZoneLeft);
        let targetLeft = imageZoneLeft + Math.max(0, (imageZoneWidth - targetWidth) / 2);
        if (targetLeft + targetWidth > containerWidth) {
          targetLeft = Math.max(rightAnchor + 6, containerWidth - targetWidth);
        }

        const alignOffset = timelineViewportWidth < 768 ? 2 : 4;
        const targetTop = Math.max(0, Math.round(firstRowTopAbs - alignOffset));

        timelineImageWrap.classList.add('timeline-side-image-frame');
        timelineImage.classList.add('timeline-side-image-bg');

        timelineImageWrap.style.setProperty('width', `${Math.round(targetWidth)}px`, 'important');
        timelineImageWrap.style.setProperty('height', `${Math.round(targetHeight)}px`, 'important');
        timelineImageWrap.style.setProperty('left', `${Math.round(targetLeft)}px`, 'important');
        timelineImageWrap.style.setProperty('top', `${Math.round(targetTop)}px`, 'important');
        timelineImageWrap.style.setProperty('border-radius', timelineViewportWidth < 768 ? '14px' : '18px', 'important');

        timelineImage.style.setProperty('width', `${Math.round(targetWidth)}px`, 'important');
        timelineImage.style.setProperty('height', `${Math.round(targetHeight)}px`, 'important');
        timelineImage.style.setProperty('left', '0px', 'important');
        timelineImage.style.setProperty('top', '0px', 'important');
        timelineImage.style.setProperty('background-size', 'cover', 'important');
        timelineImage.style.setProperty('background-position', 'center', 'important');
        timelineImage.style.setProperty('border-radius', 'inherit', 'important');
        }
      }

      if (timelineImage && data.timeline.sideImage) {
        timelineImage.style.backgroundImage = `url("${data.timeline.sideImage}")`;
      }
    }

    // 7. Journey
    const journeySection = document.getElementById('SECTION23');
    if (journeySection && data.journey) {
      const journeyTitle = document.querySelector('#HEADLINE_JOURNEY h3');
      if (journeyTitle) {
        journeyTitle.textContent = data.journey.sectionTitle || 'Hành Trình HUIT FEST';
      }

      const journeyContainer = journeySection.querySelector('.ladi-container');

      // Define all 5 potential slots in the LadiPage template with their text and image containers
      const journeySlots = [
        {
          groups: ['GROUP276', 'GROUP274'],
          title: '#HEADLINE192 .ladi-headline',
          desc: '#PARAGRAPH153 .ladi-paragraph',
          image: '#IMAGE211 .ladi-image-background',
        },
        {
          groups: ['GROUP277', 'GROUP275'],
          title: '#HEADLINE193 .ladi-headline',
          desc: '#PARAGRAPH154 .ladi-paragraph',
          image: '#IMAGE212 .ladi-image-background',
        },
        {
          groups: ['GROUP280', 'GROUP279'],
          title: '#HEADLINE195 .ladi-headline',
          desc: '#PARAGRAPH156 .ladi-paragraph',
          image: '#IMAGE216 .ladi-image-background',
        },
        {
          groups: ['GROUP282', 'GROUP281'],
          title: '#HEADLINE196 .ladi-headline',
          desc: '#PARAGRAPH157 .ladi-paragraph',
          image: '#IMAGE217 .ladi-image-background',
        },
        {
          groups: ['GROUP284', 'GROUP283'],
          title: '#HEADLINE197 .ladi-headline',
          desc: '#PARAGRAPH158 .ladi-paragraph',
          image: '#IMAGE218 .ladi-image-background',
        },
      ];

      const cards = Array.isArray(data.journey.items) ? data.journey.items : [];

      journeySlots.forEach((slot, i) => {
        const card = cards[i];
        const isVisible = !!card;

        // Force show/hide the entire slot groups
        slot.groups.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.style.setProperty('display', isVisible ? 'block' : 'none', 'important');
            el.style.setProperty('visibility', isVisible ? 'visible' : 'hidden', 'important');
            el.style.setProperty('opacity', isVisible ? '1' : '0', 'important');
          }
        });

        if (isVisible) {
          const titleEl = document.querySelector(slot.title);
          const descEl = document.querySelector(slot.desc);
          const imageEl = document.querySelector(slot.image);

          if (titleEl) titleEl.textContent = card.title || '';
          if (descEl) descEl.textContent = card.description || '';
          if (imageEl) {
            if (card.image) {
              imageEl.style.setProperty('background-image', `url("${card.image}")`, 'important');
            } else {
              // Keep original or set placeholder if no image provided from CMS
              // imageEl.style.backgroundImage = 'none';
            }
          }
        }
      });

      // Adjust section height based on visible cards (CRITICAL FIX)
      if (journeyContainer) {
        if (!journeySection.dataset.cmsBaseHeight) {
          journeySection.dataset.cmsBaseHeight = String(journeySection.offsetHeight);
        }

        // Decorative elements to hide if we have few cards to avoid large gaps
        const decorIds = ['IMAGE228', 'IMAGE213', 'IMAGE210', 'IMAGE214', 'IMAGE222', 'IMAGE229'];
        decorIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
             // Hide if less than 4 cards to keep layout compact, or just hide if we want total control
             el.style.setProperty('display', cards.length > 3 ? 'block' : 'none', 'important');
          }
        });

        // Delay height calculation slightly
        setTimeout(() => {
          const children = Array.from(journeyContainer.children);
          let maxBottom = 0;
          
          children.forEach(el => {
            const style = window.getComputedStyle(el);
            const id = el.id || '';
            const isContent = id.startsWith('GROUP') || id === 'HEADLINE_JOURNEY';
            
            if (el && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0 && isContent) {
              maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
            }
          });
          
          if (maxBottom > 0) {
            const isMobile = window.innerWidth < 992;
            const extraGap = isMobile ? 10 : 50;
            journeySection.style.setProperty('height', `${maxBottom + extraGap}px`, 'important');
          } else {
            // Fallback to minimal height if totally empty
            journeySection.style.setProperty('height', cards.length === 0 ? '0px' : (window.innerWidth < 992 ? 'auto' : '600px'), 'important');
          }
          if (journeySection) {
             journeySection.classList.add('cms-loaded');
          }
        }, 1500); // Give enough time for LadiPage to hide/show things
      } else {
        journeySection.classList.add('cms-loaded');
      }
    }

    // 8. Video
    if (data.video && data.video.videoUrl) {
      const iframe = document.querySelector('#EVENT_VIDEO_SECTION iframe');
      if (iframe) iframe.src = data.video.videoUrl;
      const vTitle = document.querySelector('.event-video-title');
      if (vTitle) vTitle.textContent = data.video.sectionTitle;
    }

    // 9. Rules (Section 9)
    if (data.rules) {
       const rulesBody = document.querySelector('#GROUP322 .ladi-headline');
       const rulesTitle = document.querySelector('#HEADLINE254 h3');
       
       if (rulesTitle) {
          rulesTitle.textContent = data.rules.sectionTitle || 'QUY ĐỊNH CHUNG';
       }

       if (rulesBody) {
          if (Array.isArray(data.rules.items) && data.rules.items.length > 0) {
             rulesBody.innerHTML = data.rules.items.map(item => {
               // Only show the content body, with line breaks
               return `<div>${(item.content || '').replace(/\n/g, '<br>')}</div>`;
             }).join('<br>');
          } else if (data.rules.content) {
             rulesBody.innerHTML = data.rules.content.replace(/\n/g, '<br>');
          }

          // Force height update for Rules Section to avoid collapsing
          const rulesSection = document.getElementById('SECTION27');
          const rulesGroup = document.getElementById('GROUP322');
          if (rulesSection && rulesGroup) {
             rulesGroup.style.height = 'auto';
             rulesBody.style.height = 'auto';
             
             setTimeout(() => {
                const contentHeight = rulesBody.offsetHeight || rulesBody.scrollHeight;
                rulesGroup.style.setProperty('height', `${contentHeight + 20}px`, 'important');
                
                const sHeight = rulesGroup.offsetTop + contentHeight + 80;
                rulesSection.style.setProperty('height', `${Math.max(300, sHeight)}px`, 'important');
             }, 350);
          }
       }
    }

    // 10. Footer (Sponsors)
    const footerSec = document.getElementById('SECTION29');
    const footerContainer = footerSec ? footerSec.querySelector('.ladi-container') : null;

    if (footerSec && footerContainer && data.footer && Array.isArray(data.footer.logos)) {
      const fTitle = footerSec.querySelector('#HEADLINE256 h3');
      if (fTitle) {
        fTitle.textContent = data.footer.title || data.footer.sectionTitle || 'ĐƠN VỊ BẢO TRỢ TRUYỀN THÔNG';
      }

      const logos = data.footer.logos.filter((l) => l && l.image);
      const originalLogos = [
        document.getElementById('IMAGE269'),
        document.getElementById('IMAGE270'),
        document.getElementById('IMAGE271')
      ].filter(Boolean);

      if (!footerSec.dataset.cmsBaseHeight) {
        footerSec.dataset.cmsBaseHeight = String(footerSec.offsetHeight);
      }

      // Hide static logos from template and cleanup previous dynamic nodes.
      originalLogos.forEach((el) => {
        el.style.display = 'none';
      });
      footerContainer.querySelectorAll('.ladi-element.cms-clone-sponsor').forEach((el) => el.remove());

      const oldGrid = footerContainer.querySelector('.cms-footer-logo-grid');
      if (oldGrid) {
        oldGrid.remove();
      }
      const oldMarquee = footerContainer.querySelector('.cms-footer-logo-marquee');
      if (oldMarquee) {
        oldMarquee.remove();
      }

      if (logos.length === 0) {
        footerSec.style.setProperty('height', `${Number(footerSec.dataset.cmsBaseHeight)}px`, 'important');
      } else {
        ensureFooterLogoMarqueeStyles();

        const firstLogoTop = originalLogos.length > 0 ? originalLogos[0].offsetTop : 180;
        const titleWrap = footerSec.querySelector('#HEADLINE256');
        const titleBottom = titleWrap
          ? (titleWrap.offsetTop + titleWrap.offsetHeight)
          : (firstLogoTop - 40);
        const marqueeTop = Math.max(firstLogoTop, titleBottom + 24);
        const marquee = document.createElement('div');
        marquee.className = 'cms-footer-logo-marquee';
        marquee.style.top = `${marqueeTop}px`;

        const track = document.createElement('div');
        track.className = 'cms-footer-logo-track';

        // Duplicate list for seamless loop while keeping all logos on a single row.
        const loopLogos = logos.concat(logos);
        loopLogos.forEach((logo, i) => {
          const item = document.createElement('div');
          item.className = 'cms-footer-logo-item';

          const img = document.createElement('img');
          img.src = logo.image;
          img.alt = logo.name || `logo-${(i % logos.length) + 1}`;

          item.appendChild(img);
          track.appendChild(item);
        });

        const speed = Math.max(18, Math.min(48, logos.length * 4));
        track.style.setProperty('--cms-footer-speed', `${speed}s`);

        marquee.appendChild(track);
        footerContainer.appendChild(marquee);

        // Keep section compact because logos are now always one horizontal row.
        const targetHeight = Math.ceil(marqueeTop + 98 + 52);
        const baseHeight = Number(footerSec.dataset.cmsBaseHeight || footerSec.offsetHeight);
        footerSec.style.setProperty('height', `${Math.max(baseHeight, targetHeight)}px`, 'important');
      }
    }
  }

  // Initial apply with multiple stages to handle LadiPage initialization
  let isCleaningUp = false;
  // Initialize once to avoid race conditions that re-apply stale cache.
  function init() {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;

    const run = () => {
      if (isCleaningUp) return;
      loadData();
      initArtistSwiper();
    };

    run();
  }

  init();

  // Listen for storage changes from admin tab
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) {
      return;
    }
    // Always reload from API to avoid applying malformed/stale draft payloads from other tabs.
    loadData();
  });
})();
