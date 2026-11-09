// Phase 6: compact UI — floating contextual toolbar, right-click menu, compact pages bar, focus mode, logo → home
(function () {
  const X = window.XTK, canvas = X.canvas, st = X.state, $ = s => document.querySelector(s);
  const stage = $('#stage'), bar = $('#floatBar'), menu = $('#ctxMenu'), view = $('#view-designer');
  const LS = k => { try { return localStorage.getItem('xtk.ui.' + k); } catch (e) { return null; } };
  const SS = (k, v) => { try { localStorage.setItem('xtk.ui.' + k, v); } catch (e) { } };

  // ---------- Unsaved-changes tracking + logo → home ----------
  let dirty = false, loading = 0;
  const lj = canvas.loadFromJSON.bind(canvas);
  canvas.loadFromJSON = function (json, cb, rev) { loading++; return lj(json, function () { const r = cb && cb.apply(this, arguments); setTimeout(() => loading--, 0); return r; }, rev); };
  ['object:added', 'object:removed', 'object:modified', 'text:changed'].forEach(ev => canvas.on(ev, () => { if (!loading) dirty = true; }));
  const clean = () => setTimeout(() => { dirty = false; }, 400);
  $('#save').addEventListener('click', clean);
  ['#libGrid', '#templateGrid', '#customGo', '#view-saved'].forEach(s => $(s)?.addEventListener('click', clean));
  X.isDirty = () => dirty; X.markClean = () => { dirty = false; };
  $('#logoHome').addEventListener('click', e => {
    e.preventDefault();
    if (dirty && !confirm('Bạn có thay đổi chưa lưu. Rời khỏi và quay về trang chủ?')) return;
    dirty = false; location.href = location.pathname;
  });

  // ---------- Floating contextual toolbar ----------
  const fbFont = $('#fbFont');
  fbFont.innerHTML = (X.FONTS || []).map(f => `<option style="font-family:'${f}'">${f}</option>`).join('');
  const isText = o => o && /text/i.test(o.type);
  const isImg = o => o && o.type === 'image';
  let hideFor = false;
  // Contextual toolbar now lives in #ctxBarSlot above the stage (js/ctx-toolbar.js). Keep a light sync for lock state
  // and text field values when ctx-toolbar is absent; never cover the canvas with absolute positioning.
  function place() {
    if (!view.classList.contains('active')) return;
    bar.hidden = false; bar.style.transform = 'none';
    const o = canvas.getActiveObject();
    if (window.XTK_CTX_UI) return; // ctx-toolbar owns visibility
    if (!o) { $('#fbText').hidden = true; $('#fbImg').hidden = true; return; }
    $('#group').hidden = o.type !== 'activeSelection'; $('#ungroup').hidden = o.type !== 'group';
    const t = isText(o), im = isImg(o);
    $('#fbText').hidden = !t; $('#fbImg').hidden = !im;
    if (t && document.activeElement?.closest?.('#fbText') == null) {
      fbFont.value = o.fontFamily; $('#fbSize').value = Math.round(o.fontSize * (o.scaleY || 1));
      const c = typeof o.fill === 'string' && /^#[0-9a-f]{6}$/i.test(o.fill) ? o.fill : '#000000'; $('#fbColor').value = c;
    }
    $('#lock').classList.toggle('on', !!o.lockMovementX);
  }
  let raf = 0; const sched = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); };
  canvas.on('after:render', sched);
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:moving', 'object:scaling', 'object:rotating', 'object:modified'].forEach(ev => canvas.on(ev, sched));
  window.addEventListener('resize', sched);
  new ResizeObserver(sched).observe(stage);
  bar.addEventListener('mousedown', e => e.stopPropagation());
  const setT = (fn) => { const o = canvas.getActiveObject(); if (!isText(o)) return; fn(o); o.setCoords(); canvas.requestRenderAll(); X.snapshot(); X.renderProps?.(); };
  fbFont.onchange = () => setT(o => o.set('fontFamily', fbFont.value));
  $('#fbSize').onchange = () => setT(o => { if (window.XTK_CTX) window.XTK_CTX.setDisplayFontSize(o, $('#fbSize').value); else { const v = Math.max(4, Math.min(800, +$('#fbSize').value || 12)); o.set({ fontSize: v, scaleX: 1, scaleY: 1 }); } });
  $('#fbColor').oninput = () => { const o = canvas.getActiveObject(); if (isText(o)) { o.set('fill', $('#fbColor').value); canvas.requestRenderAll(); } };
  $('#fbColor').onchange = () => setT(o => o.set('fill', $('#fbColor').value));
  function openProps(match) {
    if (view.classList.contains('hide-right')) $('#toggleRight').click();
    if (document.body.classList.contains('focus')) setFocus(false);
    const props = $('.props'); const sum = [...props.querySelectorAll('summary, h3, h4, .sec-h, legend')].find(s => match.test(s.textContent));
    const det = sum?.closest('details'); if (det) det.open = true;
    (sum || props).scrollIntoView({ block: 'center', behavior: 'smooth' });
    const pane = sum?.closest('details') || sum?.parentElement; if (pane) { pane.classList.add('flash'); setTimeout(() => pane.classList.remove('flash'), 1200); }
  }
  $('#fbCrop').onclick = () => openProps(/Cắt ảnh/);
  $('#fbFilter').onclick = () => openProps(/Chỉnh ảnh|Khung ảnh/);
  $('#fbRmbg').onclick = () => { const o = canvas.getActiveObject(); if (isImg(o)) X.removeBg(o); };

  // ---------- Right-click context menu (click without drag; drag still pans) ----------
  const closeMenu = () => { menu.hidden = true; };
  stage.addEventListener('xtk:ctxmenu', ev => {
    const e = ev.detail; let t = canvas.findTarget(e, false);
    if (!t) { closeMenu(); return; }
    const a = canvas.getActiveObject();
    if (!(a && a.type === 'activeSelection' && a.contains?.(t))) { canvas.setActiveObject(t); canvas.requestRenderAll(); }
    menu.hidden = false;
    const r = stage.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    const x = Math.max(4, Math.min(r.width - mw - 4, e.clientX - r.left)), y = Math.max(4, Math.min(r.height - mh - 4, e.clientY - r.top));
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    menu.querySelector('button')?.focus({ preventScroll: true });
  });
  menu.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; closeMenu(); $('#' + b.dataset.c).click(); });
  document.addEventListener('mousedown', e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); e.stopPropagation(); } }, true);
  canvas.on('mouse:wheel', closeMenu);

  // ---------- Compact pages bar ----------
  const pb = $('#pagesBar'), pages = $('#pages');
  function syncPages() {
    const n = pages.children.length || 1, cur = [...pages.children].findIndex(p => p.classList.contains('on')) + 1 || 1;
    $('#pagesLabel').textContent = `Trang ${cur}/${n}`;
    const pref = LS('pages');
    const col = pref === 'closed' || (pref !== 'open' && n <= 1);
    pb.classList.toggle('collapsed', col); $('#pagesToggle').textContent = col ? '▸' : '▾';
    $('#pagesToggle').setAttribute('aria-expanded', String(!col));
  }
  $('#pagesToggle').onclick = () => { const col = !pb.classList.contains('collapsed'); SS('pages', col ? 'closed' : 'open'); syncPages(); setTimeout(() => X.fit?.(), 0); };
  new MutationObserver(syncPages).observe(pages, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  syncPages();

  // ---------- Focus mode ----------
  function setFocus(on) {
    document.body.classList.toggle('focus', on); $('#focusExit').hidden = !on;
    $('#focusBtn').setAttribute('aria-pressed', String(on));
    closeMenu(); setTimeout(() => { X.fitPage?.() ?? X.fit?.(); sched(); }, 30);
  }
  X.setFocus = setFocus;
  $('#focusBtn').onclick = () => setFocus(!document.body.classList.contains('focus'));
  $('#focusExit').onclick = () => setFocus(false);
  document.addEventListener('keydown', e => {
    if (!(e.key === 'f' || e.key === 'F') || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || canvas.getActiveObject()?.isEditing) return;
    if (!view.classList.contains('active')) return;
    e.preventDefault(); setFocus(!document.body.classList.contains('focus'));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('focus') && !canvas.getActiveObject()?.isEditing && menu.hidden) setFocus(false); });
})();
