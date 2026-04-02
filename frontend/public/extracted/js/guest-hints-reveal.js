(() => {
  const guestData = {
    mono: {
      revealed: true,
      title: 'MONO',
      description:
        'Nghệ sĩ trẻ mang màu sắc hiện đại, liên tục tạo hiệu ứng mạnh trên các sân khấu lễ hội và nền tảng số.',
      hints: [
        { type: 'text', content: 'Phong cách trình diễn giàu năng lượng, dễ khuấy động đám đông.' },
        { type: 'text', content: 'Sở hữu nhiều ca khúc có hàng chục triệu lượt nghe.' },
      ],
    },
    orange: {
      revealed: true,
      title: 'Orange',
      description:
        'Nữ nghệ sĩ có chất giọng nội lực, cá tính và giàu cảm xúc, thường xuyên góp mặt trong các sân khấu âm nhạc lớn.',
      hints: [
        { type: 'text', content: 'Nổi bật với các bản phối hiện đại và cách xử lý vocal riêng biệt.' },
        { type: 'text', content: 'Thường tạo ấn tượng mạnh ở các phần high-note live.' },
      ],
    },
    'guest-02': {
      revealed: false,
      title: 'Khách mời #02',
      description: 'Khách mời chưa công bố. Hãy dựa vào các hint sau để đoán.',
      hints: [
        { type: 'text', content: 'Nam nghệ sĩ với nhiều bản hit pop/rap đang thịnh hành.' },
        { type: 'image', src: '/assets/images/animation/notela.png', caption: 'Hint hình ảnh: năng lượng sân khấu rất cao.' },
      ],
    },
    'guest-03': {
      revealed: false,
      title: 'Khách mời #03',
      description: 'Khách mời chưa công bố. Hãy thử đoán từ màu sắc âm nhạc và phong cách biểu diễn.',
      hints: [
        { type: 'text', content: 'Nghệ danh gợi liên tưởng đến một sắc màu.' },
        { type: 'image', src: '/assets/images/animation/notepha.png', caption: 'Hint hình ảnh: phong cách tươi sáng, hiện đại.' },
      ],
    },
    'guest-05': {
      revealed: false,
      title: 'Khách mời #05',
      description: 'Khách mời chưa công bố. Hệ thống sẽ cập nhật thêm hint theo từng giai đoạn.',
      hints: [
        { type: 'text', content: 'Nổi bật trong các playlist nhạc trẻ năm gần đây.' },
        { type: 'text', content: 'Từng góp mặt ở nhiều festival đông khán giả.' },
      ],
    },
  };

  function createHintItem(hint) {
    const item = document.createElement('article');
    item.className = 'music-guest-hint-item';

    if (hint.type === 'image' && hint.src) {
      const image = document.createElement('img');
      image.src = hint.src;
      image.alt = hint.caption || 'Hint khách mời';
      item.appendChild(image);
    }

    const text = document.createElement('p');
    text.textContent = hint.content || hint.caption || 'Hint đang được cập nhật.';
    item.appendChild(text);
    return item;
  }

  function getCardDrivenDetail(card, guestId) {
    if (!card) return null;

    const titleEl = card.querySelector('.music-guest-name');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const revealed = card.classList.contains('is-revealed');
    const description = card.getAttribute('data-guest-description') || '';
    const hintsRaw = card.getAttribute('data-guest-hints') || '[]';

    let hints = [];
    try {
      const parsed = JSON.parse(hintsRaw);
      if (Array.isArray(parsed)) hints = parsed;
    } catch (e) {
      hints = [];
    }

    if (!title && !description && hints.length === 0) {
      return null;
    }

    return {
      revealed,
      title: title || guestId || 'Chưa công bố',
      description: description || 'Thông tin khách mời đang được cập nhật.',
      hints,
    };
  }

  function renderGuestDetail(guestId, detailElements, card) {
    const cardDetail = getCardDrivenDetail(card, guestId);
    const detail =
      cardDetail ||
      guestData[guestId] || {
        revealed: false,
        title: 'Chưa có dữ liệu',
        description: 'Thông tin khách mời đang được cập nhật.',
        hints: [],
      };

    const { detailEl, statusEl, titleEl, descEl, hintsEl } = detailElements;
    if (detailEl) {
      detailEl.classList.remove('is-hidden');
      detailEl.classList.remove('is-open');
      void detailEl.offsetWidth;
      detailEl.classList.add('is-open');
    }
    statusEl.textContent = detail.revealed ? '' : 'CHUA CONG BO';
    statusEl.classList.toggle('is-hidden', !!detail.revealed);
    statusEl.classList.toggle('is-revealed', !!detail.revealed);
    titleEl.textContent = detail.title;
    descEl.textContent = detail.description;

    hintsEl.innerHTML = '';
    if (detail.revealed) {
      hintsEl.style.display = 'none';
      return;
    }

    hintsEl.style.display = '';
    detail.hints.forEach((hint) => {
      hintsEl.appendChild(createHintItem(hint));
    });
  }

  function resolveDetailElements(section) {
    if (!section) return null;

    const detailEl = section.querySelector('[data-guest-detail]');
    const statusEl = section.querySelector('[data-guest-status]');
    const titleEl = section.querySelector('[data-guest-title]');
    const descEl = section.querySelector('[data-guest-desc]');
    const hintsEl = detailEl ? detailEl.querySelector('[data-guest-hints]') : null;

    if (!detailEl || !statusEl || !titleEl || !descEl || !hintsEl) {
      return null;
    }

    return { detailEl, statusEl, titleEl, descEl, hintsEl };
  }

  function initGuestHintRevealSection(section) {
    if (!section) {
      return;
    }

    const cards = section.querySelectorAll('[data-guest-id]');
    const detailElements = resolveDetailElements(section);
    if (!cards.length || !detailElements) {
      return;
    }

    const { detailEl } = detailElements;
    cards.forEach((card) => {
      if (card.__guestRevealBound) {
        return;
      }

      card.__guestRevealBound = true;
      card.dataset.guestRevealBound = '1';
      card.addEventListener('click', () => {
        const guestId = card.getAttribute('data-guest-id');
        if (!guestId) return;

        const activeCard = section.querySelector('.music-guest-card.is-active');
        const activeGuestId = activeCard ? activeCard.getAttribute('data-guest-id') : null;
        const isPanelOpen = !detailEl.classList.contains('is-hidden');

        if (activeGuestId === guestId && isPanelOpen) {
          cards.forEach((item) => {
            if (item.getAttribute('data-guest-id') === guestId) {
              item.classList.remove('is-active');
            }
          });
          detailEl.classList.remove('is-open');
          detailEl.classList.add('is-hidden');
          return;
        }

        cards.forEach((item) => item.classList.remove('is-active'));
        cards.forEach((item) => {
          if (item.getAttribute('data-guest-id') === guestId) {
            item.classList.add('is-active');
          }
        });
        renderGuestDetail(guestId, detailElements, card);
      });
    });

    if (!section.__guestRevealInitialized) {
      detailEl.classList.add('is-hidden');
      section.__guestRevealInitialized = true;
    }

    section.dataset.guestRevealBound = '1';
  }

  function initGuestHintReveal() {
    const primarySection = document.getElementById('MUSIC_HINT_SECTION');
    if (primarySection) {
      initGuestHintRevealSection(primarySection);
    }

    const secondarySections = document.querySelectorAll('[data-secondary-artist-section="1"]');
    secondarySections.forEach((section) => initGuestHintRevealSection(section));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuestHintReveal);
  } else {
    initGuestHintReveal();
  }

  // Globally expose refresh to allow cms-bridge.js to trigger update on data change
  window.refreshActiveGuestDetail = () => {
    const sections = document.querySelectorAll('#MUSIC_HINT_SECTION, [data-secondary-artist-section="1"]');

    sections.forEach((section) => {
      const activeCard = section.querySelector('.music-guest-card.is-active');
      if (!activeCard) return;

      const guestId = activeCard.getAttribute('data-guest-id');
      const detailElements = resolveDetailElements(section);
      if (!guestId || !detailElements) return;

      renderGuestDetail(guestId, detailElements, activeCard);
    });
  };

  // Expose init helper for dynamically injected sections (artists list 2)
  window.initGuestHintRevealSection = (sectionOrSelector) => {
    if (!sectionOrSelector) return;

    if (typeof sectionOrSelector === 'string') {
      document.querySelectorAll(sectionOrSelector).forEach((section) => {
        initGuestHintRevealSection(section);
      });
      return;
    }

    initGuestHintRevealSection(sectionOrSelector);
  };
})();
