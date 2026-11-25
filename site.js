// Travel 1817 v2 — two clocks: a scroll clock (drift, fills, route, wheel) and a trigger clock (entrances, holds)
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- smooth scroll (mouse/trackpad only) ----------
  let lenis = null;
  if (window.Lenis && fine && motion) {
    lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 5), wheelMultiplier: 1.6, anchors: { offset: -100 } });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // ---------- header: hides going down, returns going up, takes the colour of what's beneath it ----------
  const hdr = document.querySelector('.hdr');
  const themed = $$('[data-theme]');
  let lastY = scrollY;
  const heroEl = document.querySelector('.hero');
  const heroSpan = () => (heroEl ? heroEl.offsetHeight * 0.62 : 0);
  const paintHeader = () => {
    const y = scrollY; const hs = heroSpan();
    if (!document.body.classList.contains('menu-open')) {
      const hide = y > lastY && y > Math.max(140, hs + 40);
      if (Math.abs(y - lastY) > 4) { hdr.classList.toggle('is-hidden', hide); document.body.classList.toggle('hdr-shown', !hide); }
    }
    hdr.classList.toggle('is-solid', y > Math.max(40, hs));
    const probe = hdr.offsetHeight / 2;
    const under = themed.find((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    hdr.classList.toggle('on-dark', (under ? under.dataset.theme : hdr.dataset.start) === 'dark');
    lastY = y;
  };
  document.body.classList.add('hdr-shown');

  // ---------- the page colour behind the phone's own strips (camera area, address bar) ----------
  // iPhones tint those strips with the page colour, so it follows what's on screen: the sky at the top of the
  // hero photo, night once the footer or the menu fills the screen, otherwise the colour at the top edge
  const NIGHT = getComputedStyle(root).getPropertyValue('--night').trim() || '#15110E';
  const PAPER = getComputedStyle(root).getPropertyValue('--paper').trim() || '#F2EDE4';
  const metaTheme = document.querySelector('meta[name="theme-color"]'); const mainOf = document.querySelector('main');
  let sky = null, tinted = '';
  if (heroEl) {
    const im = new Image(); im.src = 'img/hero.webp';
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = 40; c.height = 4; const g = c.getContext('2d'); g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.06, 0, 0, 40, 4); const d = g.getImageData(0, 0, 40, 4).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; sky = `rgb(${Math.round(r / n)}, ${Math.round(gg / n)}, ${Math.round(b / n)})`; tint(); } catch (e) {} };
  }
  const tint = () => {
    const vh = innerHeight; let c = PAPER;
    if (document.body.classList.contains('menu-open') || (mainOf && mainOf.getBoundingClientRect().bottom < vh * 0.5)) c = NIGHT;
    else if (heroEl && sky && heroEl.getBoundingClientRect().bottom > vh * 0.15) c = sky;
    else {
      const top = themed.find((s) => { const r = s.getBoundingClientRect(); return r.top <= 1 && r.bottom > 1; });
      const bg = top ? getComputedStyle(top).backgroundColor : '';
      c = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) ? bg : PAPER;
    }
    if (c === tinted) return; tinted = c;
    root.style.backgroundColor = c; document.body.style.backgroundColor = c; if (metaTheme) metaTheme.content = c;
  };
  addEventListener('scroll', () => { paintHeader(); tint(); }, { passive: true }); paintHeader(); tint();

  const menuBtn = document.querySelector('.hdr__menu'); const menu = document.getElementById('menu');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { menu.hidden = false; requestAnimationFrame(() => { document.body.classList.add('menu-open'); tint(); }); lenis && lenis.stop(); }
    else { document.body.classList.remove('menu-open'); tint(); setTimeout(() => (menu.hidden = true), 400); lenis && lenis.start(); }
  });

  // ---------- destination cards on touch screens: first tap opens the details, second tap goes to the planner ----------
  if (!fine) {
    const cards = $$('.dcard');
    cards.forEach((c) => c.addEventListener('click', (e) => {
      if (c.classList.contains('is-open')) return;
      e.preventDefault(); cards.forEach((o) => o.classList.toggle('is-open', o === c));
    }));
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') menuBtn.click(); });

  // ---------- split text into lines (keeps italics), so each line can rise from its own mask ----------
  // tokens remember whether a space came before them, so "own," keeps its comma
  const tokenize = (el) => {
    const out = []; let gap = true;
    el.childNodes.forEach((n) => {
      const it = n.nodeType === 1 && n.tagName === 'EM';
      (n.textContent || '').split(/(\s+)/).forEach((w) => { if (!w) return; if (!w.trim()) { gap = true; return; } out.push([w, it, gap]); gap = false; });
    });
    return out;
  };
  const join = (toks, wrap) => toks.map((t, i) => (i && t[2] ? ' ' : '') + wrap(t)).join('');
  const splitLines = (el) => {
    if (!el.__tokens) { el.__tokens = tokenize(el); el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim()); }
    const toks = el.__tokens;
    el.innerHTML = join(toks, ([w, it]) => `<span class="tk">${it ? `<em>${w}</em>` : w}</span>`);
    const spans = $$('.tk', el); const lines = []; let top = null;
    spans.forEach((s, i) => { const t = s.offsetTop; if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; } lines[lines.length - 1].push(i); });
    el.innerHTML = lines.map((idx, li) => `<span class="ln" aria-hidden="true" style="--li:${li}"><span>${join(idx.map((i) => toks[i]), ([w, it]) => (it ? `<em>${w}</em>` : w))}</span></span>`).join('');
    el.classList.add('is-split');
  };
  const lineEls = $$('[data-lines]');
  const doSplit = () => lineEls.forEach(splitLines);
  if (motion) {
    doSplit();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(doSplit);
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(doSplit, 200); });
  }

  // words that fill in as you read (scroll-scrubbed)
  const fills = $$('[data-fill]').map((el) => {
    const range = (el.dataset.fill || '').split(',').map(Number);
    const toks = tokenize(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.innerHTML = join(toks, ([w, it]) => `<span class="w" aria-hidden="true">${it ? `<em>${w}</em>` : w}</span>`);
    if (motion) el.classList.add('is-filling');
    return { el, words: $$('.w', el), range: range.length === 2 ? range : null, pin: el.closest('[data-pin]') };
  });

  // ---------- pinned scenes: the section holds still (sticky) while its own clock p runs 0 → 1 ----------
  // [data-at] elements play once p passes their mark; [data-fly] photos travel in from outside the frame.
  // data-pin="desk" only pins on screens big enough to hold the whole scene; elsewhere it reveals on entry.
  const pinRoom = matchMedia('(min-width: 901px) and (min-height: 680px)').matches;
  const pins = motion ? $$('[data-pin]').filter((sec) => sec.dataset.pin !== 'desk' || pinRoom).map((sec) => {
    sec.classList.add('is-pinned');
    return { sec, p: 0, ats: $$('[data-at]', sec).map((el) => ({ el, at: parseFloat(el.dataset.at) })), flys: $$('[data-fly]', sec).map((el) => ({ el, v: el.dataset.fly.split(',').map(Number) })) };
  }) : [];
  // the brake: the page holds still for a moment so a stage can play and be read (downward, first pass)
  let brakeUntil = 0, frameY = scrollY, goingDown = false;
  const braking = () => performance.now() < brakeUntil;
  const brake = (ms) => {
    if (performance.now() < rushUntil) return;
    brakeUntil = performance.now() + ms;
    if (lenis) { lenis.stop(); setTimeout(() => { if (!braking()) lenis.start(); }, ms + 10); }
  };
  // rushing: someone flicking hard or spinning the wheel fast wants to get somewhere, so holds step aside
  let rushUntil = 0; const rushing = () => performance.now() < rushUntil;
  if (motion) {
    const win = [];
    const intent = (amount) => {
      const now = performance.now(); win.push([now, Math.abs(amount)]); while (win.length && now - win[0][0] > 350) win.shift();
      if (win.reduce((a, w) => a + w[1], 0) > 1300) { rushUntil = now + 1100; if (braking()) { brakeUntil = 0; if (lenis) lenis.start(); } }
    };
    addEventListener('wheel', (e) => intent(e.deltaY * (e.deltaMode === 1 ? 40 : 1)), { capture: true, passive: true });
    let ty0 = null; addEventListener('touchstart', (e) => { ty0 = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', (e) => { if (ty0 !== null) { const y = e.touches[0].clientY; intent((ty0 - y) * 2.5); ty0 = y; } }, { capture: true, passive: true });
    const stopIt = (e) => { if (braking()) { e.preventDefault(); e.stopImmediatePropagation(); } };
    addEventListener('wheel', stopIt, { capture: true, passive: false });
    addEventListener('touchmove', stopIt, { capture: true, passive: false });
    addEventListener('keydown', (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) stopIt(e); }, true);
  }
  const pinTo = (sec, p) => { const y = Math.round(sec.getBoundingClientRect().top + scrollY + p * (sec.offsetHeight - innerHeight)); if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); };
  pins.forEach((P) => { P.gate = +P.sec.dataset.gate || 0; P.ats.sort((a, b) => a.at - b.at); });
  const settle = (el) => { if (el.hasAttribute('data-lines')) setTimeout(() => el.classList.add('is-done'), 2400); };
  // why: the scene's clock fills each panel's bar in turn; the panel being filled is the open one.
  // Clicking a sliver scrolls to its part of the scene.
  const whyEl = document.querySelector('.why.is-pinned');
  if (whyEl) {
    const wp = $$('.wpanel', whyEl); let cur = 0, seen = 0, clickHold = 0;
    const stageP = (i) => 0.04 + (i / 4) * 0.88 + 0.004;
    let entered = false;
    whyEl.__onP = (p) => {
      // arriving: hold a moment so the title and panels finish coming in before the first stage moves on
      if (goingDown && !entered && p > 0) { entered = true; if (p < 0.2 && !rushing()) { pinTo(whyEl, 0.004); brake(1300); return; } }
      let d = clamp((p - 0.04) / 0.88) * 4; let a = Math.min(3, Math.floor(d));
      if (rushing()) seen = Math.max(seen, a);
      if (goingDown && a > seen && performance.now() > clickHold && !rushing()) {
        // first time through: one stage at a time, then a pause to take it in
        if (a > seen + 1) { a = seen + 1; d = a + 0.001; pinTo(whyEl, stageP(a)); }
        seen = a; brake(1500);
      }
      // the bars: full for the cards already open-and-closed, filling for the open one, empty ahead
      wp.forEach((pn, i) => pn.style.setProperty('--b', (i < cur ? 1 : i > cur ? 0 : clamp(d - i)).toFixed(3)));
      if (a !== target) { target = a; if (!stepT) step(); }
    };
    // the cards never skip: whatever the scroll does, each card opens and closes in turn on its way to the one you've
    // reached. When the scroll is far ahead, each step is quicker, but every card still gets its turn.
    let target = 0, stepT = 0;
    const step = () => {
      stepT = 0;
      const wait = clickHold - performance.now(); if (wait > 0) { stepT = setTimeout(step, wait); return; }
      if (cur === target) return;
      const behind = Math.abs(target - cur); const next = cur + Math.sign(target - cur);
      const dur = behind > 1 ? 0.62 : 1.1; // seconds: a quick hand-off when catching up, the full move otherwise
      row.style.setProperty('--wt', `${dur}s`);
      cur = next; wp.forEach((pn, i) => { pn.classList.toggle('is-active', i === next); pn.style.setProperty('--b', i < next ? '1' : i > next ? '0' : pn.style.getPropertyValue('--b')); });
      stepT = setTimeout(step, dur * 1000 + 40);
    };
    const row = whyEl.querySelector('.wpanels');
    const sizeP = () => { const W = row.clientWidth; const g = parseFloat(getComputedStyle(row).columnGap) || 0; const c = Math.round((W - 3 * g) / 6.6); row.style.setProperty('--wc', `${c}px`); row.style.setProperty('--wo', `${W - 3 * g - 3 * c}px`); };
    sizeP(); addEventListener('resize', sizeP);
    wp.forEach((pn, i) => pn.addEventListener('click', () => {
      if (i === cur) return;
      // open it now; then move the scene's clock to that panel without the stages in between flickering open
      entered = true; seen = Math.max(seen, i); brakeUntil = 0; if (lenis) lenis.start();
      cur = i; target = i; row.style.setProperty('--wt', '1.1s'); wp.forEach((q, k) => q.classList.toggle('is-active', k === i)); clickHold = performance.now() + 1500;
      const top = whyEl.getBoundingClientRect().top + scrollY; const span = whyEl.offsetHeight - innerHeight;
      const y = top + (0.04 + ((i + 0.3) / 4) * 0.88) * span; lenis ? lenis.scrollTo(y, { duration: 1.2, force: true }) : scrollTo({ top: y, behavior: 'smooth' });
    }));
  }
  // pinned scenes start a padding unit below the top of the screen; one too tall to do that and still clear the bottom
  // by a comfortable margin is centred instead, so nothing is ever cut off
  const fitStages = $$('.reviews.is-pinned .pin__stage, .story.is-pinned .pin__stage, .founder.is-pinned .pin__stage, .promises.is-pinned .pin__stage');
  const fitScenes = () => fitStages.forEach((st) => {
    st.style.paddingTop = '';
    if (innerWidth < 901) return;
    const base = parseFloat(getComputedStyle(st).paddingTop) || 0; const top0 = st.getBoundingClientRect().top;
    const kids = [...st.querySelectorAll('*')].filter((k) => k.offsetHeight > 0 && getComputedStyle(k).position !== 'absolute');
    const lo = Math.min(...kids.map((k) => k.getBoundingClientRect().top)) - top0, hi = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) - top0;
    const h = hi - lo, room = innerHeight - hi;
    if (room < 56) st.style.paddingTop = `${Math.max(20, base + (innerHeight - h) / 2 - lo).toFixed(0)}px`;
  });
  fitScenes(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitScenes);
  let fsT = 0; addEventListener('resize', () => { clearTimeout(fsT); fsT = setTimeout(fitScenes, 200); });
  // [data-seq] lists: each item waits for the one before it, so they play one at a time however fast you scroll
  const seqGap = 1100;
  const turnOnNow = (el) => { el.classList.add('is-on', 'is-in'); settle(el); el.dispatchEvent(new Event('on')); };
  const turnOn = (el) => {
    if (el.classList.contains('is-on') || el.__queued) return;
    const seq = el.parentElement && el.parentElement.hasAttribute('data-seq') ? el.parentElement : null;
    if (!seq || !motion) return turnOnNow(el);
    const now = performance.now(); const at = Math.max(now, (seq.__next || 0)); seq.__next = at + seqGap; el.__queued = true;
    setTimeout(() => { el.__queued = false; turnOnNow(el); }, at - now);
  };

  // footer: the link columns span from the top of the T to the baseline of the last line
  const ftrLine = document.querySelector('.ftr__line');
  if (ftrLine) {
    const fit = () => {
      const cs = getComputedStyle(ftrLine); const F = parseFloat(cs.fontSize); const lh = parseFloat(cs.lineHeight) || F;
      const c = document.createElement('canvas').getContext('2d'); c.font = `300 ${F}px ${cs.fontFamily}`;
      const m = c.measureText('T'); const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent; if (!asc) return;
      const half = (lh - (asc + desc)) / 2; const lines = Math.max(1, Math.round(ftrLine.getBoundingClientRect().height / lh));
      const ftr = ftrLine.closest('.ftr');
      ftr.style.setProperty('--ct', `${(half + asc - m.actualBoundingBoxAscent).toFixed(1)}px`);
      ftr.style.setProperty('--cb', `${(lh - (half + asc)).toFixed(1)}px`);
      ftr.dataset.lines = lines;
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit); addEventListener('resize', fit);
  }

  // ---------- the scroll clock: drift, fills, scrubbed progress ----------
  // phones: a third of the drift. A small screen moves a long way per flick, and full-strength drift pushed photos out of their frames
  const driftK = matchMedia('(max-width: 800px)').matches ? 0.35 : 1;
  const drifts = $$('[data-speed]').map((el) => ({ el, s: parseFloat(el.dataset.speed) * driftK }));
  const scrubs = $$('[data-scrub], .cta--wheel');
  const focusCtas = $$('.cta--focus');
  const brand = document.querySelector('.page-home .hdr__brand');
  const heroBtn = document.querySelector('.hero__aside .btn'); const hdrCta = document.querySelector('.page-home .hdr__cta');
  const heroMark = document.querySelector('.hero__mark'); const heroAsideP = document.querySelector('.hero__aside p');
  let btnT = [0, 0, 1], markT = [0, 0, 1];
  const placeMark = () => {
    if (!heroMark || !heroEl) return;
    const last = heroEl.querySelector('.hero__title .hl:last-child > span') || heroEl.querySelector('.hero__title');
    let y = 0, el = last; while (el && el !== heroEl) { y += el.offsetTop; el = el.offsetParent; }
    // never closer to the headline than 32px (phones: the headline is tall, so the wordmark rises to fit)
    const title = heroEl.querySelector('.hero__title'); let ty = 0; el = title; while (el && el !== heroEl) { ty += el.offsetTop; el = el.offsetParent; }
    const gap = heroEl.offsetHeight - (y + last.offsetHeight); const room = ty - heroMark.offsetHeight - 32;
    heroMark.style.top = `${Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 64, Math.min(gap, room))}px`;
  };
  placeMark(); addEventListener('resize', placeMark);
  const mainEl = document.querySelector('main'); const ftr = document.querySelector('.ftr');
  const frame = () => {
    const vh = innerHeight;
    // the footer is the bottom layer: --r runs 0 → 1 as the page lifts off it
    if (ftr) {
      const fh = ftr.offsetHeight; const fr = clamp((vh - mainEl.getBoundingClientRect().bottom) / Math.min(fh, vh));
      if (ftr.classList.contains('is-tall') !== fh > vh) ftr.classList.toggle('is-tall', fh > vh);
      if (motion) ftr.style.setProperty('--r', fh > vh ? '1' : fr.toFixed(3));
    }
    // the hero wordmark lives in the landscape (behind the front peak); as you leave the hero it lifts out,
    // shrinks into the menu and hands over to the header logo: one logo, never two
    if (brand && heroEl && heroMark) {
      const k = clamp(scrollY / (heroEl.offsetHeight * 0.36)); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const t = brand.getBoundingClientRect(); const m = heroMark.getBoundingClientRect();
      const bx = m.left - markT[0], by = m.top - markT[1], bw = m.width / markT[2];
      // it shrinks where it stands first, then lifts into the menu, so it never slides under the links
      const em = clamp(e / 0.9); const lift = clamp((em - 0.4) / 0.6); const l2 = lift * lift * (3 - 2 * lift);
      // hold it where it started on screen (cancel the page scroll) until the lift carries it to the menu
      const sc = 1 + (t.width / bw - 1) * em; const x = (t.left - bx) * em, y = scrollY + (t.top - by - scrollY) * l2;
      markT = [x, y, sc];
      if (heroAsideP) heroAsideP.style.opacity = String(1 - clamp(e * 2.2));
      heroMark.style.transform = e <= 0 ? '' : `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      const swap = clamp((e - 0.9) / 0.08);
      heroMark.style.opacity = String(1 - swap); brand.style.opacity = String(swap);
      brand.style.pointerEvents = swap > 0.5 ? '' : 'none';
      // the hero's quote button flies up into the menu and becomes its button: one button, never two
      if (heroBtn && hdrCta) {
        const t = hdrCta.getBoundingClientRect();
        if (!t.width) { heroBtn.style.transform = ''; heroBtn.style.opacity = ''; }
        else {
          const b = heroBtn.getBoundingClientRect(); const bx = b.left - btnT[0], by = b.top - btnT[1], bh = b.height / btnT[2];
          const eb = clamp(e / 0.9); const sc = 1 + (t.height / bh - 1) * eb; const x = (t.right - bx - (b.width / btnT[2]) * sc) * eb, y = (t.top - by) * eb;
          btnT = [x, y, sc];
          heroBtn.style.transform = e <= 0 ? '' : `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
          const swap = clamp((eb - 0.92) / 0.08);
          heroBtn.style.opacity = e <= 0 ? '' : String(1 - swap); heroBtn.style.pointerEvents = swap > 0.5 ? 'none' : '';
          hdrCta.style.opacity = String(swap); hdrCta.style.pointerEvents = swap > 0.5 ? '' : 'none';
        }
      }
    }
    goingDown = scrollY > frameY; frameY = scrollY;
    for (const P of pins) {
      const r = P.sec.getBoundingClientRect(); P.p = clamp(-r.top / Math.max(1, r.height - vh));
      if (r.bottom < -vh || r.top > vh * 2) continue;
      P.sec.style.setProperty('--p', P.p.toFixed(4));
      if (P.sec.__onP) P.sec.__onP(P.p);
      if (P.gate && goingDown && P.p > 0 && P.p < 1 && !rushing()) {
        const k = P.ats.findIndex((a) => !a.el.classList.contains('is-on'));
        if (k >= 0 && P.p >= P.ats[k].at && !braking()) {
          if (P.ats[k + 1] && P.p >= P.ats[k + 1].at) pinTo(P.sec, P.ats[k].at + 0.004);
          turnOn(P.ats[k].el); brake(P.gate);
        }
      } else for (const a of P.ats) if (P.p >= a.at) turnOn(a.el);
      for (const f of P.flys) { const [fx, fy, rot, s0, d] = f.v; const k = easeOut(clamp((P.p - s0) / d)); f.el.style.translate = `${(fx * (1 - k)).toFixed(2)}vw ${(fy * (1 - k)).toFixed(2)}vh`; f.el.style.rotate = `${(rot * (1 - k)).toFixed(2)}deg`; }
    }
    for (const c of focusCtas) { const r = c.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) continue; const off = Math.abs(r.top + r.height / 2 - vh / 2) / (vh * 0.5); c.style.setProperty('--f', (1 - clamp((off - 0.08) / 0.7)).toFixed(3)); }
    // read every position first, then write: interleaving them forces a layout per element
    if (motion) {
      const offs = drifts.map((d) => { const r = d.el.parentElement.getBoundingClientRect(); return r.bottom < -200 || r.top > vh + 200 ? null : (r.top + r.height / 2 - vh / 2) * -d.s; });
      drifts.forEach((d, i) => { if (offs[i] !== null) d.el.style.translate = `0 ${offs[i].toFixed(1)}px`; });
    }
    for (const f of fills) {
      const P = f.pin && pins.find((x) => x.sec === f.pin);
      // a scene that isn't pinned here (phones, upright tablets) plays on its own clock once it's in view:
      // a flick can't carry you past it half-written
      if (f.pin && !P && motion) {
        if (!f.played && f.el.getBoundingClientRect().top < vh * 0.72) {
          f.played = true; f.pin.classList.add('is-played');
          f.words.forEach((w, i) => setTimeout(() => w.classList.add('on'), 350 + i * 75));
        }
        continue;
      }
      let p;
      if (P && f.range) p = clamp((P.p - f.range[0]) / (f.range[1] - f.range[0]));
      else { const r = f.el.getBoundingClientRect(); p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32)); }
      const n = Math.round(p * f.words.length);
      f.words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    for (const s of scrubs) {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      // the route's drawn tip sits at 66% of the screen; a stop is reached as the tip arrives at it
      const p = s.classList.contains('cta') ? clamp((vh - r.top) / (vh * 0.9)) : clamp((vh * 0.66 - r.top) / r.height);
      if (s.classList.contains('route')) {
        // only the drawn line's dash offset changes: one cheap stroke update, no mask repaint.
        // the tip reaches each pin as that pin reaches the same screen line, so detours draw at an even pace
        const yv = ((vh * 0.66 - r.top) / r.height) * 1250; const K = s.__knots || [[0, 0], [1250, s.__len]];
        let L = K[K.length - 1][1];
        for (let i = 1; i < K.length; i++) if (yv <= K[i][0]) { const [y0, l0] = K[i - 1], [y1, l1] = K[i]; L = l0 + (l1 - l0) * clamp((yv - y0) / Math.max(1, y1 - y0)); break; }
        if (yv <= 0) L = 0;
        s.__draw.style.strokeDashoffset = (s.__len - L).toFixed(1);
        s.__stops.forEach((st) => { if (!st.classList.contains('is-reached') && st.getBoundingClientRect().top < vh * 0.7) st.classList.add('is-reached'); });
      } else s.style.setProperty('--p', p.toFixed(4));
    }
  };
  // the route is drawn from the real layout: it drops straight down from a pin, crosses between the rows of words,
  // and comes into the next pin from the side its words aren't on, so the line never runs over text
  const buildRoute = (r) => {
    const ghost = r.querySelector('.route__ghost'); const box = r.getBoundingClientRect();
    if (!box.width || getComputedStyle(r.querySelector('.route__line')).display === 'none') return;
    const sx = 1200 / box.width, sy = 1250 / box.height;
    const P = r.__stops.map((st) => {
      const a = st.querySelector('.stop__pin').getBoundingClientRect(); const t = st.querySelector('.stop__txt').getBoundingClientRect();
      return { x: (a.left + a.width / 2 - box.left) * sx, y: (a.top + a.height / 2 - box.top) * sy, right: st.classList.contains('stop--r'), top: (Math.min(t.top, a.top) - box.top) * sy, bot: (Math.max(t.bottom, a.bottom) - box.top) * sy };
    });
    const pts = [[P[0].x, 0], [P[0].x, P[0].y]];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1]; const cy = (a.bot + b.top) / 2; const sideX = b.x + (b.right ? 90 : -90);
      pts.push([a.x, cy], [sideX, cy], [sideX, b.y], [b.x, b.y]);
    }
    const last = P[P.length - 1]; pts.push([last.x, 1250]);
    // rounded corners
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1); const rr = Math.min(60, l1 / 2, l2 / 2);
      if (rr < 1) { d += ` L ${x1.toFixed(1)} ${y1.toFixed(1)}`; continue; }
      const ax = x1 - ((x1 - x0) / l1) * rr, ay = y1 - ((y1 - y0) / l1) * rr, bx = x1 + ((x2 - x1) / l2) * rr, by = y1 + ((y2 - y1) / l2) * rr;
      d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
    ghost.setAttribute('d', d); r.__draw.setAttribute('d', d);
    r.__len = r.__draw.getTotalLength(); r.__draw.style.strokeDasharray = r.__len.toFixed(1);
    // knots: the length along the path at which each pin sits, keyed to that pin's height
    const K = [[0, 0]]; let li = 0;
    P.forEach((pin) => { let best = 1e9, bl = 0; for (let l = li; l <= r.__len; l += 4) { const q = r.__draw.getPointAtLength(l); const dd = Math.hypot(q.x - pin.x, q.y - pin.y); if (dd < best) { best = dd; bl = l; } if (dd > best + 200) break; } K.push([pin.y, bl]); li = bl; });
    K.push([1250, r.__len]); r.__knots = K;
  };
  $$('.route').forEach((r) => { r.__draw = r.querySelector('.route__draw'); r.__stops = $$('.stop', r); r.__len = r.__draw.getTotalLength(); r.__draw.style.strokeDasharray = r.__len.toFixed(1); buildRoute(r); });
  const rebuildRoutes = () => { $$('.route').forEach(buildRoute); onScroll(); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(rebuildRoutes);
  let rrT = 0; addEventListener('resize', () => { clearTimeout(rrT); rrT = setTimeout(rebuildRoutes, 250); });
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();
  // without motion, the route is simply complete
  if (!motion) $$('.stop').forEach((s) => s.classList.add('is-reached'));

  // ---------- the trigger clock: entrances arrive as a beat, once ----------
  if (motion) {
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.hero, .phero').forEach((h) => h.classList.add('is-in'))));
    setTimeout(() => $$('.hero').forEach((h) => h.classList.add('is-done')), 3000);
    // inner-page openings: title, label and lede play on load
    $$('.phero [data-lines], .phero [data-rise], .wall__intro [data-lines]').forEach((el, i) => { el.style.setProperty('--d', `${0.15 + i * 0.12}s`); setTimeout(() => { el.classList.add('is-in'); settle(el); }, 60); });
  }
  const pinnedEls = new Set(pins.flatMap((P) => P.ats.map((a) => a.el)));
  const targets = [...new Set([...$$('[data-rise], [data-lines]'), ...$$('[data-at]')])].filter((el) => !el.closest('.phero') && !el.closest('.wall__intro') && !pinnedEls.has(el));
  let queue = [], timer = 0;
  const flush = () => {
    queue.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.top - rb.top || ra.left - rb.left; });
    const step = queue.length > 1 ? Math.min(0.12, 0.6 / (queue.length - 1)) : 0;
    queue.forEach((el, i) => { el.style.setProperty('--d', `${(i * step).toFixed(2)}s`); el.classList.add('is-in'); settle(el); if (el.hasAttribute('data-at')) turnOn(el); });
    queue = []; timer = 0;
  };
  const io = new IntersectionObserver((ens) => {
    ens.forEach((en) => { if (en.isIntersecting) { queue.push(en.target); io.unobserve(en.target); } });
    if (queue.length && !timer) timer = requestAnimationFrame(flush);
  }, { rootMargin: '0px 0px -10% 0px' });

  // held sections: glide into place and hold until the entrance has played (downward, first pass only)
  const gates = motion ? $$('[data-hold]') : [];
  const arrive = (sec) => {
    // [data-solo] parts (the continent titles) keep their own entrance: they play as they reach the screen
    const now = $$('[data-rise]:not(.is-in), [data-lines]:not(.is-in)', sec).filter((el) => (sec.hasAttribute('data-reveal-all') && !el.closest('[data-solo]')) || el.getBoundingClientRect().top < innerHeight);
    now.forEach((el) => { io.unobserve(el); queue.push(el); });
    if (queue.length && !timer) timer = requestAnimationFrame(flush);
    sec.classList.add('is-arrived'); sec.dispatchEvent(new Event('arrive'));
    $$('[data-rise]:not(.is-in), [data-lines]:not(.is-in)', sec).forEach((el) => io.observe(el));
  };
  window.__onArrive = (el, fn) => { const sec = el.closest('[data-hold]'); if (!sec || !gates.length) return false; if (sec.classList.contains('is-arrived')) fn(); else sec.addEventListener('arrive', fn, { once: true }); return true; };
  targets.forEach((el) => { if (!(gates.length && el.closest('[data-hold]'))) io.observe(el); });
  if (!motion) targets.forEach((el) => el.classList.add('is-in', 'is-on'));
  if (gates.length) {
    let held = false, gy = scrollY;
    const block = (e) => { if (held && rushing()) held = false; if (held) { e.preventDefault(); e.stopImmediatePropagation(); } };
    addEventListener('wheel', block, { capture: true, passive: false });
    addEventListener('touchmove', block, { capture: true, passive: false });
    addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) block(e); }, true);
    const line = () => innerHeight * 0.6;
    const pending = gates.filter((g) => { if (g.getBoundingClientRect().top < line()) { arrive(g); return false; } return true; });
    const check = () => {
      const y = scrollY, down = y > gy; gy = y;
      if (held) return;
      while (pending.length > 1 && pending[1].getBoundingClientRect().top < line()) arrive(pending.shift());
      if (!pending.length) return;
      const top = pending[0].getBoundingClientRect().top;
      if (top >= line()) return;
      const sec = pending.shift();
      if (!(down && top > -innerHeight * 0.5) || rushing()) { arrive(sec); return; }
      held = true;
      const to = Math.round(scrollY + top);
      if (lenis) lenis.scrollTo(to, { duration: 0.9, lock: true, force: true, easing: (t) => 1 - Math.pow(1 - t, 4) }); else scrollTo({ top: to, behavior: 'smooth' });
      // the entrance plays during the glide, so the section never arrives empty
      arrive(sec);
      setTimeout(() => { held = false; check(); }, 700 + parseFloat(sec.dataset.hold || '1.2') * 1000);
    };
    let idle = 0;
    addEventListener('scroll', () => { check(); clearTimeout(idle); idle = setTimeout(check, 250); }, { passive: true });
  }
  const whenArrived = (el, fn, margin = '0px 0px -15% 0px') => {
    const staged = el.closest('[data-at]');
    if (staged && pinnedEls.has(staged)) { if (staged.classList.contains('is-on')) fn(); else staged.addEventListener('on', fn, { once: true }); return; }
    if (window.__onArrive(el, fn)) return;
    const o = new IntersectionObserver(([en]) => { if (en.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: margin }); o.observe(el);
  };

  // ---------- dot map: empty rings that fill in; the countries we plan glow gold ----------
  let mapData = null;
  const getMap = () => mapData || (mapData = fetch('map/world-dots.json?v=3').then((r) => r.json()));
  function makeMap(fig, opts = {}) {
    const canvas = opts.canvas || fig.querySelector('canvas'); const ctx = canvas.getContext('2d');
    const lit = new Set(JSON.parse(fig.dataset.lit || '[]'));
    const C = opts.colors || { dim: 'rgba(244,238,227,.2)', ring: 'rgba(244,238,227,.22)', lit: '#F4EEE3', arc: '#F4EEE3' };
    const plane = opts.plane ? new Path2D(opts.plane) : null;
    const st = { data: null, t: motion ? 0 : 1, view: { ...(opts.view || { lon0: -170, lon1: 180, lat0: 84, lat1: -56 }) }, target: null, arc: null, arcT: 0, F: null };
    const size = () => {
      if (opts.layout) opts.layout(canvas);
      const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = r.width * dpr; canvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); st.w = r.width; st.h = r.height;
      // the focus circle, in canvas coordinates: inside it 100%, outside it 20%, a soft edge between
      if (opts.focus) { const f = opts.focus.getBoundingClientRect(); const R = Math.min(f.width, f.height) / 2; st.F = { cx: f.left - r.left + f.width / 2, cy: f.top - r.top + f.height / 2, R }; }
    };
    if (opts.focus) {
      const refocus = () => {
        if (!st.F) return; const r = canvas.getBoundingClientRect(), f = opts.focus.getBoundingClientRect();
        const cx = f.left - r.left + f.width / 2, cy = f.top - r.top + f.height / 2, R = Math.min(f.width, f.height) / 2;
        if (Math.abs(cx - st.F.cx) + Math.abs(cy - st.F.cy) + Math.abs(R - st.F.R) > 0.5) { st.F = { cx, cy, R }; kick(); }
      };
      addEventListener('scroll', refocus, { passive: true });
      // the sticky column glides when the header comes and goes: follow it for the length of that glide
      let until = 0; const follow = () => { refocus(); if (performance.now() < until) requestAnimationFrame(follow); };
      addEventListener('scroll', () => { const was = until; until = performance.now() + 900; if (was < performance.now()) requestAnimationFrame(follow); }, { passive: true });
    }
    const fade = (x, y) => { if (!st.F) return 1; const { cx, cy, R } = st.F; const d = Math.hypot(x - cx, y - cy) / R; const t = clamp((d - 0.78) / 0.34); return 1 - 0.8 * t * t * (3 - 2 * t); };
    const proj = (lon, lat) => {
      const v = st.view;
      if (st.F) { // the region's box is centred in the focus circle
        const s = Math.min((st.F.R * 1.7) / (v.lon1 - v.lon0), (st.F.R * 1.7) / (v.lat0 - v.lat1), opts.maxScale || 99);
        return [st.F.cx + (lon - (v.lon0 + v.lon1) / 2) * s, st.F.cy - (lat - (v.lat0 + v.lat1) / 2) * s, s];
      }
      const sx = st.w / (v.lon1 - v.lon0); const sy = st.h / (v.lat0 - v.lat1);
      const s = opts.fit === 'width' ? Math.min(sx, opts.maxScale || 99) : Math.min(sx, sy);
      const ox = (st.w - s * (v.lon1 - v.lon0)) / 2; let oy = (st.h - s * (v.lat0 - v.lat1)) / 2;
      if (opts.fit === 'width') { const minOy = st.h - (v.lat0 + 58) * s, maxOy = -(v.lat0 - 80) * s; oy = minOy > maxOy ? (minOy + maxOy) / 2 : clamp(oy, minOy, maxOy); }
      return [ox + (lon - v.lon0) * s, oy + (v.lat0 - lat) * s, s];
    };
    // the dots are drawn once into a cache; while only the pin pulses, the cache is reused
    const off = document.createElement('canvas'); const octx = off.getContext('2d'); let cacheKey = '';
    const draw = () => {
      if (!st.data) return;
      const v = st.view; const key = st.t >= 1 ? [v.lon0, v.lon1, v.lat0, v.lat1, st.w, st.h, st.F && st.F.cx, st.F && st.F.cy, st.F && st.F.R].join() : '';
      if (key && key === cacheKey) { ctx.clearRect(0, 0, st.w, st.h); ctx.drawImage(off, 0, 0, st.w, st.h); }
      else { drawDots(); if (key) { off.width = canvas.width; off.height = canvas.height; octx.clearRect(0, 0, off.width, off.height); octx.drawImage(canvas, 0, 0); cacheKey = key; } }
      drawArc(); drawHover();
    };
    // hover: the dots under the pointer swell and brighten in a soft circle
    let heatLive = false;
    const drawHover = () => {
      heatLive = false;
      if (!opts.hover || !st.data || st.t < 1) return;
      const { dots, names, step } = st.data; if (!st.heat) st.heat = new Float32Array(dots.length);
      const [, , s] = proj(0, 0); const r = clamp(s * step * 0.3, 0.8, 3); const R = opts.hover.radius || 70;
      ctx.fillStyle = opts.hover.color;
      for (let k = 0; k < dots.length; k++) {
        const h0 = st.heat[k]; if (!st.mouse && h0 <= 0) continue;
        const d = dots[k]; const [x, y] = proj(d[0], d[1]);
        let f = 0; if (st.mouse) { const dd = Math.hypot(x - st.mouse[0], y - st.mouse[1]); if (dd < R) f = 1 - dd / R; }
        const h = f > h0 ? Math.min(f, h0 + 0.06) : h0 * 0.955 - 0.003; st.heat[k] = h > 0.01 ? h : 0;
        if (h <= 0.01) continue; heatLive = true; const isLit = lit.has(names[d[2]]);
        ctx.globalAlpha = ((isLit ? 0.55 : 0.35) + 0.1) * h; ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.55 * h), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const drawDots = () => {
      ctx.clearRect(0, 0, st.w, st.h);
      const { dots, names, step } = st.data; const [, , s] = proj(0, 0); const r = clamp(s * step * 0.3, 0.8, 3);
      if (st.t >= 1) {
        const groups = new Map();
        for (let k = 0; k < dots.length; k++) {
          const d = dots[k]; const [x, y] = proj(d[0], d[1]);
          if (x < -4 || y < -4 || x > st.w + 4 || y > st.h + 4) continue;
          const a = Math.round(fade(x, y) * 24) / 24; if (a <= 0) continue;
          const key = (lit.has(names[d[2]]) ? 'L' : 'D') + a; let g = groups.get(key); if (!g) { g = new Path2D(); groups.set(key, g); }
          g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.283);
        }
        for (const [key, g] of groups) { ctx.globalAlpha = +key.slice(1); ctx.fillStyle = key[0] === 'L' ? C.lit : C.dim; ctx.fill(g); }
        ctx.globalAlpha = 1; return;
      }
      for (let k = 0; k < dots.length; k++) {
        const d = dots[k]; const [x, y] = proj(d[0], d[1]);
        if (x < -4 || y < -4 || x > st.w + 4 || y > st.h + 4) continue;
        const isLit = lit.has(names[d[2]]); const a0 = clamp((st.t - st.order[k] * 0.78) / 0.22); const rr = r;
        const fa = fade(x, y); const a = a0 * fa;
        if (a0 < 1) { ctx.globalAlpha = (1 - a0) * fa; ctx.strokeStyle = C.ring; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, rr - 0.35, 0, 6.283); ctx.stroke(); }
        if (a > 0) {
          ctx.globalAlpha = a; ctx.fillStyle = isLit ? C.lit : C.dim;
          ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
    const drawArc = () => {
      if (st.arc) {
        ctx.save(); ctx.globalAlpha = st.arcA ?? 1; const fadeBase = fade; const fade2 = (x, y) => fadeBase(x, y) * (st.arcA ?? 1);
        const [ax, ay] = proj(st.arc.from[1], st.arc.from[0]); const [bx, by] = proj(st.arc.to[1], st.arc.to[0]);
        const mx = (ax + bx) / 2, my = Math.min(ay, by) - Math.hypot(bx - ax, by - ay) * 0.3;
        // the flight path is a line of small dots, so it can fade with the focus circle like everything else
        const N = Math.max(40, Math.round(Math.hypot(bx - ax, by - ay) / 6)); ctx.fillStyle = C.arc;
        const T = easeOut(st.arcT);
        for (let i = 0; i <= N * T; i++) { const u = i / N; const px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by; ctx.globalAlpha = fade2(px, py); ctx.beginPath(); ctx.arc(px, py, 1.1, 0, 6.283); ctx.fill(); }
        ctx.globalAlpha = st.arcA ?? 1;
        // where the flight lands
        ctx.strokeStyle = C.arc; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 6.283); ctx.stroke();
        if (plane) {
          // a solid plane at the front of the line, pointing along it
          const u = T; const tx = 2 * (1 - u) * (mx - ax) + 2 * u * (bx - mx), ty = 2 * (1 - u) * (my - ay) + 2 * u * (by - my);
          const px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(ty, tx)); ctx.scale(1.25, 1.25); ctx.fillStyle = C.arc; ctx.fill(plane); ctx.restore();
        }
        ctx.restore();
      }
    };
    let raf = 0;
    const loop = () => {
      raf = 0; let again = false;
      if (st.target) { for (const k of ['lon0', 'lon1', 'lat0', 'lat1']) { const dv = st.target[k] - st.view[k]; if (Math.abs(dv) > 0.05) { st.view[k] += dv * (motion ? 0.1 : 1); again = true; } else st.view[k] = st.target[k]; } }
      if (st.arc && st.arcT < 1) { st.arcT = Math.min(1, st.arcT + (motion ? 0.016 : 1)); again = true; }
      if (st.arc && st.fading) { st.arcA = Math.max(0, (st.arcA ?? 1) - (motion ? 0.09 : 1)); if (st.arcA <= 0) { st.arc = null; st.fading = false; } else again = true; }
      draw(); if (again || heatLive) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    getMap().then((data) => {
      st.data = data; st.order = data.dots.map((d) => (lit.has(data.names[d[2]]) ? 0.45 + Math.random() * 0.55 : Math.random() * 0.8));
      size(); draw(); new ResizeObserver(() => { size(); draw(); }).observe(canvas);
      if (opts.layout) addEventListener('resize', () => { size(); draw(); });
      const light = () => { if (!motion) return; const t0 = performance.now() + 150; const dur = opts.dur || 1500; const tick = (now) => { st.t = easeOut(clamp((now - t0) / dur)); draw(); if (st.t < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
      opts.now ? light() : whenArrived(fig, light);
    });
    // pointer position in canvas coordinates, and the land under it
    const lonlatAt = (x, y) => { const [x0, y0, s] = proj(0, 0); return [(x - x0) / s, -(y - y0) / s]; };
    const tgt = opts.target || canvas;
    const at = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    let drag = null, dragged = false;
    if (opts.hover) {
      tgt.addEventListener('pointermove', (e) => {
        st.mouse = at(e);
        if (drag) {
          // drag: the map follows the pointer; the centre stays on the globe
          const [, , s] = proj(0, 0); const dx = (st.mouse[0] - drag.m[0]) / s, dy = (st.mouse[1] - drag.m[1]) / s; drag.m = st.mouse;
          if (Math.hypot(st.mouse[0] - drag.m0[0], st.mouse[1] - drag.m0[1]) > 5) drag.moved = true;
          const v = st.view; const cx = (v.lon0 + v.lon1) / 2 - dx, cy = (v.lat0 + v.lat1) / 2 + dy;
          const ox = clamp(cx, -165, 175) - (v.lon0 + v.lon1) / 2, oy = clamp(cy, -48, 68) - (v.lat0 + v.lat1) / 2;
          v.lon0 += ox; v.lon1 += ox; v.lat0 += oy; v.lat1 += oy; st.target = null;
        }
        kick();
        if (opts.onMove) opts.onMove(...lonlatAt(...st.mouse), st.mouse, !(drag && drag.moved) && landNear(st.mouse), !!(drag && drag.moved));
      });
      tgt.addEventListener('pointerleave', () => { if (drag) return; st.mouse = null; if (opts.onMove) opts.onMove(null); kick(); });
      tgt.addEventListener('click', (e) => { if (dragged) { dragged = false; return; } const m = at(e); if (opts.onClick && landNear(m)) opts.onClick(...lonlatAt(...m)); });
    }
    if (opts.drag) {
      tgt.addEventListener('pointerdown', (e) => { if (e.button) return; const m = at(e); drag = { m, m0: m, moved: false }; tgt.setPointerCapture(e.pointerId); tgt.classList.add('is-drag'); });
      const end = () => { if (!drag) return; dragged = drag.moved; drag = null; tgt.classList.remove('is-drag'); };
      tgt.addEventListener('pointerup', end); tgt.addEventListener('pointercancel', end);
    }
    const landNear = (m) => { if (!st.data) return false; const { dots } = st.data; for (let k = 0; k < dots.length; k++) { const [x, y] = proj(dots[k][0], dots[k][1]); if (Math.abs(x - m[0]) < 14 && Math.abs(y - m[1]) < 14) return true; } return false; };
    return {
      fly: (b) => { st.target = b; kick(); },
      dragging: () => !!(drag && drag.moved),
      arc: (a, b) => { const same = st.arc && st.arcA > 0.5 && st.arc.to[0] === b[0] && st.arc.to[1] === b[1] && st.arc.from[0] === a[0] && st.arc.from[1] === a[1]; st.arc = { from: a, to: b }; st.arcA = 1; st.fading = false; if (!same) st.arcT = 0; kick(); },
      clear: () => { if (st.arc) { st.fading = true; kick(); } },
    };
  }
  // which region of the destinations page a point on the map belongs to
  const regionAt = (lon, lat) => {
    if (lon < -28) { if (lon > -93 && lat < 9) return 'south-america'; if (lat < 24 && lon > -120) return 'central-america'; return 'north-america'; }
    if (lon < 60) { if ((lon > 34 && lat < 36 && lat > 10) || (lon > 44 && lat < 45)) return 'asia'; if (lat >= 35 || (lon > 26 && lat > 34)) return 'europe'; return 'africa'; }
    return 'asia';
  };
  const glow = document.querySelector('.worldmap--glow');
  if (glow) {
    const tip = glow.querySelector('.atlas__tip'); const names = JSON.parse(glow.dataset.regions || '{}');
    makeMap(glow, {
      colors: { dim: 'rgba(244,238,227,.2)', ring: 'rgba(244,238,227,.22)', lit: '#F4EEE3', arc: '#F4EEE3' },
      hover: fine ? { color: '#FFFFFF', radius: 32 } : null,
      onMove: (lon, lat, m, land) => {
        if (lon === null || !land) { tip.classList.remove('is-on'); glow.querySelector('canvas').style.cursor = ''; return; }
        const id = regionAt(lon, lat); const [n, c] = names[id] || [id, 0];
        tip.textContent = `${n} · ${c} destinations →`; tip.style.left = `${m[0]}px`; tip.style.top = `${m[1]}px`; tip.classList.add('is-on');
        glow.querySelector('canvas').style.cursor = 'pointer';
      },
      onClick: (lon, lat) => { location.href = `destinations.html#${regionAt(lon, lat)}`; },
    });
  }

  // count-ups: the final value reserves the width so nothing shifts
  $$('[data-count]').forEach((b) => {
    const final = b.dataset.count; const n = parseFloat(final.replace(/[^\d.]/g, ''));
    const fmt = (v) => final.replace(/[\d,]+/, Math.round(v).toLocaleString('en-US'));
    b.innerHTML = `<span class="ghost" aria-hidden="true">${final}</span><span class="live">${motion ? fmt(0) : final}</span>`;
    if (!motion || /[^\d.,+%]/.test(final)) { b.querySelector('.live').textContent = final; return; } // '24/7' is a label, not a number to count to
    const live = b.querySelector('.live');
    whenArrived(b, () => { const t0 = performance.now() + 150; const tick = (now) => { const t = clamp((now - t0) / 1500); live.textContent = fmt(n * easeOut(t)); if (t < 1) requestAnimationFrame(tick); else live.textContent = final; }; requestAnimationFrame(tick); });
  });

  // ---------- featured journeys: a photo follows the cursor down the list ----------
  const jf = document.querySelector('.jfloat');
  if (jf && fine) {
    const list = document.querySelector('.jgroups'); const imgs = $$('img', jf);
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
    let rz = 0;
    const step = () => { x += (tx - x) * 0.16; y += (ty - y) * 0.16; rz += (rot - rz) * 0.16; jf.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rz.toFixed(2)}deg)`; raf = on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0; };
    // the photo lives in the empty column between the name and the price; it only follows the cursor up and down,
    // drifting a little sideways, so it can never cover the trip details
    const rows = $$('.jrow', list); let cur = 0, rot = 0;
    // the photo is centred between the left edge of the screen and the row's number, leaning a little toward the list,
    // and follows the row up and down
    const place = () => {
      const w = jf.offsetWidth, h = jf.offsetHeight; const row = rows[cur]; const rr = row.getBoundingClientRect();
      const nLeft = row.querySelector('.jrow__n').getBoundingClientRect().left;
      const k = rows.indexOf(row);
      tx = nLeft / 2 - w / 2; rot = -(3 + (k % 3) * 1.6);
      ty = clamp(rr.top + rr.height / 2 - h / 2, 70, innerHeight - h - 20);
    };
    list.addEventListener('pointermove', () => { place(); if (!on) { x = tx; y = ty; } if (!raf) raf = requestAnimationFrame(step); });
    addEventListener('scroll', () => { if (on) { place(); if (!raf) raf = requestAnimationFrame(step); } }, { passive: true });
    rows.forEach((row, i) => row.addEventListener('pointerenter', () => { cur = i; on = true; jf.classList.add('is-on'); imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.for === row.dataset.img)); }));
    list.addEventListener('pointerleave', () => { on = false; jf.classList.remove('is-on'); });
  }

  // ---------- the journeys wave: the row under the mouse leans out to the left, its neighbours a little less, and so
  // on (a bell curve). It follows the mouse, not the scroll, and settles back flat when the mouse leaves the list.
  // Touch screens have no mouse: there the row at the middle of the screen leans, as you scroll. ----------
  const waveRows = motion ? $$('.jgroups .jrow') : [];
  if (waveRows.length) {
    const A = fine ? 58 : 26;                      // the furthest lean, px
    const now = waveRows.map(() => 0); let my = null, wr = 0;
    const tick = () => {
      wr = 0; const vh = innerHeight, sigma = vh * (fine ? 0.15 : 0.12); const centre = fine ? my : vh / 2;
      const tops = waveRows.map((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; }); // the lean is sideways only, so it never moves these
      let moving = false;
      waveRows.forEach((r, i) => {
        const d = centre === null ? 9 : (tops[i] - centre) / sigma; const target = Math.abs(d) > 4 ? 0 : -A * Math.exp(-d * d);
        now[i] += (target - now[i]) * (fine ? 0.085 : 0.16); // eased: quick to start, slow to settle, going out and coming back
        if (Math.abs(target - now[i]) > 0.1) moving = true; else now[i] = target;
        r.style.translate = `${now[i].toFixed(1)}px 0`;
      });
      if (moving) wr = requestAnimationFrame(tick);
    };
    const kick = () => { if (!wr) wr = requestAnimationFrame(tick); };
    if (fine) {
      const zone = document.querySelector('.jgroups');
      zone.addEventListener('pointermove', (e) => { my = e.clientY; kick(); });
      zone.addEventListener('pointerleave', () => { my = null; kick(); });
      addEventListener('scroll', () => { if (my !== null) kick(); }, { passive: true }); // the list slides under a still mouse
    } else { addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick); kick(); }
  }

  // postcards turn over
  $$('.pc').forEach((p) => p.addEventListener('click', () => p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true'))));

  // local time on destination cards
  const times = $$('.localtime'); const fmts = new Map();
  const tickTimes = () => times.forEach((t) => { const tz = t.dataset.tz; if (!fmts.has(tz)) fmts.set(tz, new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })); t.textContent = fmts.get(tz).format(new Date()); });
  if (times.length) { tickTimes(); setInterval(tickTimes, 30000); }

  // ---------- destinations: region bar + a tall map that follows the region you're reading ----------
  const bar = $$('.regionbar a');
  const rbar = document.querySelector('.regionbar'); const dlay = document.querySelector('.destlayout');
  if (rbar && dlay) {
    // the bar only steps aside with the header once it is pinned at the top; until then it stays put under the hero
    const hero = document.querySelector('.phero');
    const out = () => { rbar.classList.toggle('is-out', dlay.getBoundingClientRect().bottom < 160); if (hero) rbar.classList.toggle('is-stuck', hero.getBoundingClientRect().bottom <= 1); };
    addEventListener('scroll', out, { passive: true }); out();
  }
  if (bar.length) {
    const rio = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) bar.forEach((a) => a.classList.toggle('is-active', a.hash === `#${en.target.id}`)); }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.region').forEach((r) => rio.observe(r));
  }
  const destFig = document.querySelector('.worldmap--dest');
  if (destFig && matchMedia('(min-width: 1080px)').matches) {
    const boxes = {
      'south-america': { lon0: -95, lon1: -28, lat0: 6, lat1: -24 }, 'central-america': { lon0: -112, lon1: -62, lat0: 26, lat1: 6 },
      'north-america': { lon0: -135, lon1: -50, lat0: 50, lat1: 30 }, europe: { lon0: -14, lon1: 44, lat0: 50, lat1: 38 },
      africa: { lon0: -22, lon1: 56, lat0: 10, lat1: -10 }, asia: { lon0: 64, lon1: 132, lat0: 26, lat1: 10 },
    };
    // no panel: the canvas spans the whole screen behind the page; the region sits in a soft focus circle
    // in the map column, and everything outside it shows at 20%
    const destFocus = destFig.querySelector('.destmap__focus'); const dtip = destFig.querySelector('.destmap__tip');
    const map = makeMap(destFig, {
      now: true, maxScale: 5.2, dur: 1200, view: boxes['south-america'], focus: destFocus,
      colors: { dim: 'rgba(30,26,22,.17)', ring: 'rgba(30,26,22,.22)', lit: '#1E1A16', arc: '#1E1A16' },
      plane: 'M11 0C11 .9 9.6 1.4 8 1.4L3.2 1.4 -1.6 8.2 -3.6 8.2 -1.2 1.4 -6 1.4 -8.2 4 -9.6 4 -8.4 0 -9.6 -4 -8.2 -4 -6 -1.4 -1.2 -1.4 -3.6 -8.2 -1.6 -8.2 3.2 -1.4 8 -1.4C9.6 -1.4 11 -.9 11 0Z',
      canvas: document.querySelector('.destbg canvas'),
      target: destFocus, drag: true, hover: { color: '#1E1A16', radius: 30 },
      onMove: (lon, lat, m, land, dragging) => {
        if (dragging) destFocus.classList.add('is-used');
        if (lon === null || !land) { dtip.classList.remove('is-on'); destFocus.classList.remove('is-land'); return; }
        const id = regionAt(lon, lat); const sec = document.getElementById(id); if (!sec) { dtip.classList.remove('is-on'); return; }
        const n = sec.querySelectorAll('.dcard').length; const fr = destFig.getBoundingClientRect(), cr = document.querySelector('.destbg canvas').getBoundingClientRect();
        dtip.textContent = `${sec.querySelector('h2').textContent} · ${n} destinations`; dtip.style.left = `${m[0] + cr.left - fr.left}px`; dtip.style.top = `${m[1] + cr.top - fr.top}px`;
        dtip.classList.add('is-on'); destFocus.classList.add('is-land');
      },
      onClick: (lon, lat) => {
        const sec = document.getElementById(regionAt(lon, lat)); if (!sec) return; destFocus.classList.add('is-used');
        lenis ? lenis.scrollTo(sec, { offset: -110, duration: 1.4 }) : sec.scrollIntoView({ behavior: 'smooth' });
        map.fly({ ...boxes[sec.id] });
      },
    });
    const sel = destFig.querySelector('.pass__select'); const pass = destFig.querySelector('.pass');
    const K = (k) => pass.querySelector(`[data-k="${k}"]`);
    const put = (k, v) => { const el = K(k); if (el.textContent === v) return; el.textContent = v; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
    const origin = () => { const o = sel.selectedOptions[0]; return { code: o.value, city: o.dataset.city, at: [+o.dataset.lat, +o.dataset.lon] }; };
    // great-circle distance at a cruising ~830 km/h, plus half an hour for climb and descent
    const flying = (a, b) => {
      const R = 6371, r = Math.PI / 180; const dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r;
      const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2;
      const hrs = (2 * R * Math.asin(Math.sqrt(h))) / 830 + 0.5; const H = Math.floor(hrs), M = Math.round((hrs - H) * 12) * 5;
      return `≈ ${M === 60 ? H + 1 : H}h ${M === 60 ? 0 : M}m`;
    };
    const clocks = new Map(); const localNow = (tz) => { if (!clocks.has(tz)) clocks.set(tz, new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })); return clocks.get(tz).format(new Date()); };
    let last = null;
    const route = (c) => {
      const o = origin(); put('from', o.code); put('fromCity', o.city);
      if (!c) return; last = c; const to = [+c.dataset.lat, +c.dataset.lon]; const name = c.querySelector('.dcard__name').textContent;
      pass.classList.remove('is-idle'); map.arc(o.at, to);
      put('to', name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()); put('toCity', name);
      put('time', flying(o.at, to)); put('best', c.dataset.best); put('price', `USD ${c.dataset.price}`);
    };
    const mio = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting && boxes[en.target.dataset.region]) map.fly({ ...boxes[en.target.dataset.region] }); }), { rootMargin: '-35% 0px -55% 0px' });
    $$('.region').forEach((r) => mio.observe(r));
    $$('.dcard').forEach((c) => {
      const show = () => route(c);
      c.addEventListener('mouseenter', show); c.addEventListener('focus', show);
      c.addEventListener('mouseleave', () => map.clear()); c.addEventListener('blur', () => map.clear());
    });
    // the ticket is editable: hovering it replays its flight; changing 'From' re-routes it
    pass.addEventListener('mouseenter', () => { if (last) route(last); });
    pass.addEventListener('mouseleave', () => map.clear());
    sel.addEventListener('change', () => route(last));
    sel.addEventListener('focus', () => { if (last) route(last); });
    sel.addEventListener('blur', () => map.clear());
  }

  // ---------- gallery: a wall you drag around; photos drift at their own depth; it wraps forever ----------
  const wall = document.querySelector('.wall');
  if (wall) {
    const stage = wall.querySelector('.wall__stage'); const items = $$('.wall__item', wall);
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    let W = 0, H = 0; const L = [];
    const layout = () => {
      const cols = 6, rows = 4; W = Math.max(innerWidth * 1.9, 2200); H = Math.max(innerHeight * 2.1, 1500);
      const cw = W / cols, ch = H / rows; L.length = 0;
      items.forEach((it, i) => {
        const c = i % cols, r = Math.floor(i / cols) % rows; const portrait = (i * 7) % 3 !== 0;
        const w = (portrait ? 0.42 : 0.6) * cw * (0.8 + rnd() * 0.45); const h = portrait ? w * 1.28 : w * 0.7;
        const depth = 0.75 + rnd() * 0.5;
        L.push({ it, x: c * cw + rnd() * (cw - w), y: r * ch + rnd() * (ch - h) + (c % 2) * ch * 0.35, w, h, depth });
        it.style.width = `${w}px`; it.style.height = `${h}px`;
      });
    };
    let ox = 0, oy = 0, vx = -0.25, vy = -0.12, dragging = false, moved = 0, px = 0, py = 0, raf = 0;
    const mod = (a, n) => ((a % n) + n) % n;
    const place = () => { for (const p of L) { const x = mod(p.x + ox * p.depth, W) - (W - innerWidth) / 2; const y = mod(p.y + oy * p.depth, H) - (H - innerHeight) / 2; p.it.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; } };
    const tick = () => {
      if (!dragging) { ox += vx; oy += vy; vx *= 0.95; vy *= 0.95; if (motion && Math.abs(vx) < 0.22) vx += (-0.22 - vx) * 0.02; if (motion && Math.abs(vy) < 0.1) vy += (-0.1 - vy) * 0.02; }
      place(); raf = wall.classList.contains('is-grid') ? 0 : requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    // no pointer capture: a plain click must still reach the photo under it
    stage.addEventListener('pointerdown', (e) => { if (wall.classList.contains('is-grid') || e.button > 0) return; dragging = true; moved = 0; px = e.clientX; py = e.clientY; stage.classList.add('is-drag'); });
    addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; ox += dx; oy += dy; vx = dx; vy = dy; moved += Math.abs(dx) + Math.abs(dy); });
    const end = () => { dragging = false; stage.classList.remove('is-drag'); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    stage.addEventListener('keydown', (e) => { const k = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key]; if (k && !wall.classList.contains('is-grid')) { e.preventDefault(); vx = k[0] / 4; vy = k[1] / 4; } });
    layout(); place(); start();
    addEventListener('resize', () => { layout(); place(); });
    // view toggle; phones start on the grid
    const setView = (v) => {
      wall.classList.toggle('is-grid', v === 'grid');
      $$('.wall__toggle button[data-view]', wall).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      if (v === 'grid') items.forEach((it) => { it.style.transform = ''; }); else { layout(); start(); }
      paintHeader(); onScroll();
    };
    $$('.wall__toggle button[data-view]', wall).forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    // light / dark: the wall on paper or on black; remembered for this visitor
    const setMode = (m) => {
      wall.classList.toggle('is-light', m === 'light'); wall.dataset.theme = m === 'light' ? 'light' : 'dark';
      const tb = wall.querySelector('.wall__theme'); tb.setAttribute('aria-pressed', String(m === 'light')); tb.setAttribute('aria-label', m === 'light' ? 'Dark background' : 'Light background');
      try { localStorage.setItem('t1817-wall', m); } catch (e) { /* storage may be blocked */ }
      dispatchEvent(new Event('scroll'));
    };
    wall.querySelector('.wall__theme').addEventListener('click', () => setMode(wall.classList.contains('is-light') ? 'dark' : 'light'));
    try { if (localStorage.getItem('t1817-wall') === 'light') setMode('light'); } catch (e) { /* ignore */ }
    if (!fine || innerWidth < 700) setView('grid');
    // lightbox
    const box = document.querySelector('.lightbox'); const bimg = box.querySelector('img'); const cap = box.querySelector('figcaption'); const count = box.querySelector('.lightbox__count');
    let cur = 0;
    const show = (i) => { cur = (i + items.length) % items.length; const im = items[cur].querySelector('img'); bimg.src = im.dataset.full || im.src; bimg.alt = im.alt; cap.textContent = items[cur].querySelector('.wall__cap').textContent; count.textContent = `${cur + 1} / ${items.length}`; };
    items.forEach((it, i) => it.addEventListener('click', (e) => { if (moved > 6 && !wall.classList.contains('is-grid')) { e.preventDefault(); return; } show(i); box.showModal(); lenis && lenis.stop(); }));
    box.querySelector('[data-prev]').addEventListener('click', () => show(cur - 1));
    box.querySelector('[data-next]').addEventListener('click', () => show(cur + 1));
    box.querySelector('.lightbox__close').addEventListener('click', () => box.close());
    box.addEventListener('close', () => lenis && lenis.start());
    box.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  // ---------- contact: planner fills the ticket; ?trip=italy arrives pre-filled ----------
  const planner = document.querySelector('.planner__form');
  if (planner) {
    const card = document.querySelector('.ticket'); const state = { where: [], when: [], who: [], budget: [] }; let count = 2;
    const out = document.getElementById('f-count');
    const setRow = (k, text) => { const row = card.querySelector(`[data-k="${k}"]`); const dd = row.querySelector('dd'); const was = dd.textContent; dd.textContent = text || 'Not chosen yet'; row.classList.toggle('is-set', !!text); if (text && text !== was) { dd.classList.remove('flash'); void dd.offsetWidth; dd.classList.add('flash'); } };
    const render = () => {
      setRow('where', [...state.where, document.getElementById('f-where').value.trim()].filter(Boolean).join(', '));
      setRow('when', [state.when[0], document.getElementById('f-length').value.trim()].filter(Boolean).join(', '));
      setRow('who', state.who[0] ? `${state.who[0]} · ${count} traveller${count === 1 ? '' : 's'}` : '');
      setRow('budget', state.budget[0] ? `${state.budget[0]} per person` : '');
    };
    $$('.chips', planner).forEach((g) => {
      const key = g.dataset.name, multi = g.dataset.multi === 'true';
      g.addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return; const v = b.dataset.value; const on = b.getAttribute('aria-pressed') !== 'true';
        if (!multi) $$('.chip', g).forEach((c) => c.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', String(on));
        state[key] = multi ? (on ? [...state[key], v] : state[key].filter((x) => x !== v)) : (on ? [v] : []);
        if (key === 'who' && on) { count = { 'Just me': 1, 'A couple': 2, Family: 4, Friends: 4 }[v] || count; out.textContent = count; }
        render();
      });
    });
    $$('[data-step]', planner).forEach((b) => b.addEventListener('click', () => { count = clamp(count + Number(b.dataset.step), 1, 30); out.textContent = count; render(); }));
    ['f-where', 'f-length'].forEach((id) => document.getElementById(id).addEventListener('input', render));
    const trip = new URLSearchParams(location.search).get('trip');
    if (trip) document.getElementById('f-where').value = trip.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Usa', 'United States');
    render();
    const note = planner.querySelector('.form-note');
    planner.addEventListener('submit', (e) => { e.preventDefault(); if (!planner.reportValidity()) return; note.textContent = 'This form isn’t connected yet. Please email travel1817@hotmail.com and Sumi will reply.'; note.classList.add('is-ok'); });
  }
})();
