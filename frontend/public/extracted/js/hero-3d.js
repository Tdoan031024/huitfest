(() => {
  const hero = document.getElementById('SECTION14');
  if (!hero) return;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function setTarget(clientX, clientY) {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = clamp((clientX - rect.left) / rect.width, 0, 1) - 0.5;
    const ny = clamp((clientY - rect.top) / rect.height, 0, 1) - 0.5;

    targetX = nx * 20;
    targetY = ny * 14;
  }

  hero.addEventListener(
    'pointermove',
    (event) => {
      setTarget(event.clientX, event.clientY);
    },
    { passive: true },
  );

  hero.addEventListener(
    'pointerleave',
    () => {
      targetX = 0;
      targetY = 0;
    },
    { passive: true },
  );

  hero.addEventListener(
    'touchmove',
    (event) => {
      const touch = event.touches && event.touches[0];
      if (touch) setTarget(touch.clientX, touch.clientY);
    },
    { passive: true },
  );

  hero.addEventListener(
    'touchend',
    () => {
      targetX = 0;
      targetY = 0;
    },
    { passive: true },
  );

  function animate() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    hero.style.setProperty('--hero-mx', `${currentX.toFixed(2)}px`);
    hero.style.setProperty('--hero-my', `${currentY.toFixed(2)}px`);

    requestAnimationFrame(animate);
  }

  animate();
})();
