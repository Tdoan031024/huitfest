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
    }

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
        extraWrap.style.gridTemplateColumns = columns === 3 ? `repeat(3, ${cardWidth}px)` : `${cardWidth}px`;
        extraWrap.style.columnGap = `${colGap}px`;
        extraWrap.style.rowGap = '16px';
        extraWrap.style.width = columns === 3
          ? `${cardWidth * 3 + colGap * 2}px`
          : `${cardWidth}px`;
        extraWrap.style.zIndex = '3';

        for (let i = 3; i < steps.length; i += 1) {
          const step = steps[i];
          const card = document.createElement('article');
          card.className = 'cms-ticket-extra-card';
          card.style.position = 'relative';
          card.style.width = `${cardWidth}px`;
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

        const noteTop = steps.length > 3
          ? Math.max(baseNoteTop, stepBottom + 24)
          : baseNoteTop;

        noteGroup.style.top = `${noteTop}px`;

        const minSectionHeight = noteTop + noteGroup.offsetHeight + 32;
        sectionEl.style.height = `${Math.max(baseSectionHeight, minSectionHeight)}px`;
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

      // 6.2 Handle cloning for items > 5
      if (timelineInner && items.length > 0 && timelineItems.length > items.length) {
        const template = items[items.length - 1]; // Use last slot as template
        const first = items[0];
        const next = items[1] || items[0];
        
        const rowGap = (next !== first) 
          ? (next.offsetTop - first.offsetTop) 
          : (first.offsetHeight + 20);

        const actualRowGap = Math.max(20, rowGap + 12); // Extra breathing room
        const baseTop = template.offsetTop; // Start from the last static item's position
        const leftStart = template.offsetLeft;

        for (let i = items.length; i < timelineItems.length; i += 1) {
          const dynamicIndex = i - (items.length - 1); // Relative to the last static item
          const item = timelineItems[i];
          const clone = template.cloneNode(true);
          
          clone.removeAttribute('id');
          clone.dataset.cmsDynamic = 'timeline-item';
          clone.classList.add('cms-timeline-item-dynamic');
          clone.classList.remove('ladi-animation');
          clone.querySelectorAll('.ladi-animation').forEach((el) => el.classList.remove('ladi-animation'));

          clone.style.setProperty('display', 'block', 'important'); 
          clone.style.position = 'absolute';
          clone.style.setProperty('top', `${baseTop + (dynamicIndex * actualRowGap)}px`, 'important');
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
        }

        // 6.3 Update heights
        const lastDynamicIndex = timelineItems.length - items.length;
        const lastItemOffset = baseTop + (lastDynamicIndex * actualRowGap);
        const totalInnerHeight = lastItemOffset + template.offsetHeight + 20;

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

      const timelineImage = document.querySelector('#IMAGE264 .ladi-image-background');
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
            journeySection.style.setProperty('height', `${maxBottom + 50}px`, 'important');
          } else {
            // Fallback to minimal height if totally empty
            journeySection.style.setProperty('height', cards.length === 0 ? '0px' : '600px', 'important');
          }
          if (journeySection) {
             const videoSec = document.getElementById('EVENT_VIDEO_SECTION');
             if (videoSec) videoSec.style.setProperty('margin-top', '20px', 'important');
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

      if (logos.length === 0) {
        footerSec.style.setProperty('height', `${Number(footerSec.dataset.cmsBaseHeight)}px`, 'important');
      } else {
        const firstLogoTop = originalLogos.length > 0 ? originalLogos[0].offsetTop : 180;
        const titleWrap = footerSec.querySelector('#HEADLINE256');
        const titleBottom = titleWrap
          ? (titleWrap.offsetTop + titleWrap.offsetHeight)
          : (firstLogoTop - 40);
        const gridTop = Math.max(firstLogoTop, titleBottom + 24);
        const grid = document.createElement('div');
        grid.className = 'cms-footer-logo-grid';
        grid.style.position = 'absolute';
        grid.style.left = '0';
        grid.style.right = '0';
        grid.style.top = `${gridTop}px`;
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
        grid.style.gap = '24px 28px';
        grid.style.padding = '0 40px';
        grid.style.justifyItems = 'center';
        grid.style.alignItems = 'center';
        grid.style.zIndex = '2';

        logos.forEach((logo, i) => {
          const item = document.createElement('div');
          item.className = 'cms-footer-logo-item';
          item.style.width = '170px';
          item.style.maxWidth = '100%';
          item.style.height = '96px';
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.justifyContent = 'center';

          const img = document.createElement('img');
          img.src = logo.image;
          img.alt = logo.name || `logo-${i + 1}`;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          img.style.objectFit = 'contain';

          item.appendChild(img);
          grid.appendChild(item);
        });

        footerContainer.appendChild(grid);

        // Stretch section height to fit all DB logos reliably.
        const containerRect = footerContainer.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const gridBottomInContainer = (gridRect.bottom - containerRect.top);
        const targetHeight = Math.ceil(gridBottomInContainer + 48);
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
