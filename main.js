(() => {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /* The whole layout scales with the window: the composition is identical on every screen and at any browser zoom. */
  const mobileMq = matchMedia('(max-width: 899px)');
  let scale = 1;
  let pageWidth = root.clientWidth;
  function fit() {
    pageWidth = $('#stage').clientWidth || root.clientWidth;
    scale = pageWidth / 1920;
    root.style.setProperty('--s', scale);
    root.style.setProperty('--pl', Math.max(scale, 0.6));
    root.style.setProperty('--ts', mobileMq.matches ? 1 : Math.max(scale, 0.8));
    const ringHost = $('#mRingHost');
    if (ringHost && ringHost.offsetWidth) root.style.setProperty('--ring-k', ringHost.offsetWidth / 141.22);
    $$('dialog[open]').forEach(sizeModal);
  }
  function sizeModal(dialog) {
    const vw = pageWidth;
    const vh = innerHeight;
    const w = dialog.offsetWidth;
    const h = dialog.offsetHeight;
    const k = mobileMq.matches ? Math.min(1, (vw * 0.94) / w) : Math.min(Math.max(scale, 0.75), (vw * 0.96) / w, (vh * 0.94) / h);
    dialog.style.setProperty('--ms', k);
  }
  addEventListener('resize', fit);

  /* The page has one fixed size: browser zoom gestures and shortcuts are switched off. */
  addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) e.preventDefault();
  });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => document.addEventListener(type, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  fit();

  /* Reveal on scroll. */
  const clipped = new Set(['mask', 'wipe', 'wipe-up', 'arch']);
  const proxied = new Map();
  const settle = (target) => {
    const delay = parseFloat(target.style.getPropertyValue('--d')) || 0;
    setTimeout(() => target.classList.add('settled'), delay + 1200);
  };
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const target = proxied.get(entry.target) || entry.target;
      target.classList.add('in');
      reveal.unobserve(entry.target);
      settle(target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  /* A fully clipped element has no visible area for the observer, so a sibling proxy with the same box is watched instead. */
  const revealables = $$('[data-r]').filter((el) => !el.closest('.extra'));
  function startReveals() {
  revealables.forEach((el) => {
    if (!clipped.has(el.dataset.r)) { reveal.observe(el); return; }
    const proxy = document.createElement('i');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.style.cssText = `position:absolute;pointer-events:none;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px`;
    el.after(proxy);
    proxied.set(proxy, el);
    reveal.observe(proxy);
  });

  /* First-screen safety net: what is on screen at load appears even if observer callbacks are delayed. */
  setTimeout(() => {
    const check = (target, box) => {
      const r = box.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) target.classList.add('in');
    };
    proxied.forEach((target, proxy) => check(target, proxy));
    revealables.forEach((el) => { if (!clipped.has(el.dataset.r)) check(el, el); });
  }, 450);
  }

  /* Ambient loops pause off-screen. */
  const loops = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) target.classList.toggle('off', !isIntersecting);
  });
  $$('[data-loop], .play, .float-book').forEach((el) => loops.observe(el));

  /* Sticky header tucks up a little after the first screen edge. */
  const hdr = $('.hdr');
  const onHeader = () => hdr.classList.toggle('stuck', scrollY > 40);
  onHeader();
  addEventListener('scroll', onHeader, { passive: true });

  /* Rotating КИТМОДЕРН ring: letters are placed by real glyph widths, so the spacing is even all round. */
  const heroRing = $('#ringHost .ring');
  const preRing = $('.pl-ring .ring');
  const mobileRing = $('#mRingHost .ring');
  const RING_TEXT = 'КИТМОДЕРН - КИТМОДЕРН - ';
  const RING_RADIUS = 46;
  const SPIN_FRAMES = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }];
  const SPIN_OPTIONS = { duration: 22000, iterations: Infinity, easing: 'linear' };
  function buildRing(ring) {
    const probe = document.createElement('span');
    ring.append(probe);
    const cs = getComputedStyle(probe);
    const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    probe.remove();
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = font;
    const chars = [...RING_TEXT];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const length = 2 * Math.PI * RING_RADIUS;
    const tracking = (length - widths.reduce((a, b) => a + b, 0)) / chars.length;
    let run = 0;
    ring.textContent = '';
    chars.forEach((c, i) => {
      const middle = run + widths[i] / 2;
      run += widths[i] + tracking;
      if (c === ' ') return;
      const span = document.createElement('span');
      span.textContent = c;
      span.style.transform = `translate(-50%, -50%) rotate(${(middle / length) * 360}deg) translateY(-${RING_RADIUS}px)`;
      ring.append(span);
    });
  }
  const buildRings = () => [heroRing, preRing, mobileRing].forEach((ring) => ring && buildRing(ring));
  buildRings();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildRings);

  let spin = null;
  let mobileSpin = null;
  if (!calm && heroRing.animate) {
    spin = heroRing.animate(SPIN_FRAMES, SPIN_OPTIONS);
    mobileSpin = mobileRing.animate(SPIN_FRAMES, SPIN_OPTIONS);
  }

  /* Parallax (scroll) + depth (mouse), both spring-eased in one loop. */
  const layers = calm ? [] : $$('.par').map((el) => ({
    el,
    speed: parseFloat(el.dataset.par) || 0,
    depth: parseFloat(el.dataset.depth) || 0,
    y: 0, mx: 0, my: 0,
    top: 0, height: 0,
  }));
  function measure() {
    for (const l of layers) {
      const prev = l.el.style.transform;
      l.el.style.transform = 'none';
      const r = l.el.getBoundingClientRect();
      l.top = r.top + scrollY;
      l.height = Math.max(r.height, 1);
      l.el.style.transform = prev;
    }
  }
  if (layers.length) {
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure);
  }

  let mouseX = 0;
  let mouseY = 0;
  if (finePointer && !calm) {
    addEventListener('pointermove', (e) => {
      mouseX = e.clientX / innerWidth - 0.5;
      mouseY = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  let lastScroll = scrollY;
  let velocity = 0;
  function frame() {
    const sy = scrollY;
    const vh = innerHeight;
    velocity += (Math.min(Math.abs(sy - lastScroll), 90) - velocity) * 0.1;
    lastScroll = sy;
    if (spin) { spin.playbackRate = 1 + velocity * 0.22; mobileSpin.playbackRate = spin.playbackRate; }

    for (const l of layers) {
      const visible = sy + vh > l.top - 200 && sy < l.top + l.height + 200;
      if (!visible) continue;
      /* Zero offset at the moment the layer reaches centre, or at page top for the first screen. */
      const centerOffset = sy - Math.max(l.top + l.height / 2 - vh / 2, 0);
      const heroZone = sy < 900;
      const ty = centerOffset * l.speed;
      const tmx = heroZone ? mouseX * l.depth : 0;
      const tmy = heroZone ? mouseY * l.depth * 0.6 : 0;
      l.y += (ty - l.y) * 0.12;
      l.mx += (tmx - l.mx) * 0.08;
      l.my += (tmy - l.my) * 0.08;
      l.el.style.transform = `translate3d(${l.mx.toFixed(2)}px, ${(l.y + l.my).toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(frame);
  }
  if (spin || layers.length) requestAnimationFrame(frame);

  /* Cursor light on plates: transform on one element, no CSS-variable recalculation. */
  if (finePointer) {
    $$('.panel, .tm').forEach((card) => {
      const glow = $('.glow', card);
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        glow.style.transform = `translate3d(${(e.clientX - r.left) / scale}px, ${(e.clientY - r.top) / scale}px, 0)`;
      });
    });
  }

  /* "Показать еще проекты": two more cards, the rest of the page slides down as one block. */
  const EXTRA_HEIGHT = 752;
  const stage = $('#stage');
  const below = $('#below');
  const extra = $('#extraProjects');
  const moreBtn = $('#moreBtn');
  const moreLabel = $('#moreLabel');
  let extraOpen = false;
  let extraTimer = 0;
  function toggleExtra() {
    extraOpen = !extraOpen;
    clearTimeout(extraTimer);
    moreBtn.setAttribute('aria-expanded', String(extraOpen));
    moreLabel.textContent = extraOpen ? 'Скрыть проекты' : 'Показать еще проекты';
    const items = $$('[data-r]', extra);
    if (extraOpen) {
      stage.style.setProperty('--page-x', `${EXTRA_HEIGHT}px`);
      below.style.setProperty('--shift', `${EXTRA_HEIGHT}px`);
      extra.classList.add('open');
      extra.getBoundingClientRect();
      items.forEach((el) => { el.classList.add('in'); settle(el); });
      extraTimer = setTimeout(measure, 820);
    } else {
      /* Keep the button under the cursor while the block closes. */
      scrollTo({ top: Math.max(0, scrollY - EXTRA_HEIGHT), behavior: calm ? 'auto' : 'smooth' });
      below.style.setProperty('--shift', '0px');
      items.forEach((el) => el.classList.remove('in', 'settled'));
      extraTimer = setTimeout(() => {
        extra.classList.remove('open');
        stage.style.setProperty('--page-x', '0px');
        measure();
      }, 780);
    }
  }
  moreBtn.addEventListener('click', toggleExtra);

  /* Team carousel. */
  const win = $('#tm');
  const track = $('#tmTrack');
  const prev = $('#tmPrev');
  const next = $('#tmNext');
  const STEP = 263;
  const cardsAll = [...track.children];
  const maxIndex = Math.max(0, cardsAll.length - 4);
  let index = 0;

  function markRange(first) {
    cardsAll.forEach((card, n) => {
      const out = n < first || n >= first + 4;
      card.classList.toggle('out', out);
      if (!out) card.classList.add('in');
    });
  }
  function go(i) {
    index = Math.min(maxIndex, Math.max(0, i));
    track.style.transform = `translate3d(${-index * STEP}px, 0, 0)`;
    prev.disabled = index === 0;
    next.disabled = index === maxIndex;
    markRange(index);
  }
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  win.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });

  /* Popups: native <dialog> for focus trap and Esc, with an animated close. */
  function openModal(dialog) {
    if (dialog.open) return;
    root.classList.add('lock');
    dialog.showModal();
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll: true });
    sizeModal(dialog);
    dialog.getBoundingClientRect();
    dialog.classList.add('show');
  }
  function closeModal(dialog) {
    if (!dialog.open || dialog.dataset.closing) return;
    dialog.dataset.closing = '1';
    dialog.classList.remove('show');
    setTimeout(() => {
      dialog.close();
      delete dialog.dataset.closing;
      if (!$('dialog[open]')) root.classList.remove('lock');
    }, 230);
  }
  $$('dialog.modal').forEach((dialog) => {
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(dialog); });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) closeModal(dialog);
    });
  });

  /* Project gallery popup. */
  const projects = JSON.parse($('#projectsData').textContent);
  const pm = $('#projectModal');
  const pmStage = $('#pmStage');
  const pmThumbs = $('#pmThumbs');
  const pmCount = $('#pmCount');
  let pmIndex = 0;
  let pmSize = 4;

  function showSlide(i, instant) {
    pmIndex = (i + pmSize) % pmSize;
    pmStage.classList.toggle('instant', !!instant);
    [...pmStage.children].forEach((img, n) => img.classList.toggle('on', n === pmIndex));
    [...pmThumbs.children].forEach((b, n) => {
      b.classList.toggle('on', n === pmIndex);
      b.setAttribute('aria-current', n === pmIndex ? 'true' : 'false');
    });
    pmCount.textContent = `${pmIndex + 1} / ${pmSize}`;
  }
  let lastProject = 0;
  function openProject(p, slide) {
    lastProject = p;
    const d = projects[p];
    const n = p + 1;
    pmSize = 4;
    pmStage.innerHTML = Array.from({ length: pmSize }, (_, k) => `<img src="assets/projects/p${n}-${k + 1}.webp" alt="${d.cat}, ${d.place}, фото ${k + 1}" draggable="false">`).join('');
    pmThumbs.innerHTML = Array.from({ length: pmSize }, (_, k) => `<button type="button" aria-label="Фото ${k + 1}"><img src="assets/projects/p${n}-${k + 1}-t.webp" alt=""></button>`).join('');
    [...pmThumbs.children].forEach((b, k) => b.addEventListener('click', () => showSlide(k)));
    $('#pmEyebrow').textContent = `${d.cat} · ${d.area}`;
    $('#pmTitle').textContent = `${d.cat} в ${d.place.replace(/^ЖК /, 'ЖК ').replace(/^Дом /, 'доме ')}`;
    $('#pmFacts').innerHTML = [['Площадь', d.area], ['Стиль', d.cat], ['Планировка', d.rooms], ['Срок реализации', d.term]].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#pmText').innerHTML = d.text.map((t) => `<p>${t}</p>`).join('');
    showSlide(slide || 0, true);
    openModal(pm);
  }
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-project]');
    if (trigger) openProject(Number(trigger.dataset.project), Number(trigger.dataset.slide || 0));
  });
  $('#pmPrev').addEventListener('click', () => showSlide(pmIndex - 1));
  $('#pmNext').addEventListener('click', () => showSlide(pmIndex + 1));
  pm.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showSlide(pmIndex - 1, true);
    if (e.key === 'ArrowRight') showSlide(pmIndex + 1, true);
  });
  /* Lead popups share one dialog with per-button wording. */
  const LEADS = {
    visit: { eyebrow: 'Производство и шоу-рум', title: 'Приглашаем<br>к нам в гости', sub: 'Оставьте контакты, и мы свяжемся с Вами, чтобы согласовать время визита', btn: 'Согласовать визит', photo: 'assets/img/a8340.webp' },
    better: { eyebrow: 'Проверка предложения', title: 'Сделаем предложение<br>выгоднее', sub: 'Оставьте контакты, и мы свяжемся с Вами, чтобы изучить смету и предложить лучшие условия', btn: 'Получить предложение', photo: 'assets/projects/p3-1.webp' },
    callback: { eyebrow: 'Обратный звонок', title: 'Перезвоним вам<br>в удобное время', sub: 'Оставьте контакты, и мы свяжемся с Вами\u00a0в\u00a0ближайшее время', btn: 'Жду звонка', photo: 'assets/projects/p1-2.webp' },
    project: { eyebrow: 'Похожий проект', title: 'Создадим такой же<br>для вас', sub: 'Оставьте контакты, и мы свяжемся с Вами, чтобы обсудить задачу и рассчитать стоимость', btn: 'Обсудить проект', photo: null },
  };
  const lead = $('#leadModal');
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lead]');
    if (!trigger) return;
    const cfg = LEADS[trigger.dataset.lead];
    $('#leadEyebrow').textContent = cfg.eyebrow;
    $('#leadTitle').innerHTML = cfg.title;
    $('#leadPhoto').src = cfg.photo || `assets/projects/p${lastProject + 1}-1.webp`;
    $('#leadSub').textContent = cfg.sub;
    $('#leadBtn').textContent = cfg.btn;
    $('.form-note', lead).textContent = '';
    $$('.lf, .consent', lead).forEach((f) => f.classList.remove('err'));
    if (pm.open) {
      closeModal(pm);
      setTimeout(() => openModal(lead), 240);
    } else {
      openModal(lead);
    }
  });

  function phoneMask(raw) {
    let d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = `7${d.slice(1)}`;
    if (d[0] !== '7') d = `7${d}`;
    d = d.slice(1, 11);
    let out = '+7';
    if (d.length) out += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ` ${d.slice(3, 6)}`;
    if (d.length > 6) out += `-${d.slice(6, 8)}`;
    if (d.length > 8) out += `-${d.slice(8, 10)}`;
    return out;
  }

  /* Forms validate locally. Set window.KIT_FORM_ENDPOINT to send leads to a real address. */
  $$('[data-form]').forEach((form) => {
    const note = $('.form-note', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      $$('.field, .lf', form).forEach((f) => {
        const input = $('input', f);
        const bad = input.type === 'tel' && 'mask' in form.dataset
          ? input.value.replace(/\D/g, '').length < 11
          : !input.value.trim();
        f.classList.toggle('err', bad);
        if (bad) valid = false;
      });
      const consent = $('.consent', form);
      const agreed = $('input', consent).checked;
      consent.classList.toggle('err', !agreed);
      if (!agreed) valid = false;
      if (!valid) { note.textContent = ''; return; }
      if (!window.KIT_FORM_ENDPOINT) {
        note.textContent = 'Отправка заявок пока не подключена.';
        return;
      }
      try {
        const res = await fetch(window.KIT_FORM_ENDPOINT, { method: 'POST', body: new FormData(form) });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        note.textContent = 'Заявка отправлена, скоро свяжемся с вами.';
      } catch {
        note.textContent = 'Не удалось отправить заявку. Позвоните нам, пожалуйста.';
      }
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'consent' && e.target.checked) e.target.closest('.consent').classList.remove('err');
    });
    form.addEventListener('input', (e) => {
      if (e.target.type === 'tel' && 'mask' in form.dataset) e.target.value = phoneMask(e.target.value);
      const f = e.target.closest('.field, .lf');
      if (f && e.target.value.trim()) f.classList.remove('err');
    });
  });

  /* Links without a destination yet: a small note at the bottom of the screen. */
  const toast = $('#toast');
  let toastTimer = 0;
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-soon]');
    if (!trigger) return;
    $('span', toast).textContent = `Страница «${trigger.dataset.soon}» в разработке`;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 2800);
  });

  /* Crossing the mobile breakpoint (e.g. rotating a tablet) must never leave blocks unrevealed. */
  mobileMq.addEventListener('change', () => {
    $$('[data-r]').forEach((el) => el.classList.add('in', 'settled'));
    fit();
  });

  /* Mobile menu. */
  const burger = $('#mBurger');
  const menu = $('#mMenu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    root.classList.toggle('lock', open);
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $('.m-call').addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', (e) => { if (e.target.closest('a, button')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  mobileMq.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });

  /* Mobile: two more projects slide open. */
  const mExtra = $('#mExtra');
  const mMoreBtn = $('#mMoreBtn');
  mMoreBtn.addEventListener('click', () => {
    const open = mExtra.classList.toggle('open');
    mMoreBtn.setAttribute('aria-expanded', String(open));
    $('#mMoreLabel').textContent = open ? 'Скрыть проекты' : 'Показать еще проекты';
    $$('[data-r]', mExtra).forEach((el) => el.classList.add('in'));
  });
  $$('[data-r]', mExtra).forEach((el) => el.classList.add('in'));

  /* Mobile swipe rows: hint with a counter, progress line, and one small nudge so the row reads as movable. */
  $$('[data-slider]').forEach((row) => {
    const wrap = row.parentElement;
    const bar = $('.m-progress i', wrap);
    const hint = $('.m-swipe', wrap);
    const count = $('.m-count', wrap);
    const total = row.children.length;
    const update = () => {
      const max = row.scrollWidth - row.clientWidth;
      const view = row.clientWidth / Math.max(row.scrollWidth, 1);
      const left = max > 0 ? row.scrollLeft / max : 0;
      bar.style.transform = `translateX(${left * (1 - view) * 100}%) scaleX(${view})`;
      const step = total > 1 ? row.children[1].offsetLeft - row.children[0].offsetLeft : 1;
      const current = row.scrollLeft >= max - 2 ? total : Math.min(total, Math.round(row.scrollLeft / step) + 1);
      count.textContent = `${current} / ${total}`;
      if (row.scrollLeft > 8) hint.classList.add('seen');
    };
    row.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    if (!calm && row.animate) {
      const nudge = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        nudge.disconnect();
        row.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-3.4rem)' }, { transform: 'translateX(0)' }],
          { duration: 1100, delay: 650, easing: 'cubic-bezier(.77, 0, .175, 1)' }
        );
      }, { threshold: 0.5 });
      nudge.observe(row);
    }
  });

  /* Touch swipe in the gallery (phones only: mouse dragging stays off). */
  let touchX = null;
  pmStage.addEventListener('touchstart', (e) => { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  pmStage.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const moved = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(moved) > 40) showSlide(pmIndex + (moved < 0 ? 1 : -1));
  });

  /* Preloader: the КИТМОДЕРН ring spins in the centre, then flies to its place on the first screen. */
  const pre = $('.preloader');
  const plRing = $('.pl-ring');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function finishPreloader() {
    root.classList.remove('loading');
    if (pre) pre.remove();
    if (plRing) plRing.remove();
  }

  async function runPreloader() {
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(700)]);
    buildRings();
    plRing.classList.add('on');
    const preSpin = preRing.animate(SPIN_FRAMES, SPIN_OPTIONS);
    preSpin.playbackRate = 2.6;

    const heroImages = $$(mobileMq.matches ? '.m-hero img' : '#top img').map((img) => (img.decode ? img.decode().catch(() => {}) : null));
    await Promise.all([wait(1150), Promise.race([Promise.all(heroImages), wait(1500)])]);

    startReveals();
    hdr.classList.add('ready');

    const box = $(mobileMq.matches ? '#mRingHost' : '#ringHost').getBoundingClientRect();
    const ringK = box.width / 141.22;
    const flying = plRing.getBoundingClientRect();
    const fromX = flying.left + flying.width / 2;
    const fromY = flying.top + flying.height / 2;
    const toX = box.left + 71.22 * ringK;
    const toY = box.top + 71 * ringK;
    const onScreen = toY > 0 && toY < innerHeight;
    const DURATION = 1000;

    pre.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 760, delay: 180, easing: 'ease', fill: 'forwards' });
    const flight = plRing.animate(
      onScreen
        ? [{ transform: `scale(${1.35 * Math.max(scale, 0.6)})` }, { transform: `translate(${toX - fromX}px, ${toY - fromY}px) scale(${ringK})` }]
        : [{ transform: `scale(${1.35 * Math.max(scale, 0.6)})`, opacity: 1 }, { transform: `scale(${1.1 * Math.max(scale, 0.6)})`, opacity: 0 }],
      { duration: onScreen ? DURATION : 420, easing: 'cubic-bezier(.77, 0, .175, 1)', fill: 'forwards' }
    );
    /* Spin eases from the loading speed to the speed it keeps on the page. */
    const startedAt = performance.now();
    (function slow(now) {
      const t = Math.min(1, (now - startedAt) / DURATION);
      preSpin.playbackRate = 2.6 - 1.6 * t * t * (3 - 2 * t);
      if (t < 1) requestAnimationFrame(slow);
    })(startedAt);

    await flight.finished;
    if (spin) { spin.currentTime = preSpin.currentTime; mobileSpin.currentTime = preSpin.currentTime; }
    finishPreloader();
  }

  if (root.classList.contains('loading') && !calm && pre && plRing && preRing.animate) {
    runPreloader().catch(() => { startReveals(); hdr.classList.add('ready'); finishPreloader(); });
  } else {
    finishPreloader();
    startReveals();
    hdr.classList.add('ready');
  }
})();
