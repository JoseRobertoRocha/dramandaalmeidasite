/* Brivon — free HTML template. Minimal vanilla JS: mobile drawer + scroll-reveal. */
(function () {
  'use strict';

  // Mobile drawer
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = drawer && drawer.querySelector('.drawer-close');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (toggle) toggle.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeDrawer();
  });

  // Reveal on intersect (respects prefers-reduced-motion)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Preloader — logo panel, splits open once the page has finished loading.
  const preloader = document.getElementById('preloader');
  if (preloader) {
    document.body.style.overflow = 'hidden';

    function removePreloader() {
      preloader.remove();
      document.body.style.overflow = '';
    }

    if (reduced) {
      // Transitions are force-disabled for reduced motion (see the media
      // query at the bottom of styles.css), so "transitionend" would never
      // fire — just drop it instantly instead of animating.
      removePreloader();
    } else {
      const MIN_VISIBLE = 900; // let the logo fade in before it can leave
      const shownAt = Date.now();

      function leave() {
        const elapsed = Date.now() - shownAt;
        const wait = Math.max(0, MIN_VISIBLE - elapsed);
        window.setTimeout(function () {
          preloader.classList.add('leaving');
          const leftPanel = preloader.querySelector('.preloader-panel--left');
          leftPanel.addEventListener('transitionend', removePreloader, { once: true });
          // Fallback in case the transition event never fires for any reason.
          window.setTimeout(removePreloader, 2000);
        }, wait);
      }

      requestAnimationFrame(function () {
        preloader.classList.add('ready');
      });

      if (document.readyState === 'complete') {
        leave();
      } else {
        window.addEventListener('load', leave);
      }
    }
  }

  if (!reduced && 'IntersectionObserver' in window) {
    const els = document.querySelectorAll('.reveal');
    if (els.length) {
      els.forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)';
      });
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -10% 0px' });
      els.forEach(function (el) { io.observe(el); });
    }
  }

  // Sticky header subtle shadow on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    let last = 0;
    window.addEventListener('scroll', function () {
      const y = window.scrollY;
      if (y > 4 && last <= 4) header.style.boxShadow = '0 8px 24px -16px rgba(0,0,0,0.6)';
      if (y <= 4 && last > 4) header.style.boxShadow = 'none';
      last = y;
    }, { passive: true });
  }

  // Services carousel — native horizontal scroll + scroll-snap (works with
  // touch swipe for free). Ping-pong: advances 1→2→3→4→5, then reverses
  // 5→4→3→2→1, then forward again — no wraparound, so no clones needed.
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    const track = root.querySelector('[data-carousel-track]');
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const dotsWrap = root.querySelector('[data-carousel-dots]');
    if (!track) return;

    // Browsers redirect a plain vertical mouse-wheel/trackpad scroll into
    // horizontal scroll when the cursor is over a horizontal-only overflow
    // container — great for scrolling the carousel with a wheel, but it
    // also traps the page (you can't scroll down while hovering it). Some
    // browsers already convert the gesture to deltaX before it even reaches
    // this handler, so comparing axes isn't reliable — always forward wheel
    // input on the track to the page instead. Carousel navigation is still
    // fully covered by the arrows/dots/autoplay/touch-swipe.
    track.addEventListener('wheel', function (e) {
      e.preventDefault();
      window.scrollBy({ top: e.deltaY, left: 0 });
    }, { passive: false });

    const cards = Array.prototype.slice.call(track.children);
    const count = cards.length;
    if (count < 2) return;

    let index = 0;
    let direction = 1; // 1 = advancing forward, -1 = reversing back

    function step() {
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
      return track.children[0].getBoundingClientRect().width + gap;
    }

    function goTo(i) {
      track.scrollTo({ left: i * step(), behavior: 'smooth' });
    }

    function updateDots() {
      if (!dotsWrap) return;
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        dot.classList.toggle('active', i === index);
      });
    }

    // One tick of the bounce: step in the current direction, and flip
    // direction the moment either end is reached.
    function tick() {
      index += direction;
      if (index >= count - 1) { index = count - 1; direction = -1; }
      else if (index <= 0) { index = 0; direction = 1; }
      goTo(index);
      updateDots();
    }

    function next() {
      direction = 1;
      index = Math.min(index + 1, count - 1);
      if (index === count - 1) direction = -1;
      goTo(index);
      updateDots();
    }

    function prev() {
      direction = -1;
      index = Math.max(index - 1, 0);
      if (index === 0) direction = 1;
      goTo(index);
      updateDots();
    }

    if (dotsWrap) {
      cards.forEach(function (_, i) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Ir para o item ' + (i + 1));
        dot.addEventListener('click', function () {
          direction = i >= index ? 1 : -1;
          index = i;
          goTo(index);
          updateDots();
        });
        dotsWrap.appendChild(dot);
      });
    }

    if (nextBtn) nextBtn.addEventListener('click', function () { stopAutoplay(); next(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { stopAutoplay(); prev(); startAutoplay(); });

    let timer = null;
    function startAutoplay() {
      if (reduced) return;
      stopAutoplay();
      timer = window.setInterval(tick, 4200);
    }
    function stopAutoplay() {
      if (timer) window.clearInterval(timer);
    }

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    root.addEventListener('touchstart', stopAutoplay, { passive: true });
    root.addEventListener('touchend', startAutoplay);

    startAutoplay();
  });

  // Gallery lightbox — click a photo to enlarge, with prev/next + Esc/arrow
  // keys + click-outside to close. Slots with no photo uploaded yet have no
  // <img>, so they're skipped over when navigating instead of opening blank.
  const galleryItems = Array.prototype.slice.call(document.querySelectorAll('[data-gallery-item]'));
  const lightbox = document.querySelector('[data-lightbox]');
  if (galleryItems.length && lightbox) {
    const lbImg = lightbox.querySelector('[data-lightbox-img]');
    const closeBtn = lightbox.querySelector('[data-lightbox-close]');
    const prevBtn = lightbox.querySelector('[data-lightbox-prev]');
    const nextBtn = lightbox.querySelector('[data-lightbox-next]');
    let current = 0;

    function openAt(i) {
      const img = galleryItems[i].querySelector('img[data-slot]');
      if (!img) return;
      current = i;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    function show(delta) {
      for (let n = 0, i = current; n < galleryItems.length; n++) {
        i = (i + delta + galleryItems.length) % galleryItems.length;
        if (galleryItems[i].querySelector('img[data-slot]')) { openAt(i); return; }
      }
    }

    galleryItems.forEach(function (item, i) {
      item.addEventListener('click', function () { openAt(i); });
    });
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function () { show(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(1); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') show(-1);
      if (e.key === 'ArrowRight') show(1);
    });
  }
})();
