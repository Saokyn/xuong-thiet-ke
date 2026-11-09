// Unified color side panel (Canva-style): opens from any swatch, temporarily replaces left .tools content.
(function (root) {
  const X = root.XTK, T = root.XTK_CTX, P = root.XTK_PALETTES;
  if (!X || !X.canvas || !T) return;
  const $ = s => document.querySelector(s), canvas = X.canvas;
  const tools = document.querySelector('#view-designer .tools') || document.querySelector('.tools');
  if (!tools) return;

  let state = { open: false, target: 'fill', obj: null, prevTab: null };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const panel = document.createElement('div');
  panel.id = 'colorPanel'; panel.className = 'color-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Chọn màu');
  tools.appendChild(panel);

  function titleFor(target, obj) {
    const base = ({ fill: 'Màu tô', stroke: 'Màu viền', text: 'Màu chữ', textBg: 'Nền chữ', shadow: 'Màu bóng', bg: 'Màu nền trang' })[target] || 'Chọn màu';
    const typeName = obj && ({ textbox: 'Chữ', 'i-text': 'Chữ', text: 'Chữ', rect: 'Hình chữ nhật', circle: 'Hình tròn', ellipse: 'Elip', triangle: 'Tam giác', path: 'Đường', group: 'Nhóm', image: 'Ảnh' })[obj.type];
    const name = obj && (obj.name || (root.XTK_LAYERS && root.XTK_LAYERS.layerName && root.XTK_LAYERS.layerName(obj)) || typeName || obj.type);
    return name && target !== 'bg' ? base + ' – ' + name : base;
  }
  function currentHexOf(target, obj) {
    if (target === 'bg') return T.normHex(typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : '') || '#ffffff';
    if (!obj) return '#4f46e5';
    if (target === 'stroke') return T.normHex(obj.stroke) || '#111827';
    if (target === 'textBg') return T.normHex(obj.backgroundColor) || '#fde047';
    if (target === 'shadow') return T.normHex(obj.shadow && obj.shadow.color) || '#000000';
    return T.normHex(typeof obj.fill === 'string' ? obj.fill : '') || '#4f46e5';
  }
  function ensureVisible() {
    const designer = document.getElementById('view-designer');
    if (designer && designer.classList.contains('hide-left')) {
      const btn = document.getElementById('toggleLeft'); if (btn) btn.click();
    }
    if (designer && designer.classList.contains('hide-tools')) {
      const btn = document.getElementById('toggleTools'); if (btn) btn.click();
    }
    tools.classList.add('color-open');
    try { tools.scrollTop = 0; } catch (e) { }
  }

  function swatchesHtml(colors, cls) {
    const cur = state.currentHex;
    return '<div class="cp-swatches ' + (cls || '') + '">' + (colors || []).map(c => {
      const on = !!(cur && T.normHex(c) === cur);
      return '<button type="button" class="cp-sw' + (on ? ' on current' : '') + '" style="background:' + c + '" data-c="' + c + '" title="' + c + '" aria-label="Màu ' + c + '" aria-current="' + (on ? 'true' : 'false') + '"></button>';
    }).join('') + '</div>';
  }


  function currentGradStops(obj) {
    if (!obj || !obj.fill || typeof obj.fill !== 'object' || !obj.fill.colorStops) return ['#4f46e5', '#ec4899'];
    const cs = obj.fill.colorStops || [];
    return [T.normHex(cs[0] && cs[0].color) || '#4f46e5', T.normHex(cs[cs.length - 1] && cs[cs.length - 1].color) || '#ec4899'];
  }
  function gradHtml() {
    if (state.target !== 'fill' && state.target !== 'text') return '';
    const o = state.obj;
    if (!o || o.type === 'image' || o.type === 'activeSelection' || (o.xtk && o.xtk.composite)) {
      return '<h5>Chuyển sắc</h5><p class="small muted">Chọn một hình/chữ (không phải ảnh / Lồng ảnh) để chỉnh 2 điểm dừng.</p>';
    }
    const [a, b] = currentGradStops(o);
    const on = !!(o.fill && typeof o.fill === 'object' && o.fill.colorStops);
    return `<h5>Chuyển sắc (2 màu)</h5>
      <label class="small"><input type="checkbox" id="cpGradOn" ${on ? 'checked' : ''}> Bật tô chuyển sắc</label>
      <div class="cp-swatches">
        <button type="button" class="cp-sw" data-gstop="0" style="background:${a}" title="Điểm dừng 1" aria-label="Điểm dừng 1"></button>
        <button type="button" class="cp-sw" data-gstop="1" style="background:${b}" title="Điểm dừng 2" aria-label="Điểm dừng 2"></button>
      </div>
      <p class="small muted">Bấm ô dừng rồi chọn màu bên dưới (hoặc HEX). Chỉ hỗ trợ 2 điểm tuyến tính ngang.</p>`;
  }
  function applyGradient(c0, c1) {
    const o = state.obj; if (!o || !root.fabric) return;
    const a = T.normHex(c0) || '#4f46e5', b = T.normHex(c1) || '#ec4899';
    o.set('fill', new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 1, y2: 0 }, colorStops: [{ offset: 0, color: a }, { offset: 1, color: b }] }));
    o.dirty = true; canvas.requestRenderAll();
    if (X.snapshot) X.snapshot(); if (X.renderProps) X.renderProps(); if (root.XTK_CTX_UI) root.XTK_CTX_UI.refresh();
    state._g = [a, b];
  }
  function render() {
    const docs = T.extractDocumentColors(canvas);
    const recent = T.loadRecent();
    let brand = [];
    try { brand = (root.XTK && root._brandColors) || []; } catch (e) { }
    // Brand kit colors from DOM if rendered
    const brandDom = [...document.querySelectorAll('#brandColors span')].map(s => s.style.backgroundColor || s.title).map(T.normHex).filter(Boolean);
    if (brandDom.length) brand = brandDom;

    const quick = (P && P.QUICK) || [];
    const pals = P ? P.filterPalettes(P.PALETTES, { cat: state.cat || null, q: state.q || '' }) : [];
    const block = T.colorTargetBlocked(state.target, state.target === 'bg' ? null : state.obj);

    panel.innerHTML = `
      <div class="cp-head"><button type="button" class="cp-back" data-act="close" title="Đóng" aria-label="Đóng bảng màu">←</button>
        <b>${esc(titleFor(state.target, state.obj))}</b>
        <button type="button" class="cp-x" data-act="close" aria-label="Đóng">✕</button></div>
      ${block ? `<p class="cp-note" role="status">⚠ ${esc(block)}</p>` : ''}
      <div class="cp-hex"><span class="small">HEX</span> <input id="cpHex" type="text" spellcheck="false" maxlength="7" placeholder="#rrggbb" value="${esc(state.currentHex || '')}" ${block ? 'disabled' : ''}><button type="button" data-act="hexok" ${block ? 'disabled' : ''}>OK</button>
        <input id="cpNative" type="color" data-nopv value="${state.currentHex || '#4f46e5'}" title="Chọn màu" ${block ? 'disabled' : ''}>
        <button type="button" data-act="eye" title="Hút màu từ thiết kế" ${block ? 'disabled' : ''}>💧</button></div>
      <h5>Màu trên trang</h5>${docs.length ? swatchesHtml(docs) : '<p class="small muted">Chưa có màu đặc trên trang.</p>'}
      <h5>Gần đây</h5>${recent.length ? swatchesHtml(recent) : '<p class="small muted">Chưa có.</p>'}
      <h5>Brand Kit</h5>${brand.length ? swatchesHtml(brand) : '<p class="small muted">Chưa có màu thương hiệu (tab Brand).</p>'}
      <h5>Màu nhanh</h5>${swatchesHtml(quick)}
      ${gradHtml()}
      <h5>Bộ màu ${P ? `(${P.PALETTES.length})` : ''}</h5>
      <input id="cpPalQ" type="search" placeholder="Tìm bảng màu…" value="${esc(state.q || '')}" ${P ? '' : 'disabled'}>
      <div class="cp-chips" role="toolbar">${P ? ['', ...P.CATS].map(c =>
        `<button type="button" data-cat="${c}" class="${(state.cat || '') === c ? 'on' : ''}" aria-pressed="${(state.cat || '') === c}">${c || 'Tất cả'}</button>`
      ).join('') : ''}</div>
      <div class="cp-pals">${pals.map(p => `
        <div class="cp-pal" title="${esc(p.name)}">
          <div class="cp-pal-sw">${p.colors.map(c => `<button type="button" class="cp-sw" style="background:${c}" data-c="${c}" title="${esc(p.name)}: ${c}"></button>`).join('')}</div>
          <span class="small">${esc(p.name)}</span>
        </div>`).join('')}</div>`;
  }

  function open(target, obj, opts) {
    opts = opts || {};
    state.open = true; state.target = target || 'fill'; state.obj = obj || canvas.getActiveObject() || null;
    state._gEdit = null; state._g = currentGradStops(state.obj);
    state.q = state.q || ''; state.cat = state.cat || null;
    state.currentHex = T.normHex(opts.hex) || currentHexOf(state.target, state.obj);
    state.swatchEl = opts.swatchEl || null;
    panel.hidden = false;
    ensureVisible();
    render();
    try { panel.scrollTop = 0; } catch (e) { }
    document.querySelectorAll('.ctxbar .swbtn.active-sw, .ctx-pop .swbtn.active-sw').forEach(el => el.classList.remove('active-sw'));
    if (state.swatchEl) state.swatchEl.classList.add('active-sw');
    const hex = $('#cpHex');
    if (hex) setTimeout(() => { try { hex.focus(); hex.select(); } catch (e) { } }, 40);
  }
  function close() {
    state.open = false; panel.hidden = true; tools.classList.remove('color-open');
    document.querySelectorAll('.ctxbar .swbtn.active-sw, .ctx-pop .swbtn.active-sw').forEach(el => el.classList.remove('active-sw'));
    state.swatchEl = null;
  }

  function pick(hex, live) {
    const block = T.colorTargetBlocked(state.target, state.target === 'bg' ? null : state.obj);
    if (block) { X.toast(block, 2200); return; }
    const ctx = {
      canvas, obj: state.obj,
      setBg: v => { if (root.XTK_HOOKS && root.XTK_HOOKS.setBg) root.XTK_HOOKS.setBg(v); else { canvas.backgroundColor = v; canvas.requestRenderAll(); } }
    };
    // Live preview: for object colors use preview session; bg goes through setBg (snapshots — suppress via restoring for live)
    if (live && state.target !== 'bg' && X.previewBegin) X.previewBegin();
    const U = root.XTK_UTIL;
    const run = () => T.applyColorTarget(state.target, hex, ctx);
    let r;
    if (live && state.target === 'bg' && U && U.withRestoring) r = U.withRestoring(X, run);
    else r = run();
    if (!r.ok) { X.toast(r.error, 2000); return; }
    T.pushRecent(r.color);
    canvas.requestRenderAll();
    if (!live) {
      if (X.colorPreview && X.colorPreview.on && X.previewCommit) X.previewCommit(true);
      else if (X.snapshot) X.snapshot();
      if (X.refreshLayers) X.refreshLayers();
      if (X.renderProps) X.renderProps();
      root.XTK_CTX_UI && root.XTK_CTX_UI.refresh && root.XTK_CTX_UI.refresh();
    } else {
      canvas.requestRenderAll();
    }
    if ($('#cpHex')) $('#cpHex').value = r.color;
    if ($('#cpNative')) $('#cpNative').value = r.color;
  }

  panel.addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'close') return close();
      if (a === 'hexok') { const v = $('#cpHex').value; if (!T.validateHex(v)) { X.toast('Mã HEX không hợp lệ (ví dụ #4f46e5)', 2000); return; }
        if (state._gEdit != null && (state.target === 'fill' || state.target === 'text')) {
          const g = (state._g || currentGradStops(state.obj)).slice(); g[state._gEdit] = T.normHex(v); state._g = g; applyGradient(g[0], g[1]); T.pushRecent(v); return;
        }
        pick(v, false); return; }
      if (a === 'eye') { close(); const eye = $('#eyedrop'); if (eye) eye.click(); return; }
    }
    const cat = e.target.closest('[data-cat]');
    if (cat) { state.cat = cat.dataset.cat || null; render(); return; }
    const gstop = e.target.closest('[data-gstop]');
    if (gstop) { state._gEdit = +gstop.dataset.gstop; panel.querySelectorAll('[data-gstop]').forEach(b => b.classList.toggle('on', b === gstop)); return; }
    if (e.target.id === 'cpGradOn') {
      const on = e.target.checked, o = state.obj;
      if (!on && o && o.fill && typeof o.fill === 'object') { o.set('fill', (state._g && state._g[0]) || '#4f46e5'); o.dirty = true; canvas.requestRenderAll(); X.snapshot && X.snapshot(); render(); return; }
      if (on) { const g = state._g || currentGradStops(o); applyGradient(g[0], g[1]); render(); return; }
    }
    const sw = e.target.closest('[data-c]');
    if (sw) {
      if (state._gEdit != null && (state.target === 'fill' || state.target === 'text')) {
        const g = (state._g || currentGradStops(state.obj)).slice();
        g[state._gEdit] = T.normHex(sw.dataset.c) || g[state._gEdit];
        state._g = g; applyGradient(g[0], g[1]);
        const box = panel.querySelector(`[data-gstop="${state._gEdit}"]`); if (box) box.style.background = g[state._gEdit];
        T.pushRecent(g[state._gEdit]); return;
      }
      pick(sw.dataset.c, false);
    }
  });
  panel.addEventListener('input', e => {
    if (e.target.id === 'cpPalQ') { state.q = e.target.value; render(); /* keep focus */ const q = $('#cpPalQ'); if (q) { q.focus(); q.selectionStart = q.selectionEnd = q.value.length; } return; }
    if (e.target.id === 'cpNative') pick(e.target.value, true);
    if (e.target.id === 'cpHex') e.target.classList.toggle('bad', e.target.value && !T.validateHex(e.target.value));
  });
  panel.addEventListener('change', e => {
    if (e.target.id === 'cpNative') pick(e.target.value, false);
  });
  document.addEventListener('keydown', e => {
    if (!state.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  // Public API: open from any swatch
  const api = {
    open, close, isOpen: () => state.open, refresh: render,
    // Convenience: bind a button/swatch element
    bindSwatch(el, target, getObj) {
      if (!el) return;
      const go = () => {
        const o = typeof getObj === 'function' ? getObj() : (getObj || canvas.getActiveObject());
        const hex = el.dataset.c || (el.type === 'color' ? el.value : null);
        open(target, o, { hex, swatchEl: el, ensureVisible: true });
      };
      el.addEventListener('click', e => { if (el.type === 'color') e.preventDefault(); go(); });
      if (el.type === 'color') el.addEventListener('mousedown', e => { e.preventDefault(); go(); });
    },
    currentHexOf, titleFor, ensureVisible
  };
  root.XTK_COLOR_PANEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
