(() => {
  const $ = s => document.querySelector(s);
  const FONTS = ['Be Vietnam Pro', 'Montserrat', 'Lora', 'Roboto', 'Playfair Display', 'Dancing Script', 'Lobster', 'Pacifico', 'Bungee', 'Nunito', 'Oswald', 'Merriweather', 'Quicksand', 'Comfortaa', 'Patrick Hand', 'Baloo 2', 'Charm'];
  const P = () => window.XTK_FX.PROPS;
  const PALETTE = ['#111827', '#ffffff', '#4f46e5', '#7c3aed', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#0ea5e9', '#1e3a8a', '#a16207', '#fef3c7', '#d1d5db'];
  let state = { tpl: null, id: null, pages: [null], cur: 0 };
  let history = [], hIndex = -1, restoring = false;

  const toast = (msg, ms = 3500) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms); };

  // ---------- Views
  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    document.querySelectorAll('.nav[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'designer') { if (!state.tpl) openTemplate(TEMPLATES[2]); else fit(); }
    if (view === 'saved') renderSaved();
  }
  document.querySelectorAll('.nav[data-view]').forEach(b => b.onclick = () => show(b.dataset.view));

  // ---------- Template picker
  function renderTemplates() {
    const g = $('#templateGrid'); g.innerHTML = '';
    TEMPLATES.forEach(t => {
      const s = Math.min(150 / t.w, 100 / t.h);
      const el = document.createElement('div'); el.className = 'card tpl';
      el.innerHTML = `<div class="box"><div class="shape" style="width:${t.w * s}px;height:${t.h * s}px"></div></div>
        <b>${t.name}${t.w > 8000 || t.h > 8000 ? '<span class="badge">xuất theo mảnh</span>' : ''}</b>
        <small>${t.w} × ${t.h} px${t.print ? ' · 300dpi · ' + (t.w / 300 * 2.54).toFixed(1) + '×' + (t.h / 300 * 2.54).toFixed(1) + ' cm' : ''}</small>`;
      el.onclick = () => { openTemplate(t); show('designer'); };
      g.appendChild(el);
    });
  }
  $('#customGo').onclick = () => {
    const u = $('#customUnit').value; let w = +$('#customW').value, h = +$('#customH').value;
    if (u !== 'px') { const f = u === 'cm' ? 10 : 1; w = mm2px(w * f); h = mm2px(h * f); }
    if (!(w >= 16 && h >= 16 && w <= 30000 && h <= 30000)) return toast('Kích thước phải từ 16 đến 30000 px');
    openTemplate({ id: 'custom', name: 'Tùy chỉnh', w: Math.round(w), h: Math.round(h), print: u !== 'px' }); show('designer');
  };

  // ---------- Canvas
  const canvas = new fabric.Canvas('c', { preserveObjectStacking: true, backgroundColor: '#ffffff' });
  fabric.Object.prototype.set({ transparentCorners: false, cornerColor: '#4f46e5', cornerStyle: 'circle', borderColor: '#4f46e5' });
  window.XTK_canvas = canvas;

  // ---------- Workspace view: the Fabric canvas fills the whole stage; the page artboard is placed by the
  // viewport transform (zoom + pan). Marquee selection, wheel zoom, Space/middle-drag pan and scrollbars all work on it.
  const view = { fitMode: true, target: null, raf: 0 };
  const stageEl = $('#stage'), ZMAX = 8;
  const stageSize = () => [stageEl.clientWidth, stageEl.clientHeight];
  const fitZoom = () => { const [W, H] = stageSize(), pad = 40; return Math.min((W - pad) / state.tpl.w, (H - pad) / state.tpl.h); };
  const zMin = () => Math.min(0.05, fitZoom() * 0.5);
  const clampZ = z => Math.max(zMin(), Math.min(ZMAX, z));
  // Allowed pan range on one axis (V = viewport px, P = page px on screen): while the page fits it may sit
  // anywhere with at least 3/4 of it inside the viewport (so zooming stays anchored on the cursor), otherwise it can scroll
  // until its edge is a small margin inside the viewport.
  function range(V, P) { if (P <= V) return [-0.25 * P, V - 0.75 * P]; const m = V * 0.25; return [V - P - m, m]; }
  function setView(z, x, y) {
    if (!state.tpl) return;
    const [W, H] = stageSize(); z = clampZ(z);
    const [x0, x1] = range(W, state.tpl.w * z), [y0, y1] = range(H, state.tpl.h * z);
    x = Math.max(x0, Math.min(x1, x)); y = Math.max(y0, Math.min(y1, y));
    canvas.setViewportTransform([z, 0, 0, z, x, y]);
    updateViewUI();
  }
  // Re-layout after a resize / page change: keeps the user's zoom unless the view is in "fit" mode
  function fit() {
    if (!state.tpl) return;
    const [W, H] = stageSize(); if (!(W > 0 && H > 0)) return;
    if (canvas.width !== W || canvas.height !== H) canvas.setDimensions({ width: W, height: H });
    const v = canvas.viewportTransform;
    if (view.fitMode) { const z = fitZoom(); if (!(z > 0)) return; setView(z, (W - state.tpl.w * z) / 2, (H - state.tpl.h * z) / 2); }
    else setView(v[0], v[4], v[5]);
    canvas.requestRenderAll();
  }
  function fitPage() { view.fitMode = true; cancelAnimationFrame(view.raf); view.target = null; fit(); }
  // Zoom to z keeping the scene point under (px, py) (stage px) fixed
  function zoomAt(z, px, py) {
    if (!state.tpl) return; const v = canvas.viewportTransform, oz = v[0]; z = clampZ(z);
    if (px == null) { const [W, H] = stageSize(); px = W / 2; py = H / 2; }
    view.fitMode = false; setView(z, px - (px - v[4]) / oz * z, py - (py - v[5]) / oz * z);
  }
  // Smoothly animate towards a target zoom (mouse-wheel notches); trackpad pinch applies directly
  function zoomSmooth(z, px, py) {
    view.target = { z: clampZ(z), px, py };
    if (view.raf) return;
    const step = () => {
      const t = view.target; if (!t) { view.raf = 0; return; }
      const cur = canvas.getZoom(), next = Math.abs(t.z / cur - 1) < 0.004 ? t.z : cur * Math.pow(t.z / cur, 0.35);
      zoomAt(next, t.px, t.py);
      if (next === t.z) { view.target = null; view.raf = 0; window.XTK_HOOKS?.viewSettled?.(); } else view.raf = requestAnimationFrame(step);
    };
    view.raf = requestAnimationFrame(step);
  }
  function panBy(dx, dy) { const v = canvas.viewportTransform; view.fitMode = false; setView(v[0], v[4] + dx, v[5] + dy); }
  function updateViewUI() {
    if (!state.tpl) return;
    const z = canvas.getZoom(), v = canvas.viewportTransform, [W, H] = stageSize();
    $('#zoomPct').textContent = (z * 100).toFixed(z < 0.1 ? 1 : 0) + '%';
    { const pct = (z * 100).toFixed(z < 0.1 ? 1 : 0) + '%', t = state.tpl, si = $('#sizeInfo'), nm = t.name.replace(/\s*\([^)]*\)\s*$/, '');
      si.textContent = `${nm} · ${pct}`;
      si.title = [t.name, t.print ? `Khổ in: ${(t.w / 300 * 2.54).toFixed(1)} × ${(t.h / 300 * 2.54).toFixed(1)} cm` : '', `Điểm ảnh: ${t.w} × ${t.h} px`, t.print ? 'Độ phân giải in: 300 dpi' : 'Dùng cho màn hình (px)', `Thu phóng: ${pct}`].filter(Boolean).join('\n'); }
    [['#hbar', W, state.tpl.w * z, v[4]], ['#vbar', H, state.tpl.h * z, v[5]]].forEach(([sel, V, P, x]) => {
      const bar = $(sel), [a, b] = range(V, P), L = V + (b - a); bar.hidden = P <= V || b - a < 1; if (bar.hidden) return;
      const horiz = sel === '#hbar', track = horiz ? bar.clientWidth : bar.clientHeight, th = bar.firstElementChild;
      const len = Math.max(24, track * V / L), pos = (track - len) * (b - x) / (b - a);
      th.style[horiz ? 'left' : 'top'] = pos + 'px'; th.style[horiz ? 'width' : 'height'] = len + 'px';
    });
    window.XTK_HOOKS?.view?.();
  }
  // Scrollbars: drag the thumb or click the track
  ['#hbar', '#vbar'].forEach(sel => {
    const bar = $(sel), th = bar.firstElementChild, horiz = sel === '#hbar';
    const geom = () => { const [W, H] = stageSize(), V = horiz ? W : H, P = (horiz ? state.tpl.w : state.tpl.h) * canvas.getZoom(), [a, b] = range(V, P), track = horiz ? bar.clientWidth : bar.clientHeight; return { a, b, track, len: Math.max(24, track * V / (V + b - a)) }; };
    const setPos = x => { const v = canvas.viewportTransform; view.fitMode = false; horiz ? setView(v[0], x, v[5]) : setView(v[0], v[4], x); };
    th.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); th.setPointerCapture(e.pointerId); th.classList.add('drag');
      const g = geom(), start = horiz ? e.clientX : e.clientY, x0 = canvas.viewportTransform[horiz ? 4 : 5], k = (g.b - g.a) / Math.max(1, g.track - g.len);
      const move = ev => setPos(x0 - ((horiz ? ev.clientX : ev.clientY) - start) * k);
      const up = () => { th.classList.remove('drag'); th.removeEventListener('pointermove', move); th.removeEventListener('pointerup', up); th.removeEventListener('pointercancel', up); };
      th.addEventListener('pointermove', move); th.addEventListener('pointerup', up); th.addEventListener('pointercancel', up);
    });
    bar.addEventListener('pointerdown', e => {
      if (e.target !== bar) return; e.preventDefault();
      const g = geom(), r = bar.getBoundingClientRect(), click = (horiz ? e.clientX - r.left : e.clientY - r.top) - g.len / 2;
      setPos(g.b - (g.b - g.a) * Math.max(0, Math.min(1, click / Math.max(1, g.track - g.len))));
    });
  });
  // Mouse wheel / trackpad: zoom centred on the cursor (plain wheel and Ctrl+wheel = pinch); Shift+wheel pans sideways
  stageEl.addEventListener('wheel', e => {
    if (!state.tpl || e.target.closest('.zoombar')) return;
    e.preventDefault();
    const r = stageEl.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1, dy = e.deltaY * unit, dx = e.deltaX * unit;
    if (e.shiftKey && !e.ctrlKey && !e.metaKey) return panBy(-(dx || dy), 0);
    if (!e.ctrlKey && !e.metaKey && Math.abs(dx) > Math.abs(dy)) return panBy(-dx, 0); // trackpad horizontal swipe scrolls sideways
    const pinch = e.ctrlKey || e.metaKey || Math.abs(dy) < 40; // trackpad pinch / fine scrolling: apply immediately
    const f = Math.exp(-Math.max(-300, Math.min(300, dy)) * (e.ctrlKey ? 0.01 : 0.0015));
    if (pinch) { view.target = null; zoomAt(canvas.getZoom() * f, px, py); }
    else zoomSmooth((view.target ? view.target.z : canvas.getZoom()) * f, px, py);
  }, { passive: false });
  // Pan: hold Space and drag, or drag with the middle mouse button (captured before Fabric sees the press)
  let spaceDown = false, panning = null;
  const editingText = () => canvas.getActiveObject()?.isEditing;
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || !$('#view-designer').classList.contains('active') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable || editingText()) return;
    e.preventDefault(); if (!spaceDown) { spaceDown = true; stageEl.classList.add('pan-ready'); }
  });
  const spaceUp = () => { spaceDown = false; stageEl.classList.remove('pan-ready'); };
  document.addEventListener('keyup', e => { if (e.code === 'Space') spaceUp(); });
  window.addEventListener('blur', spaceUp);
  // Right mouse button drags the view too (the browser context menu is suppressed over the canvas)
  canvas.wrapperEl.addEventListener('mousedown', e => {
    if (!(e.button === 1 || e.button === 2 || (e.button === 0 && spaceDown))) return;
    e.preventDefault(); e.stopPropagation();
    panning = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, moved: 0, go: e.button !== 2 }; if (panning.go) stageEl.classList.add('panning');
  }, true);
  window.addEventListener('mousemove', e => { if (!panning) return; if (!panning.go) { if (Math.hypot(e.clientX - panning.sx, e.clientY - panning.sy) < 4) return; panning.go = true; stageEl.classList.add('panning'); } const dx = e.clientX - panning.x, dy = e.clientY - panning.y; panning.moved += Math.abs(dx) + Math.abs(dy); panBy(dx, dy); panning.x = e.clientX; panning.y = e.clientY; });
  window.addEventListener('mouseup', e => { if (panning) { const p = panning; panning = null; stageEl.classList.remove('panning'); if (p.btn === 2 && !p.go && e.button === 2) stageEl.dispatchEvent(new CustomEvent('xtk:ctxmenu', { detail: e })); } });
  stageEl.addEventListener('contextmenu', e => { if (!e.target.closest('.zoombar')) e.preventDefault(); });
  canvas.wrapperEl.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  // Zoom bar + shortcuts
  $('#zoomIn').onclick = () => zoomSmooth(canvas.getZoom() * 1.25);
  $('#zoomOut').onclick = () => zoomSmooth(canvas.getZoom() / 1.25);
  $('#zoomFit').onclick = fitPage;
  $('#zoom100').onclick = () => { view.target = null; zoomAt(1); };
  document.addEventListener('keydown', e => {
    if (!$('#view-designer').classList.contains('active') || !(e.ctrlKey || e.metaKey) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomSmooth(canvas.getZoom() * 1.25); }
    else if (e.key === '-') { e.preventDefault(); zoomSmooth(canvas.getZoom() / 1.25); }
    else if (e.key === '0') { e.preventDefault(); fitPage(); }
    else if (e.key === '1') { e.preventDefault(); view.target = null; zoomAt(1); }
  });
  // Page artboard: the page background only fills the page; outside it the workspace shows, with
  // off-page parts of objects dimmed. Only applies on screen (exports render to their own context).
  const origBg = canvas._renderBackground, origOv = canvas._renderOverlay;
  canvas.controlsAboveOverlay = true;
  canvas._renderBackground = function (ctx) {
    if (ctx !== this.contextContainer || !state.tpl) return origBg.call(this, ctx);
    const v = this.viewportTransform; ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    ctx.beginPath(); ctx.rect(0, 0, state.tpl.w, state.tpl.h); ctx.restore();
    ctx.save(); ctx.shadowColor = '#0003'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.clip(); origBg.call(this, ctx); ctx.restore();
  };
  canvas._renderOverlay = function (ctx) {
    origOv.call(this, ctx);
    if (ctx !== this.contextContainer || !state.tpl) return;
    const v = this.viewportTransform, x = v[4], y = v[5], w = state.tpl.w * v[0], h = state.tpl.h * v[3];
    ctx.save(); ctx.fillStyle = 'rgba(236,237,243,0.82)'; ctx.beginPath(); ctx.rect(0, 0, this.width, this.height); ctx.rect(x, y, w, h); ctx.fill('evenodd');
    ctx.strokeStyle = '#0000001f'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) - 0.5, Math.round(y) - 0.5, Math.round(w) + 1, Math.round(h) + 1); ctx.restore();
  };
  canvas.selection = true; // left-drag on empty workspace draws a selection rectangle (marquee)
  canvas.selectionColor = 'rgba(79,70,229,0.08)'; canvas.selectionBorderColor = '#4f46e5'; canvas.selectionLineWidth = 1;
  new ResizeObserver(() => fit()).observe(stageEl);
  window.addEventListener('resize', fit);

  function openTemplate(t, json) {
    state.tpl = { ...t }; state.id = json ? state.id : null; if (!openTemplate._keepPages) { state.pages = [null]; state.cur = 0; }
    canvas.clear(); canvas.backgroundColor = '#ffffff';
    history = []; hIndex = -1;
    const after = () => { fitPage(); snapshot(); refreshLayers(); checkDpi(); window.XTK_HOOKS?.opened?.(); };
    if (json) { restoring = true; canvas.loadFromJSON(json, () => { restoring = false; canvas.renderAll(); after(); }); }
    else { $('#designName').value = t.name; after(); }
    setTimeout(fitPage, 0);
  }

  const U = () => Math.min(state.tpl.w, state.tpl.h); // unit for default sizes
  const center = o => { canvas.add(o); o.setPositionByOrigin(new fabric.Point(state.tpl.w / 2, state.tpl.h / 2), 'center', 'center'); o.setCoords(); canvas.setActiveObject(o); canvas.requestRenderAll(); };
  // Scale for a newly inserted image: fit inside ~80% of the page, never upscale beyond native unless it is tiny (<25% of the page)
  function fitScale(w, h) {
    const W = state.tpl.w, H = state.tpl.h, fitS = Math.min(W * 0.8 / w, H * 0.8 / h);
    let s = Math.min(1, fitS);
    if (w * s < W * 0.25 && h * s < H * 0.25) s = Math.min(fitS, Math.min(W * 0.4 / w, H * 0.4 / h));
    return s;
  }
  const color = () => $('#colorPick').value;

  $('#addHeading').onclick = () => center(new fabric.Textbox('Tiêu đề của bạn', { fontFamily: 'Be Vietnam Pro', fontWeight: 700, fontSize: U() * 0.1, fill: '#111827', width: state.tpl.w * 0.8, textAlign: 'center', name: 'Tiêu đề' }));
  $('#addText').onclick = () => center(new fabric.Textbox('Nhập nội dung ở đây — tiếng Việt có dấu đầy đủ.', { fontFamily: 'Roboto', fontSize: U() * 0.045, fill: '#374151', width: state.tpl.w * 0.6, textAlign: 'center', name: 'Đoạn văn' }));

  $('#uploadImg').onchange = e => {
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    const r = new FileReader();
    r.onload = () => fabric.Image.fromURL(r.result, img => {
      const s = fitScale(img.width, img.height);
      img.set({ scaleX: s, scaleY: s, name: 'Ảnh: ' + f.name.slice(0, 24) }); center(img); checkDpi();
    });
    r.readAsDataURL(f);
  };

  // ---------- DPI check for print templates
  function effDpi(o) { return o.type === 'image' ? o.width / (o.getScaledWidth() / 300) : Infinity; }
  let lowDpi = [];
  function checkDpi() {
    const w = $('#dpiWarn'), pop = $('#dpiPop');
    lowDpi = state.tpl?.print ? canvas.getObjects().filter(o => o.type === 'image' && effDpi(o) < 299.5) : [];
    if (!lowDpi.length) { w.hidden = true; pop.hidden = true; w.title = ''; return; }
    w.hidden = false; w.textContent = '⚠' + lowDpi.length;
    w.setAttribute('aria-label', `${lowDpi.length} ảnh có độ phân giải thấp cho bản in — bấm để chọn`);
    pop.innerHTML = '<b>⚠ Độ phân giải ảnh thấp cho bản in</b><ul></ul><p>Khuyến nghị ≥ 300 dpi. Thu nhỏ ảnh hoặc dùng ảnh gốc lớn hơn.</p><p class="muted">Bấm biểu tượng ⚠ để chọn các ảnh này.</p>';
    const ul = pop.querySelector('ul'); lowDpi.forEach(o => { const li = document.createElement('li'); li.textContent = `${o.name || 'Ảnh'} ≈ ${Math.round(effDpi(o))} dpi`; ul.appendChild(li); });
  }
  function selectLowDpi() {
    const objs = lowDpi.filter(o => canvas.getObjects().includes(o) && o.selectable !== false); if (!objs.length) return;
    canvas.discardActiveObject(); canvas.setActiveObject(objs.length === 1 ? objs[0] : new fabric.ActiveSelection(objs, { canvas })); canvas.requestRenderAll();
  }

  // ---------- Palette
  const pal = $('#palette');
  PALETTE.forEach(c => { const s = document.createElement('span'); s.style.background = c; s.title = c; s.onclick = () => applyColor(c); pal.appendChild(s); });
  function applyColor(c) {
    $('#colorPick').value = c;
    const o = canvas.getActiveObject(); if (!o) return;
    const targets = o.type === 'activeSelection' ? o.getObjects() : [o];
    targets.forEach(t => t.type === 'line' || (t.type === 'path' && !t.fill) ? t.set('stroke', c) : t.type === 'group' ? t.getObjects().forEach(x => x.set(x.type === 'line' ? 'stroke' : 'fill', c)) : t.set('fill', c));
    canvas.requestRenderAll(); snapshot(); if (!preview.on) renderProps();
  }
  // With an object selected the picker recolours it; with nothing selected it previews the page background
  $('#colorPick').oninput = e => canvas.getActiveObject() ? applyColor(e.target.value) : window.XTK_HOOKS.setBg(e.target.value);
  $('#applyBg').onclick = () => { window.XTK_HOOKS.setBg(color()); previewCommit(); };

  // ---------- History
  // Live colour preview: while a session is open colour edits render live but are not recorded;
  // "Áp dụng" records one history step, "Hủy" (or Esc / undo) restores the last committed state.
  const preview = { on: false };
  function previewBegin() {
    if (preview.on || !state.tpl) return; snapshot(); preview.on = true;
    $('#colorPreviewBar').hidden = false; document.body.classList.add('color-previewing');
  }
  function previewEnd() { preview.on = false; $('#colorPreviewBar').hidden = true; document.body.classList.remove('color-previewing'); }
  function previewCommit(quiet) { if (!preview.on) return false; previewEnd(); snapshot(); refreshLayers(); renderProps(); if (!quiet) toast('Đã áp dụng màu', 1200); return true; }
  function previewCancel() { if (!preview.on) return false; previewEnd(); restore(hIndex); toast('Đã hủy, trả lại màu cũ', 1200); return true; }
  $('#cpApply').onclick = () => previewCommit(); $('#cpCancel').onclick = () => previewCancel();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && preview.on) { e.preventDefault(); previewCancel(); } });
  // Any colour input in the designer starts a session before its own handler runs (capture phase)
  document.addEventListener('input', e => { const t = e.target; if (t.type === 'color' && !t.dataset.nopv && t.closest('#view-designer') && !t.closest('[data-tab="brand"]')) previewBegin(); }, true);
  function snapshot() {
    if (restoring || !state.tpl || preview.on) return;
    const j = JSON.stringify(canvas.toJSON(P()));
    if (history[hIndex] === j) return;
    history = history.slice(0, hIndex + 1); history.push(j);
    if (history.length > 60) history.shift(); hIndex = history.length - 1;
  }
  function restore(i) {
    if (preview.on) { previewEnd(); i = hIndex; } // undo/redo while previewing = cancel the preview
    if (i < 0 || i >= history.length) return;
    hIndex = i; restoring = true;
    canvas.loadFromJSON(history[i], () => { restoring = false; canvas.renderAll(); refreshLayers(); renderProps(); checkDpi(); });
  }
  $('#undo').onclick = () => restore(hIndex - 1);
  $('#redo').onclick = () => restore(hIndex + 1);
  canvas.on('object:added', () => { snapshot(); refreshLayers(); });
  canvas.on('object:removed', () => { snapshot(); refreshLayers(); });
  canvas.on('object:modified', () => { snapshot(); checkDpi(); renderProps(); });
  canvas.on('object:scaling', checkDpi);
  canvas.on('text:changed', () => refreshLayers());
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => canvas.on(ev, () => { renderProps(); refreshLayers(); }));

  // ---------- Delete & layers
  function del() {
    const o = canvas.getActiveObject(); if (!o || o.isEditing) return;
    (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => canvas.remove(x));
    canvas.discardActiveObject(); canvas.requestRenderAll();
  }
  $('#del').onclick = del;
  const order = fn => () => { const o = canvas.getActiveObject(); if (!o) return; fn(o); canvas.requestRenderAll(); snapshot(); refreshLayers(); };
  $('#front').onclick = order(o => canvas.bringToFront(o));
  $('#back').onclick = order(o => canvas.sendToBack(o));
  $('#forward').onclick = order(o => canvas.bringForward(o));
  $('#backward').onclick = order(o => canvas.sendBackwards(o));
  document.addEventListener('keydown', e => {
    if (!$('#view-designer').classList.contains('active') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace')) { del(); e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? restore(hIndex + 1) : restore(hIndex - 1); e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { restore(hIndex + 1); e.preventDefault(); }
  });
  function label(o) { return o.name && !/^(Tiêu đề|Đoạn văn)$/.test(o.name) ? o.name : (o.text ? '“' + o.text.slice(0, 22) + '”' : o.type); }
  function refreshLayers() {
    if (window.XTK_LAYERS) return window.XTK_LAYERS.refresh();
    const ul = $('#layers'); ul.innerHTML = ''; const act = canvas.getActiveObjects();
    canvas.getObjects().filter(o => o.name !== '__bg').reverse().forEach(o => {
      const li = document.createElement('li'); li.textContent = (o.xtk?.locked ? '🔒 ' : '') + label(o); if (act.includes(o)) li.className = 'sel';
      li.onclick = () => { canvas.setActiveObject(o); canvas.requestRenderAll(); };
      ul.appendChild(li);
    });
  }

  // ---------- Properties panel
  function renderProps() {
    const o = canvas.getActiveObject(), b = $('#propsBody');
    if (!o) { b.innerHTML = '<p class="muted">Chọn một đối tượng để chỉnh sửa.</p>'; return; }
    if (o.type === 'activeSelection') { b.innerHTML = `<p class="muted">Đã chọn ${o.size()} đối tượng. Dùng “Căn chỉnh”, “Nhóm” trên thanh công cụ.</p>`; return; }
    const isText = /text/.test(o.type) && !o.xtk?.curved;
    let h = '';
    if (isText) {
      h += `<label>Font<select data-p="fontFamily">${FONTS.map(f => `<option ${f === o.fontFamily ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
      <label>Cỡ chữ (px)<input type="number" data-p="fontSize" value="${Math.round(o.fontSize)}"></label>
      <label>Độ đậm<select data-p="fontWeight"><option value="400" ${o.fontWeight != 700 && o.fontWeight != 'bold' ? 'selected' : ''}>Thường</option><option value="700" ${o.fontWeight == 700 || o.fontWeight == 'bold' ? 'selected' : ''}>Đậm</option></select></label>
      <label>Căn lề<select data-p="textAlign">${['left', 'center', 'right'].map(a => `<option ${a === o.textAlign ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`;
    }
    const fillKey = o.type === 'line' ? 'stroke' : 'fill';
    if (o.type !== 'image' && !(o.type === 'group' && !o.xtk?.curved)) h += `<label>Màu<input type="color" data-p="${fillKey}" value="${typeof o[fillKey] === 'string' && o[fillKey].startsWith('#') ? o[fillKey].slice(0, 7) : '#000000'}"></label>`;
    h += `<label>Độ mờ<input type="range" min="0" max="1" step="0.05" data-p="opacity" value="${o.opacity}"></label>
      <label>Xoay (°)<input type="number" data-p="angle" value="${Math.round(o.angle)}"></label>`;
    if (o.type === 'image' && state.tpl.print) h += `<p class="small">Độ phân giải hiệu dụng: <b>${Math.round(effDpi(o))} dpi</b></p>`;
    b.innerHTML = h;
    b.querySelectorAll('[data-p]').forEach(inp => inp.oninput = () => {
      const p = inp.dataset.p; let v = inp.value;
      if (['fontSize', 'opacity', 'angle', 'fontWeight'].includes(p)) v = +v;
      if (p === 'angle') o.rotate(v); else o.set(p, v);
      o.setCoords(); canvas.requestRenderAll();
    });
    b.querySelectorAll('[data-p]').forEach(inp => inp.onchange = () => { snapshot(); refreshLayers(); });
    window.XTK_HOOKS?.props?.(o, b);
  }

  // ---------- Sample design
  function sampleDesign() {
    const { w, h } = state.tpl, u = U();
    canvas.backgroundColor = '#1e1b4b';
    const add = o => canvas.add(o);
    add(new fabric.Circle({ radius: u * 0.45, left: w * 0.62, top: -u * 0.15, fill: '#7c3aed', opacity: 0.85, name: 'Vòng tím' }));
    add(new fabric.Circle({ radius: u * 0.3, left: -u * 0.1, top: h - u * 0.45, fill: '#ec4899', opacity: 0.8, name: 'Vòng hồng' }));
    add(new fabric.Rect({ left: w * 0.06, top: h * 0.62, width: w * 0.3, height: u * 0.012, fill: '#f59e0b', name: 'Gạch vàng' }));
    add(new fabric.Textbox('KHAI TRƯƠNG\nCÀ PHÊ ĐÀ LẠT', { left: w * 0.06, top: h * 0.2, width: w * 0.8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: u * 0.14, fill: '#ffffff', lineHeight: 1.05, name: 'Tiêu đề' }));
    add(new fabric.Textbox('Giảm 20% tuần đầu tiên — hương vị cao nguyên mộc mạc', { left: w * 0.06, top: h * 0.66, width: w * 0.7, fontFamily: 'Lora', fontSize: u * 0.055, fill: '#fde68a', name: 'Phụ đề' }));
    add(new fabric.Textbox('Ưu đãi · Đặt bàn ngay', { left: w * 0.06, top: h * 0.82, width: w * 0.5, fontFamily: 'Be Vietnam Pro', fontWeight: 700, fontSize: u * 0.045, fill: '#a5f3fc', name: 'Lời kêu gọi' }));
    canvas.requestRenderAll(); snapshot(); refreshLayers();
  }

  // ---------- Save / load
  function thumb() {
    const s = Math.min(320 / state.tpl.w, 320 / state.tpl.h);
    const vpt = canvas.viewportTransform.slice(); canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    try { return canvas.toDataURL({ format: 'jpeg', quality: 0.8, multiplier: s, left: 0, top: 0, width: state.tpl.w, height: state.tpl.h }); }
    finally { canvas.viewportTransform = vpt; }
  }
  $('#save').onclick = async () => {
    canvas.discardActiveObject();
    const d = { id: state.id || ('d' + Date.now().toString(36)), name: $('#designName').value || 'Không tên', tpl: state.tpl, json: (state.pages[state.cur] = canvas.toJSON(P()), state.pages[0]), pages: state.pages.length > 1 ? state.pages : undefined, thumb: thumb(), updated: Date.now() };
    try { await DB.put(d); state.id = d.id; toast('Đã lưu “' + d.name + '” trên thiết bị'); }
    catch (e) { toast('Không lưu được: ' + e.message); }
  };
  function openDoc(d) {
    state.id = d.id; $('#designName').value = d.name; show('designer');
    openTemplate(d.tpl, d.pages ? d.pages[0] : d.json); state.id = d.id;
    state.pages = d.pages ? d.pages.slice() : [d.json]; state.cur = 0; window.XTK_HOOKS?.pages?.();
  }
  async function renderSaved() {
    const g = $('#savedGrid'); const all = await DB.all();
    g.innerHTML = all.length ? '' : '<p class="muted">Chưa có thiết kế nào được lưu.</p>';
    all.forEach(d => {
      const el = document.createElement('div'); el.className = 'card saved';
      el.innerHTML = `<img alt=""><b></b><br><small>${d.tpl.w}×${d.tpl.h} · ${new Date(d.updated).toLocaleString('vi-VN')}</small><div class="row"><button class="primary">Mở</button><button>Xóa</button></div>`;
      el.querySelector('img').src = d.thumb; el.querySelector('b').textContent = d.name;
      const [open, rm] = el.querySelectorAll('button');
      open.onclick = () => { openDoc(d); };
      rm.onclick = async () => { if (confirm('Xóa thiết kế này?')) { await DB.del(d.id); renderSaved(); } };
      g.appendChild(el);
    });
  }

  // ---------- Export
  async function doExport(format, scale) {
    const p = $('#progress'), bar = p.querySelector('div'), txt = p.querySelector('span');
    p.hidden = false; const t0 = performance.now();
    try {
      const r = await Exporter.exportDesign(canvas, state.tpl.w, state.tpl.h, { format, scale, ...(window.XTK.exportOpts?.() || {}), onProgress: (f, m) => { bar.style.width = (f * 100) + '%'; txt.textContent = m; } });
      const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob);
      a.download = `${($('#designName').value || 'thiet-ke').replace(/[\\/:*?"<>|]/g, '_')}_${r.width}x${r.height}.${format}`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      toast(`Đã xuất ${r.width}×${r.height}px ${format.toUpperCase()} (${window.XTK.exportOpts?.().dpi || 300}dpi${r.tiled ? ', ' + r.strips + ' mảnh' : ''}) trong ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      return r;
    } catch (e) { toast('Xuất ảnh thất bại: ' + e.message); throw e; }
    finally { p.hidden = true; }
  }
  $('#exportBtn').onclick = () => doExport($('#exportFmt').value, +$('#exportScale').value);

  // ---------- AI panel
  const s = AI.settings(); $('#aiBase').value = s.base; $('#aiModel').value = s.model;
  if (s.hasKey) $('#aiKey').placeholder = '•••••• (đã lưu trên thiết bị)';
  $('#toggleAI').onclick = () => { $('#aiPanel').hidden = !$('#aiPanel').hidden; };
  $('#closeAI').onclick = () => { $('#aiPanel').hidden = true; };
  $('#aiSaveKey').onclick = () => { AI.save({ base: $('#aiBase').value.trim(), model: $('#aiModel').value.trim(), key: $('#aiKey').value.trim() }); $('#aiKey').value = ''; $('#aiKey').placeholder = AI.settings().hasKey ? '•••••• (đã lưu trên thiết bị)' : 'Dán API key của bạn'; toast('Đã lưu cài đặt AI trên thiết bị này'); };
  $('#aiClearKey').onclick = () => { AI.clearKey(); $('#aiKey').placeholder = 'Dán API key của bạn'; toast('Đã xóa API key'); };
  $('#aiGo').onclick = async () => {
    const q = $('#aiPrompt').value.trim(); if (!q) return toast('Hãy mô tả ý tưởng của bạn');
    $('#aiStatus').textContent = 'Đang tạo ý tưởng…'; $('#aiGo').disabled = true;
    try { renderAI(await AI.generate(q, state.tpl || TEMPLATES[0])); $('#aiStatus').textContent = ''; }
    catch (e) { $('#aiStatus').textContent = e.message; }
    finally { $('#aiGo').disabled = false; }
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderAI(r) {
    const c = r.copy || {};
    const colors = (r.colors || []).filter(x => /^#[0-9a-f]{3,8}$/i.test(x));
    $('#aiResult').innerHTML = `
      <div class="ai-sec"><h5>Brief</h5><p>${esc(r.brief)}</p></div>
      <div class="ai-sec"><h5>Gợi ý bố cục</h5><p>${esc(r.layout)}</p></div>
      <div class="ai-sec"><h5>Bảng màu (bấm để dùng)</h5><div class="swatches">${colors.map(x => `<span data-c="${x}" style="background:${x}">${x}</span>`).join('')}</div></div>
      <div class="ai-sec"><h5>Font</h5><p>${(r.fonts || []).map(esc).join(', ')}</p></div>
      <div class="ai-sec"><h5>Nội dung chữ</h5>${['headline', 'subheadline', 'body', 'cta'].filter(k => c[k]).map(k => `<p><b>${k}:</b> ${esc(c[k])} <button class="small" data-add="${k}">+ Thêm</button></p>`).join('')}</div>
      <div class="ai-sec"><h5>Prompt tạo ảnh (EN)</h5>${(r.image_prompts || []).map(p => `<div class="prompt">${esc(p)}</div><button class="small" data-copy="${esc(p)}">Sao chép</button>`).join('')}</div>`;
    $('#aiResult').querySelectorAll('[data-c]').forEach(e => e.onclick = () => applyColor(e.dataset.c));
    $('#aiResult').querySelectorAll('[data-add]').forEach(e => e.onclick = () => {
      if (!state.tpl) openTemplate(TEMPLATES[2]);
      const k = e.dataset.add, big = k === 'headline';
      const font = (r.fonts || []).find(f => FONTS.includes(f)) || 'Be Vietnam Pro';
      center(new fabric.Textbox(c[k], { fontFamily: font, fontWeight: big ? 700 : 400, fontSize: U() * (big ? 0.1 : 0.045), fill: colors[0] || '#111827', width: state.tpl.w * 0.8, textAlign: 'center', name: k }));
    });
    $('#aiResult').querySelectorAll('[data-copy]').forEach(e => e.onclick = () => navigator.clipboard?.writeText(e.dataset.copy).then(() => toast('Đã sao chép prompt')));
  }

  // ---------- Online status + SW
  const net = () => $('#netStatus').textContent = navigator.onLine ? '● Trực tuyến' : '○ Ngoại tuyến (vẫn dùng được)';
  addEventListener('online', net); addEventListener('offline', net); net();
  // Service worker with update prompt: check on load + when the tab becomes visible; reload exactly once after the user accepts.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const sw = navigator.serviceWorker; let hadCtl = !!sw.controller, want = false, reloading = false;
    const upd = document.createElement('button'); upd.id = 'updToast'; upd.className = 'updtoast'; upd.hidden = true; upd.textContent = '🔄 Có bản mới – bấm để cập nhật'; document.body.appendChild(upd);
    let regRef = null;
    const offer = () => { if (hadCtl) upd.hidden = false; };
    upd.onclick = () => { want = true; upd.disabled = true; upd.textContent = 'Đang cập nhật…'; const w = regRef && regRef.waiting; if (w) w.postMessage('SKIP_WAITING'); else if (!reloading) { reloading = true; location.reload(); } };
    sw.addEventListener('controllerchange', () => { if (want && !reloading) { reloading = true; location.reload(); return; } offer(); });
    sw.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      regRef = reg; if (reg.waiting) offer();
      reg.addEventListener('updatefound', () => { const n = reg.installing; n && n.addEventListener('statechange', () => { if ((n.state === 'installed' || n.state === 'activated') && hadCtl) offer(); }); });
      const check = () => reg.update().catch(() => {}); check();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      window.XTK_SW = { reg, check };
    }).catch(() => {});
  }

  // Ensure bundled fonts are ready before rendering text on canvas
  Promise.all(FONTS.flatMap(f => ['400', '700'].map(w => document.fonts.load(`${w} 20px "${f}"`, 'Tiếng Việt ắằẳẵặ')))).then(() => { fabric.util.clearFabricFontCache?.(); canvas.requestRenderAll(); });

  renderTemplates();
  // Hooks for automated tests
  window.XTK = { colorPreview: preview, previewBegin, previewCommit, previewCancel, fitPage, zoomAt, zoomSmooth, panBy, setView, view, fitScale, openDoc, snapshot, restore, refreshLayers, renderProps, center, U, toast, checkDpi, selectLowDpi, lowDpi: () => lowDpi.slice(), fit, applyColor, FONTS, thumb, del, setRestoring: v => restoring = v, resetHistory: () => { history = []; hIndex = -1; }, openTemplate, sampleDesign, doExport, show, renderAI, exportDesign: (o) => Exporter.exportDesign(canvas, state.tpl.w, state.tpl.h, o), state, canvas };
})();
