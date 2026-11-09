// Canva-style contextual toolbar above the canvas + anchored popovers (Hiệu ứng / Giãn).
// Keeps #floatBar / #dup / #fbComp / #fbShape so composite-ui & shape-ui keep working.
(function (root) {
  const X = root.XTK, T = root.XTK_CTX, CP = root.XTK_COLOR_PANEL;
  if (!X || !X.canvas || !T) return;
  const $ = s => document.querySelector(s), canvas = X.canvas, view = $('#view-designer');
  const bar = $('#floatBar'); if (!bar) return;
  const stageWrap = document.querySelector('.stage-wrap');
  const stage = $('#stage');
  const FX = root.XTK_FX;

  // Move bar out of stage overlay → dedicated row above stage
  let slot = $('#ctxBarSlot');
  if (!slot && stageWrap && stage) {
    slot = document.createElement('div');
    slot.id = 'ctxBarSlot'; slot.className = 'ctx-slot';
    stageWrap.insertBefore(slot, stage);
  }
  if (slot && bar.parentNode !== slot) slot.appendChild(bar);

  bar.classList.add('ctxbar');
  bar.removeAttribute('hidden');
  bar.setAttribute('aria-label', 'Thanh ngữ cảnh');

  if (!$('#fbShapeTools')) {
    const extra = document.createElement('div');
    extra.innerHTML = `
      <span id="fbNone" class="fbgrp" hidden>
        <button type="button" id="fbBgColor" class="swbtn" title="Màu nền trang" aria-label="Màu nền trang"><i style="background:#fff"></i> Nền</button>
        <span id="fbPageInfo" class="small muted"></span>
      </span>
      <span id="fbShapeTools" class="fbgrp" hidden>
        <button type="button" id="fbFill" class="swbtn" title="Màu tô" aria-label="Màu tô"><i></i></button>
        <button type="button" id="fbStroke" class="swbtn" title="Màu viền" aria-label="Màu viền"><i class="ring"></i></button>
        <label class="fb-num" title="Độ dày viền">Nét <input id="fbStrokeW" type="number" min="0" max="80" step="1" value="0"></label>
        <select id="fbStrokeStyle" title="Kiểu nét"><option value="solid">Liền</option><option value="dash">Đứt</option><option value="dot">Chấm</option></select>
        <label class="fb-num" id="fbRadWrap" hidden title="Bo góc">Bo <input id="fbRad" type="number" min="0" max="500" step="1" value="0"></label>
        <button type="button" id="fbShapeFx" title="Hiệu ứng hình" aria-haspopup="dialog">✨ Hiệu ứng</button>
      </span>
      <span id="fbTextExtra" class="fbgrp" hidden>
        <button type="button" id="fbBold" title="Đậm" aria-label="Đậm" aria-pressed="false"><b>B</b></button>
        <button type="button" id="fbItalic" title="Nghiêng" aria-label="Nghiêng" aria-pressed="false"><i>I</i></button>
        <button type="button" id="fbUnder" title="Gạch chân" aria-label="Gạch chân" aria-pressed="false"><u>U</u></button>
        <select id="fbAlign" title="Căn lề"><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select>
        <button type="button" id="fbTextFx" title="Hiệu ứng chữ" aria-haspopup="dialog">✨ Hiệu ứng</button>
        <button type="button" id="fbSpacing" title="Giãn chữ / dòng" aria-haspopup="dialog">↕ Giãn</button>
      </span>
      <span id="fbSizeSteppers" class="fbgrp" hidden>
        <button type="button" id="fbSizeMinus" title="Giảm cỡ chữ">−</button>
        <button type="button" id="fbSizePlus" title="Tăng cỡ chữ">+</button>
      </span>
      <span id="fbImgExtra" class="fbgrp" hidden>
        <label class="fb-num" title="Bo góc ảnh (%)">Bo <input id="fbImgRad" type="number" min="0" max="50" step="1" value="0"></label>
      </span>
      <span id="fbMulti" class="fbgrp" hidden>
        <button type="button" id="fbMultiFill" class="swbtn" title="Tô màu chung" aria-label="Tô màu chung"><i></i> Tô</button>
        <label class="fb-num" title="Độ mờ">Mờ <input id="fbMultiOp" type="number" min="0" max="100" step="5" value="100"></label>
      </span>
      <span id="fbCommon" class="fbgrp">
        <label class="fb-num" title="Độ mờ (opacity)">Mờ <input id="fbOp" type="number" min="0" max="100" step="5" value="100"></label>
        <details class="fb-menu"><summary title="Sắp xếp lớp">⊞ Xếp</summary>
          <div class="fb-pop">
            <button type="button" data-arr="front">⤒ Trên cùng</button>
            <button type="button" data-arr="forward">↑ Lên 1</button>
            <button type="button" data-arr="backward">↓ Xuống 1</button>
            <button type="button" data-arr="back">⤓ Dưới cùng</button>
          </div>
        </details>
      </span>`;
    while (extra.firstChild) bar.insertBefore(extra.firstChild, bar.firstChild);
  }

  // Place − / + beside #fbSize inside #fbText (font · − size + · color)
  (function nestSizeSteppers() {
    const t = $('#fbText'), size = $('#fbSize'), steppers = $('#fbSizeSteppers');
    if (!t || !size || !steppers) return;
    const wrap = document.createElement('span'); wrap.className = 'fb-sizewrap'; wrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px';
    const minus = $('#fbSizeMinus'), plus = $('#fbSizePlus');
    size.parentNode.insertBefore(wrap, size);
    wrap.appendChild(minus); wrap.appendChild(size); wrap.appendChild(plus);
    steppers.remove();
  })();

  // Canonical left→right order + dividers (runs after composite/shape prepend too)
  function orderBar() {
    const ids = [
      'fbNone',
      'fbText', 'fbTextExtra',           // text: font/size/color → B/I/U/align/fx/spacing
      'fbShapeTools',                   // shape: fill/stroke/width/style/radius/fx
      'fbImg', 'fbImgExtra', 'fbComp', // image tools + Lồng ảnh
      'fbShape',                        // boolean/nodes (contextual)
      'fbMulti',
      '__sep1',
      'fbCommon',                       // opacity + arrange
      '__sep2',
      // utilities kept as loose buttons after seps
    ];
    const utilIds = ['dup', 'del', 'front', 'forward', 'backward', 'back', 'group', 'ungroup', 'lock', 'align'];
    const frag = document.createDocumentFragment();
    const take = id => {
      if (id === '__sep1' || id === '__sep2') {
        let sep = bar.querySelector(`[data-sep="${id}"]`);
        if (!sep) { sep = document.createElement('span'); sep.className = 'fb-sep'; sep.dataset.sep = id; sep.setAttribute('aria-hidden', 'true'); }
        frag.appendChild(sep); return;
      }
      const el = document.getElementById(id); if (el) frag.appendChild(el);
    };
    ids.forEach(take);
    utilIds.forEach(id => { const el = document.getElementById(id); if (el) frag.appendChild(el); });
    // append any leftover children (e.g. unknown groups) at end
    [...bar.children].forEach(ch => frag.appendChild(ch));
    bar.appendChild(frag);
  }
  orderBar();
  // Re-order once more after sibling UIs (composite/shape) finish prepending
  setTimeout(orderBar, 0);


  // Shared popover host (anchored under the triggering button)
  let pop = $('#ctxPop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'ctxPop'; pop.className = 'ctx-pop'; pop.hidden = true;
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'false');
    (slot || bar.parentNode || document.body).appendChild(pop);
  }
  let popKind = null, popAnchor = null;

  const fbColor = $('#fbColor');
  if (fbColor) fbColor.title = 'Màu chữ';
  const fbSize = $('#fbSize');
  if (fbSize) { fbSize.min = T.FONT_MIN; fbSize.max = T.FONT_MAX; fbSize.title = `Cỡ chữ (${T.FONT_MIN}–${T.FONT_MAX}px)`; }

  const isText = o => o && /text/i.test(o.type) && !(o.xtk && o.xtk.curved);
  const isImg = o => o && o.type === 'image';
  const isShape = o => o && !isText(o) && !isImg(o) && o.type !== 'activeSelection' && o.type !== 'group' && o.name !== '__bg';
  const solidHex = v => (T.normHex(typeof v === 'string' ? v.slice(0, 7) : '') || '#111827');
  const U = () => (X.U ? X.U() : 1000);

  function setSwatch(btn, color) {
    if (!btn) return;
    const i = btn.querySelector('i'); if (i) i.style.background = color || '#ccc';
    btn.dataset.c = color || '';
  }

  function closePop() {
    pop.hidden = true; pop.innerHTML = ''; popKind = null; popAnchor = null;
    pop.style.left = pop.style.top = '';
  }
  function placePop(anchor) {
    if (!anchor) return;
    const br = (slot || bar).getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    let x = ar.left - br.left, y = ar.bottom - br.top + 4;
    pop.style.left = Math.max(4, Math.min(x, br.width - 280)) + 'px';
    pop.style.top = y + 'px';
  }
  function openPop(kind, anchor) {
    refresh(); // ensure groups visible for anchors
    const o = canvas.getActiveObject();
    if (kind === 'effects' || kind === 'effects-text' || kind === 'effects-shape') {
      if (!isText(o) && !isShape(o)) return false;
      popKind = isText(o) ? 'effects-text' : 'effects-shape';
    } else if (kind === 'spacing') {
      if (!isText(o)) return false; popKind = 'spacing';
    } else return false;
    popAnchor = anchor || (popKind === 'spacing' ? $('#fbSpacing') : (isText(o) ? $('#fbTextFx') : $('#fbShapeFx')));
    if (!popAnchor) return false;
    renderPop();
    pop.hidden = false;
    placePop(popAnchor);
    const focusable = pop.querySelector('input,button,select'); if (focusable) try { focusable.focus({ preventScroll: true }); } catch (e) { }
    return true;
  }
  // Demo/helper: retry until selection + toolbar ready
  function openPopWhenReady(kind, tries) {
    tries = tries == null ? 12 : tries;
    const ok = openPop(kind);
    if (ok) return true;
    if (tries <= 0) return false;
    setTimeout(() => openPopWhenReady(kind, tries - 1), 100);
    return false;
  }

  function swBtn(target, color, label) {
    return `<button type="button" class="swbtn cp-open" data-ctarget="${target}" title="${label}" aria-label="${label}"><i style="background:${color}"></i></button>`;
  }

  function renderPop() {
    const o = canvas.getActiveObject(); if (!o) { closePop(); return; }
    const u = U();
    if (popKind === 'spacing') {
      pop.setAttribute('aria-label', 'Giãn chữ và dòng');
      pop.innerHTML = `<header><b>↕ Giãn</b><button type="button" data-popx title="Đóng">✕</button></header>
        <label class="small">Giãn chữ <input type="range" data-k="charSpacing" min="-100" max="1200" step="10" value="${o.charSpacing || 0}">
          <input type="number" data-k="charSpacing" min="-100" max="1200" step="10" value="${o.charSpacing || 0}"></label>
        <label class="small">Giãn dòng <input type="range" data-k="lineHeight" min="0.7" max="2.5" step="0.05" value="${o.lineHeight || 1.16}">
          <input type="number" data-k="lineHeight" min="0.7" max="2.5" step="0.05" value="${o.lineHeight || 1.16}"></label>
        <button type="button" data-reset-space class="small">↺ Đặt lại</button>`;
      return;
    }
    if (popKind === 'effects-shape') {
      const sh = o.shadow || {};
      pop.setAttribute('aria-label', 'Hiệu ứng hình');
      pop.innerHTML = `<header><b>✨ Hiệu ứng hình</b><button type="button" data-popx title="Đóng">✕</button></header>
        <label><input type="checkbox" data-c="shadow" ${o.shadow ? 'checked' : ''}> Bóng đổ ${swBtn('shadow', solidHex(sh.color || '#000000'), 'Màu bóng')}</label>
        <label class="small">Độ nhòe <input type="range" data-v="shBlur" min="0" max="100" value="${o.shadow ? Math.round((sh.blur || 0) / u * 1000) : 20}">
          <input type="number" data-v="shBlur" min="0" max="100" value="${o.shadow ? Math.round((sh.blur || 0) / u * 1000) : 20}"></label>
        <label class="small">Lệch <input type="range" data-v="shOff" min="-50" max="50" value="${o.shadow ? Math.round((sh.offsetY || 0) / u * 1000) : 8}">
          <input type="number" data-v="shOff" min="-50" max="50" value="${o.shadow ? Math.round((sh.offsetY || 0) / u * 1000) : 8}"></label>`;
      return;
    }
    // effects-text
    const sh = o.shadow || {};
    const tw = o.stroke && o.fontSize ? Math.round(o.strokeWidth / o.fontSize * 200) : 6;
    pop.setAttribute('aria-label', 'Hiệu ứng chữ');
    pop.innerHTML = `<header><b>✨ Hiệu ứng chữ</b><button type="button" data-popx title="Đóng">✕</button></header>
      <label><input type="checkbox" data-c="stroke" ${o.stroke ? 'checked' : ''}> Viền chữ ${swBtn('stroke', solidHex(o.stroke || '#000000'), 'Màu viền chữ')}
        <input type="range" data-v="strokeW" min="0" max="40" value="${tw}"><input type="number" data-v="strokeW" min="0" max="40" value="${tw}"></label>
      <label><input type="checkbox" data-c="shadow" ${o.shadow ? 'checked' : ''}> Bóng đổ ${swBtn('shadow', solidHex(sh.color || '#000000'), 'Màu bóng')}</label>
      <label class="small">Độ nhòe <input type="range" data-v="shBlur" min="0" max="100" value="${o.shadow ? Math.round((sh.blur || 0) / u * 1000) : 20}">
        <input type="number" data-v="shBlur" min="0" max="100" value="${o.shadow ? Math.round((sh.blur || 0) / u * 1000) : 20}"></label>
      <label class="small">Lệch <input type="range" data-v="shOff" min="-50" max="50" value="${o.shadow ? Math.round((sh.offsetY || 0) / u * 1000) : 8}">
        <input type="number" data-v="shOff" min="-50" max="50" value="${o.shadow ? Math.round((sh.offsetY || 0) / u * 1000) : 8}"></label>
      <label><input type="checkbox" data-c="bg" ${o.backgroundColor ? 'checked' : ''}> Nền chữ ${swBtn('textBg', solidHex(o.backgroundColor || '#fde047'), 'Màu nền chữ')}</label>
      <button type="button" data-curve class="primary">↷ Chữ cong</button>`;
  }

  function applyEffectsLive() {
    const o = canvas.getActiveObject(); if (!o) return;
    const u = U();
    const c = k => !!(pop.querySelector(`[data-c="${k}"]`) || {}).checked;
    const v = k => { const el = pop.querySelector(`input[type="range"][data-v="${k}"]`) || pop.querySelector(`[data-v="${k}"]`); return el ? +el.value : 0; };
    if (popKind === 'effects-text' && isText(o)) {
      const onSt = c('stroke');
      o.set({ stroke: onSt ? (o.stroke || '#000000') : null, strokeWidth: onSt ? o.fontSize * v('strokeW') / 200 : 0, paintFirst: 'stroke' });
      o.set('shadow', c('shadow') ? new fabric.Shadow({ color: (o.shadow && o.shadow.color) || '#000000', blur: v('shBlur') / 1000 * u, offsetX: v('shOff') / 1000 * u, offsetY: v('shOff') / 1000 * u }) : null);
      if (!c('bg')) o.set('backgroundColor', '');
      else if (!o.backgroundColor) o.set('backgroundColor', '#fde047');
    } else if (popKind === 'effects-shape' && isShape(o)) {
      o.set('shadow', c('shadow') ? new fabric.Shadow({ color: (o.shadow && o.shadow.color) || '#000000', blur: v('shBlur') / 1000 * u, offsetX: v('shOff') / 1000 * u, offsetY: v('shOff') / 1000 * u }) : null);
    }
    o.dirty = true; canvas.requestRenderAll();
  }

  pop.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) {
      const o = canvas.getActiveObject(); if (!isText(o)) return;
      const key = t.dataset.k, val = T.clampNum(key, t.value);
      o.set(key, val); if (o.initDimensions) o.initDimensions();
      pop.querySelectorAll(`[data-k="${key}"]`).forEach(el => { if (el !== t) el.value = val; });
      o.dirty = true; canvas.requestRenderAll(); return;
    }
    if (t.dataset.v || t.dataset.c != null || t.type === 'checkbox') {
      // sync paired range/number
      if (t.dataset.v) pop.querySelectorAll(`[data-v="${t.dataset.v}"]`).forEach(el => { if (el !== t) el.value = t.value; });
      applyEffectsLive();
    }
  });
  pop.addEventListener('change', e => {
    if (e.target.dataset.k || e.target.dataset.v || e.target.type === 'checkbox') {
      X.snapshot && X.snapshot(); X.renderProps && X.renderProps();
    }
  });
  pop.addEventListener('click', e => {
    if (e.target.closest('[data-popx]')) return closePop();
    if (e.target.closest('[data-reset-space]')) {
      const o = canvas.getActiveObject(); if (!isText(o)) return;
      o.set({ charSpacing: 0, lineHeight: 1.16 }); if (o.initDimensions) o.initDimensions();
      snap(); renderPop(); return;
    }
    if (e.target.closest('[data-curve]')) {
      const o = canvas.getActiveObject(); if (!isText(o) || !FX) return;
      const g = FX.curvedText({ text: String(o.text || '').replace(/\n/g, ' '), radius: Math.max(o.width / 2, o.fontSize * 3), fontFamily: o.fontFamily, fontSize: o.fontSize, fill: typeof o.fill === 'string' ? o.fill : '#111827', fontWeight: o.fontWeight });
      const c0 = o.getCenterPoint(); g.set({ angle: o.angle, opacity: o.opacity });
      canvas.remove(o); canvas.add(g); g.setPositionByOrigin(c0, 'center', 'center'); g.setCoords();
      canvas.setActiveObject(g); closePop(); snap(); return;
    }
    const sw = e.target.closest('.cp-open');
    if (sw && CP) {
      const target = sw.dataset.ctarget;
      // Ensure effect flags on before picking color
      if (target === 'shadow') { const cb = pop.querySelector('[data-c="shadow"]'); if (cb && !cb.checked) { cb.checked = true; applyEffectsLive(); } }
      if (target === 'stroke') { const cb = pop.querySelector('[data-c="stroke"]'); if (cb && !cb.checked) { cb.checked = true; applyEffectsLive(); } }
      if (target === 'textBg') { const cb = pop.querySelector('[data-c="bg"]'); if (cb && !cb.checked) { cb.checked = true; applyEffectsLive(); } }
      CP.open(target, canvas.getActiveObject());
    }
  });

  document.addEventListener('mousedown', e => {
    if (pop.hidden) return;
    if (pop.contains(e.target) || (popAnchor && popAnchor.contains(e.target))) return;
    if (e.target.closest && e.target.closest('#colorPanel')) return; // keep pop while picking color
    closePop();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { closePop(); e.stopPropagation(); } }, true);

  function refresh() {
    if (!view || !view.classList.contains('active')) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    if (bar.classList.contains('compediting')) return;

    const o = canvas.getActiveObject();
    const none = !o;
    const multi = o && o.type === 'activeSelection';
    const group = o && o.type === 'group' && !(o.xtk && o.xtk.curved);
    const text = isText(o);
    const img = isImg(o);
    const shape = isShape(o);

    $('#fbNone').hidden = !none;
    $('#fbText').hidden = !text;
    $('#fbTextExtra').hidden = !text;
    $('#fbShapeTools').hidden = !shape;
    $('#fbImg').hidden = !img;
    if ($('#fbImgExtra')) $('#fbImgExtra').hidden = !img;
    $('#fbMulti').hidden = !multi;
    $('#fbCommon').hidden = none;

    if ($('#group')) $('#group').hidden = !multi;
    if ($('#ungroup')) $('#ungroup').hidden = !group;
    if ($('#align')) $('#align').hidden = !(multi || group);
    if ($('#lock')) {
      $('#lock').hidden = none;
      $('#lock').classList.toggle('on', !!(o && (o.lockMovementX || (o.xtk && o.xtk.locked))));
    }
    ['#dup', '#del', '#front', '#forward', '#backward', '#back'].forEach(s => { const el = $(s); if (el) el.hidden = none; });

    if (none) {
      const bg = typeof canvas.backgroundColor === 'string' ? solidHex(canvas.backgroundColor) : '#ffffff';
      setSwatch($('#fbBgColor'), bg);
      const st = X.state && X.state.tpl; $('#fbPageInfo').textContent = st ? `${st.w} × ${st.h} px` : '';
      if (!pop.hidden) closePop();
      return;
    }

    if (text) {
      const font = $('#fbFont'); if (font && document.activeElement !== font) font.value = o.fontFamily;
      const disp = Math.round(T.getDisplayFontSize(o));
      if (fbSize && document.activeElement !== fbSize) fbSize.value = disp;
      if (fbColor) fbColor.value = solidHex(o.fill);
      $('#fbBold').setAttribute('aria-pressed', o.fontWeight == 700 || o.fontWeight === 'bold' ? 'true' : 'false');
      $('#fbItalic').setAttribute('aria-pressed', o.fontStyle === 'italic' ? 'true' : 'false');
      $('#fbUnder').setAttribute('aria-pressed', o.underline ? 'true' : 'false');
      const al = $('#fbAlign'); if (al && document.activeElement !== al) al.value = o.textAlign || 'left';
      $('#fbOp').value = Math.round((o.opacity == null ? 1 : o.opacity) * 100);
    }
    if (shape) {
      setSwatch($('#fbFill'), solidHex(o.fill));
      setSwatch($('#fbStroke'), solidHex(o.stroke || '#111827'));
      const sw = $('#fbStrokeW'); if (sw && document.activeElement !== sw) sw.value = Math.round(o.strokeWidth || 0);
      const st = $('#fbStrokeStyle'); if (st && document.activeElement !== st) st.value = T.strokeStyleOf(o);
      const rw = $('#fbRadWrap'), rad = $('#fbRad');
      if (o.type === 'rect') { rw.hidden = false; if (rad && document.activeElement !== rad) rad.value = Math.round(o.rx || 0); }
      else rw.hidden = true;
      $('#fbOp').value = Math.round((o.opacity == null ? 1 : o.opacity) * 100);
    }
    if (img) {
      $('#fbOp').value = Math.round((o.opacity == null ? 1 : o.opacity) * 100);
      const ir = $('#fbImgRad'); if (ir && document.activeElement !== ir) ir.value = T.getImageRadiusPct(o);
    }
    if (multi) {
      $('#fbMultiOp').value = Math.round((o.opacity == null ? 1 : o.opacity) * 100);
      setSwatch($('#fbMultiFill'), '#4f46e5');
    }
    if (group) $('#fbOp').value = Math.round((o.opacity == null ? 1 : o.opacity) * 100);

    // Refresh open popover contents (keep open)
    if (!pop.hidden && popKind) { renderPop(); placePop(popAnchor); }
  }

  const snap = () => { canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.renderProps && X.renderProps(); refresh(); };
  const actText = fn => { const o = canvas.getActiveObject(); if (!isText(o)) return; fn(o); o.setCoords(); snap(); };

  if ($('#fbFont')) $('#fbFont').onchange = () => actText(o => o.set('fontFamily', $('#fbFont').value));
  if (fbSize) fbSize.onchange = () => actText(o => T.setDisplayFontSize(o, fbSize.value));
  if ($('#fbSizeMinus')) $('#fbSizeMinus').onclick = () => actText(o => T.setDisplayFontSize(o, T.getDisplayFontSize(o) - 2));
  if ($('#fbSizePlus')) $('#fbSizePlus').onclick = () => actText(o => T.setDisplayFontSize(o, T.getDisplayFontSize(o) + 2));
  if ($('#fbBold')) $('#fbBold').onclick = () => actText(o => o.set('fontWeight', (o.fontWeight == 700 || o.fontWeight === 'bold') ? 400 : 700));
  if ($('#fbItalic')) $('#fbItalic').onclick = () => actText(o => o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic'));
  if ($('#fbUnder')) $('#fbUnder').onclick = () => actText(o => o.set('underline', !o.underline));
  if ($('#fbAlign')) $('#fbAlign').onchange = () => actText(o => o.set('textAlign', $('#fbAlign').value));

  if ($('#fbTextFx')) $('#fbTextFx').onclick = e => { e.stopPropagation(); if (!pop.hidden && popKind === 'effects-text') closePop(); else openPop('effects', $('#fbTextFx')); };
  if ($('#fbShapeFx')) $('#fbShapeFx').onclick = e => { e.stopPropagation(); if (!pop.hidden && popKind === 'effects-shape') closePop(); else openPop('effects', $('#fbShapeFx')); };
  if ($('#fbSpacing')) $('#fbSpacing').onclick = e => { e.stopPropagation(); if (!pop.hidden && popKind === 'spacing') closePop(); else openPop('spacing', $('#fbSpacing')); };

  if (CP) {
    CP.bindSwatch($('#fbBgColor'), 'bg', () => null);
    CP.bindSwatch($('#fbFill'), 'fill');
    CP.bindSwatch($('#fbStroke'), 'stroke');
    CP.bindSwatch($('#fbMultiFill'), 'fill');
    if (fbColor) {
      fbColor.addEventListener('mousedown', e => { e.preventDefault(); CP.open('text', canvas.getActiveObject()); });
      fbColor.addEventListener('click', e => { e.preventDefault(); CP.open('text', canvas.getActiveObject()); });
    }
    const cp = $('#colorPick');
    if (cp) cp.addEventListener('mousedown', e => {
      e.preventDefault();
      const o = canvas.getActiveObject();
      CP.open(o ? (/text/i.test(o.type) ? 'text' : 'fill') : 'bg', o);
    });
  }

  if ($('#fbStrokeW')) $('#fbStrokeW').onchange = () => {
    const o = canvas.getActiveObject(); if (!isShape(o)) return;
    o.set('strokeWidth', Math.max(0, +$('#fbStrokeW').value || 0));
    if (+$('#fbStrokeW').value > 0 && !o.stroke) o.set('stroke', '#111827');
    T.syncDashToWidth(o); snap();
  };
  if ($('#fbStrokeStyle')) $('#fbStrokeStyle').onchange = () => {
    const o = canvas.getActiveObject(); if (!isShape(o)) return;
    if (!o.strokeWidth) o.set('strokeWidth', 4);
    if (!o.stroke) o.set('stroke', '#111827');
    T.applyStrokeStyle(o, $('#fbStrokeStyle').value); snap();
  };
  if ($('#fbRad')) $('#fbRad').onchange = () => {
    const o = canvas.getActiveObject(); if (!o || o.type !== 'rect') return;
    const v = Math.max(0, +$('#fbRad').value || 0); o.set({ rx: v, ry: v }); snap();
  };
  if ($('#fbImgRad')) $('#fbImgRad').onchange = async () => {
    const o = canvas.getActiveObject(); if (!isImg(o) || !FX) return;
    const pct = T.clampNum('imgRad', $('#fbImgRad').value);
    const m = Math.min(o.getScaledWidth(), o.getScaledHeight());
    if (pct > 0) await FX.setClip(o, 'round', pct / 100 * m);
    else await FX.setClip(o, 'none');
    snap();
  };
  if ($('#fbOp')) $('#fbOp').onchange = () => {
    const o = canvas.getActiveObject(); if (!o) return;
    o.set('opacity', T.clampOpacity(+$('#fbOp').value / 100)); snap();
  };
  if ($('#fbMultiOp')) $('#fbMultiOp').onchange = () => {
    const o = canvas.getActiveObject(); if (!o || o.type !== 'activeSelection') return;
    const v = T.clampOpacity(+$('#fbMultiOp').value / 100);
    T.applyMulti(o.getObjects(), 'opacity', v); o.set('opacity', v); snap();
  };

  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-arr]'); if (!b) return;
    const id = { front: 'front', forward: 'forward', backward: 'backward', back: 'back' }[b.dataset.arr];
    if (id && $('#' + id)) $('#' + id).click();
    const det = b.closest('details'); if (det) det.open = false;
  });

  let raf = 0;
  const sched = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; refresh(); }); };
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified', 'object:scaling', 'object:rotating'].forEach(ev => canvas.on(ev, sched));
  window.addEventListener('resize', () => { sched(); if (!pop.hidden) placePop(popAnchor); });

  const killPos = () => { bar.style.transform = 'none'; bar.style.left = ''; bar.style.top = ''; };
  canvas.on('after:render', killPos);

  // After color panel applies, refresh popover swatches
  const _origClose = CP && CP.close;
  if (CP) {
    const wrap = CP.open;
    // no wrap needed — refresh on selection/modified is enough; also hook snapshot path
  }

  root.XTK_CTX_UI = {
    refresh, orderBar, openColor: (t, o) => CP && CP.open(t, o),
    openPop, openPopWhenReady, closePop, popKind: () => popKind
  };
  refresh();
})(typeof window !== 'undefined' ? window : globalThis);
