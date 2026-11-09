// Phase 11 stage 2 (not yet wired): NONDESTRUCTIVE image-in-shape / image-in-editable-text ("Lồng ảnh").
// Model: the frame (shape or text) keeps its geometry; its fill becomes a fabric.Pattern (no-repeat) whose patternTransform
// maps image pixels -> frame box space (origin = frame top-left, unscaled units). The original image object JSON and the
// previous fill are kept in frame.xtk.composite, so "Tách ảnh" restores an independent image exactly where it appeared.
// Pure math is exported for Node tests; init(X) wires the browser behaviour.
(function (root) {
  // ---------- 2D affine matrices [a,b,c,d,e,f] (Fabric convention) ----------
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const inv = m => { const d = m[0] * m[3] - m[1] * m[2]; if (!d) throw new Error('singular'); return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  const T = (x, y) => [1, 0, 0, 1, x, y], S = k => [k, 0, 0, k, 0, 0];
  const apply = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const linInv = (m, dx, dy) => { const i = inv(m); return { x: i[0] * dx + i[2] * dy, y: i[1] * dx + i[3] * dy }; };

  // Cover ("Lấp đầy") / contain ("Vừa khung") for source sw×sh into frame box W×H
  function fitMatrix(W, H, sw, sh, mode) {
    const s = mode === 'fit' ? Math.min(W / sw, H / sh) : Math.max(W / sw, H / sh);
    return [s, 0, 0, s, (W - sw * s) / 2, (H - sh * s) / 2];
  }
  // Keep the image visually where it is: source px -> frame box. Mf/Mi = calcTransformMatrix() in scene space.
  // (image draws its source at local -w/2,-h/2; crop is pre-applied to the pattern source so no crop term here)
  const placement = (Mf, W, H, Mi, w, h) => mul(mul(mul(T(W / 2, H / 2), inv(Mf)), Mi), T(-w / 2, -h / 2));
  // Inverse: scene matrix for a released image given current pattern matrix
  const releaseMatrix = (Mf, W, H, P, w, h) => mul(mul(mul(Mf, T(-W / 2, -H / 2)), P), T(w / 2, h / 2));
  // Decompose to Fabric props (same as fabric.util.qrDecompose)
  function decompose(a) {
    const angle = Math.atan2(a[1], a[0]), den = a[0] ** 2 + a[1] ** 2, scaleX = Math.sqrt(den), scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX, skewX = Math.atan2(a[0] * a[2] + a[1] * a[3], den);
    return { angle: angle * 180 / Math.PI, scaleX, scaleY, skewX: skewX * 180 / Math.PI, skewY: 0, translateX: a[4], translateY: a[5] };
  }
  // Pan by a scene-space delta (dx,dy) while editing: convert into frame box units via the frame's linear part
  const pan = (P, Mf, dx, dy) => { const d = linInv(Mf, dx, dy); return mul(T(d.x, d.y), P); };
  // Zoom by k around a frame-box point (qx,qy)
  const zoomAround = (P, k, qx, qy) => mul(mul(mul(T(qx, qy), S(k)), T(-qx, -qy)), P);
  // Does the transformed image still cover the whole frame box? (used to warn/clamp in Lấp đầy)
  function covers(P, W, H, sw, sh) {
    const i = inv(P); return [[0, 0], [W, 0], [0, H], [W, H]].every(([x, y]) => { const p = apply(i, x, y); return p.x >= -1e-6 && p.y >= -1e-6 && p.x <= sw + 1e-6 && p.y <= sh + 1e-6; });
  }
  const FRAME_TYPES = ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'textbox', 'i-text', 'text'];
  const isText = o => /text/.test(o.type || '');
  const isComposite = o => !!(o && o.xtk && o.xtk.composite);
  // Fill kind: Pattern (Lồng ảnh) vs Gradient vs solid string
  const isGradientFill = f => !!(f && typeof f === 'object' && Array.isArray(f.colorStops));
  const isPatternFill = f => !!(f && typeof f === 'object' && !isGradientFill(f) && (f.patternTransform || f.type === 'pattern' || f.source != null));
  const needsPatternRestore = o => isComposite(o) && !isPatternFill(o.fill);
  // Validate a selection; returns {image, frame[, replace]} or {error:'…'}
  function classify(objs) {
    if (!objs || objs.length !== 2) return { error: 'Chọn đúng 2 đối tượng: 1 ảnh và 1 hình khối hoặc chữ.' };
    const imgs = objs.filter(o => o.type === 'image'), rest = objs.filter(o => o.type !== 'image');
    if (imgs.length !== 1) return { error: imgs.length ? 'Bạn đang chọn 2 ảnh — hãy chọn 1 ảnh và 1 hình/chữ.' : 'Chưa có ảnh trong lựa chọn — thêm 1 ảnh.' };
    const image = imgs[0], frame = rest[0];
    if (image.xtk && image.xtk.cell) return { error: 'Ảnh này đang nằm trong ô khung ảnh — hãy dùng ảnh rời.' };
    if (!FRAME_TYPES.includes(frame.type)) return { error: frame.type === 'group' ? 'Không lồng vào nhóm — hãy bỏ nhóm rồi chọn 1 hình.' : 'Loại đối tượng này chưa hỗ trợ lồng ảnh (chỉ hình khối hoặc chữ).' };
    if ((frame.xtk && frame.xtk.locked) || (image.xtk && image.xtk.locked)) return { error: 'Có lớp đang khóa — mở khóa trước.' };
    if (!(frame.width > 0 && frame.height > 0)) return { error: 'Hình/chữ quá nhỏ để lồng ảnh.' };
    if (isComposite(frame)) return { image, frame, replace: true };
    return { image, frame };
  }
  const MAX_SIDE = 8192, MAX_PIXELS = 40e6; // browser canvas safety limits for the display source
  const capScale = (w, h) => Math.min(1, MAX_SIDE / Math.max(w, h, 1), Math.sqrt(MAX_PIXELS / Math.max(w * h, 1)));
  const round = m => m.map(v => Math.round(v * 1e6) / 1e6);

  // ---------- browser wiring ----------
  function init(X, opts) {
    opts = opts || {};
    const canvas = X.canvas, toast = X.toast || (() => { }), PROPS = () => (window.XTK_FX && window.XTK_FX.PROPS) || ['name', 'xtk'];
    const box = o => ({ W: o.width, H: o.height });
    const quiet = f => (window.XTK_UTIL ? XTK_UTIL.withRestoring(X, f) : f()); // batch → one snapshot; restores previous flag (nesting-safe)
    // crop is materialised into a canvas source (original element untouched, original JSON kept for Tách)
    // Returns {src, k}: k = display-source px per original px (<1 only when capped). Original element & JSON are untouched.
    function sourceOf(img) {
      const el = img._element || img.getElement(), w = img.width, h = img.height, cx = img.cropX || 0, cy = img.cropY || 0;
      const k = capScale(w, h);
      if (k === 1 && !cx && !cy && (el.naturalWidth || el.width) === w && (el.naturalHeight || el.height) === h) return { src: el, k: 1 };
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(el, cx, cy, w, h, 0, 0, c.width, c.height);
      if (k < 1) toast(`Ảnh rất lớn (${Math.round(w)}×${Math.round(h)}) — bản hiển thị trong khung được giảm còn ${c.width}×${c.height}; ảnh gốc vẫn giữ nguyên để Tách ảnh.`, 3500);
      return { src: c, k: c.width / w };
    }
    const pattern = (src, P) => new fabric.Pattern({ source: src, repeat: 'no-repeat', offsetX: 0, offsetY: 0, patternTransform: round(P) });
    async function fontsReady(o) {
      if (!isText(o) || !document.fonts) return;
      try { await document.fonts.load(`${o.fontStyle || 'normal'} ${o.fontWeight || 'normal'} ${Math.round(o.fontSize || 40)}px "${o.fontFamily}"`, o.text || 'Ệ'); } catch (e) { }
      o.initDimensions && o.initDimensions(); o.setCoords();
    }
    function setP(frame, P) { frame.fill.patternTransform = round(P); frame.dirty = true; canvas.requestRenderAll(); }

    async function lồng(objs, mode) { // mode: 'keep' | 'fill'; if frame already composite → replace image (1 undo)
      const r = classify(objs); if (r.error) { toast(r.error, 2400); return null; }
      const { image, frame } = r;
      if (canvas.getActiveObject() && canvas.getActiveObject().type === 'activeSelection') canvas.discardActiveObject();
      await fontsReady(frame);
      frame.setCoords(); image.setCoords();
      const { W, H } = box(frame), so = sourceOf(image), src = so.src, k = so.k, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
      let P = mode === 'fill' || r.replace ? null : mul(placement(frame.calcTransformMatrix(), W, H, image.calcTransformMatrix(), image.width, image.height), S(1 / k));
      if (P && !covers(P, W, H, sw, sh)) { P = null; toast('Ảnh không phủ kín ' + (isText(frame) ? 'chữ' : 'hình') + ' ở vị trí hiện tại — đã chuyển sang “Lấp đầy”. Có thể chỉnh lại trong ✥ Chỉnh ảnh.', 3200); }
      if (!P) P = fitMatrix(W, H, sw, sh, 'fill');
      quiet(() => {
        const prev = (frame.xtk && frame.xtk.composite) || {};
        const prevFill = r.replace ? (prev.prevFill != null ? prev.prevFill : (typeof frame.fill === 'string' ? frame.fill : null))
          : (typeof frame.fill === 'string' ? frame.fill : null);
        const prevStroke = r.replace ? (prev.prevStroke !== undefined ? prev.prevStroke : frame.stroke || null) : (frame.stroke || null);
        frame.xtk = { ...(frame.xtk || {}), composite: { v: 1, image: image.toObject(PROPS()), prevFill, prevStroke, sw, sh, k } };
        frame.set('fill', pattern(src, P)); frame.dirty = true; canvas.remove(image);
      });
      canvas.setActiveObject(frame); canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers();
      if (r.replace) toast('Đã thay ảnh lồng (ảnh cũ bỏ)', 1600);
      return frame;
    }
    // Outline on/off; if strokeWidth is 0 when turning on → default ~4px; open colour panel on stroke
    function defaultStrokeW(frame) {
      const side = Math.min(Math.abs(frame.width || 40), Math.abs(frame.height || 40));
      return Math.max(4, Math.round(side * 0.035)); // scales with object, never < 4
    }
    function toggleStroke(frame) {
      if (!isComposite(frame)) return false;
      const c = frame.xtk.composite;
      const hasStroke = !!(frame.stroke && frame.strokeWidth > 0);
      quiet(() => {
        if (!hasStroke) {
          const kept = (frame.xtk && frame.xtk._strokeW) || 0;
          let w = kept >= 2 ? kept : defaultStrokeW(frame);
          if (w < 4) w = 4;
          // if previous kept was tiny (<2), bump
          frame.set({ stroke: c.prevStroke || '#0f172a', strokeWidth: w, strokeUniform: true });
        } else if ((frame.strokeWidth || 0) < 2) {
          // already "on" but invisible → bump instead of turning off
          frame.set({ strokeWidth: Math.max(4, defaultStrokeW(frame)), strokeUniform: true });
        } else {
          frame.xtk = { ...(frame.xtk || {}), _strokeW: frame.strokeWidth || 4 };
          frame.set('stroke', null); // keep strokeWidth for next time
        }
        frame.dirty = true;
      });
      canvas.requestRenderAll(); X.snapshot && X.snapshot();
      if (frame.stroke && root.XTK_COLOR_PANEL) {
        try { root.XTK_COLOR_PANEL.open('stroke', frame, { hex: frame.stroke, ensureVisible: true }); } catch (e) { }
      }
      return !!frame.stroke;
    }
    // Rebuild Pattern fill from xtk.composite.image when zombie (meta without Pattern)
    function restorePattern(frame) {
      if (!needsPatternRestore(frame) || !frame.xtk.composite.image) return Promise.resolve(null);
      const c = frame.xtk.composite;
      return new Promise(res => fabric.util.enlivenObjects([c.image], ([img]) => {
        if (!img || !img.width) { toast('Không khôi phục được ảnh lồng.', 2000); return res(null); }
        const so = sourceOf(img), src = so.src, k = so.k;
        const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
        c.sw = sw; c.sh = sh; c.k = k;
        const { W, H } = box(frame);
        quiet(() => { frame.set('fill', pattern(src, fitMatrix(W, H, sw, sh, 'fill'))); frame.dirty = true; });
        canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers();
        toast('Đã khôi phục ảnh lồng', 1400); res(frame);
      }));
    }
    function healZombies() {
      const list = (canvas.getObjects() || []).filter(needsPatternRestore);
      if (!list.length) return Promise.resolve(0);
      return list.reduce((p, fr) => p.then(n => restorePattern(fr).then(r => n + (r ? 1 : 0))), Promise.resolve(0));
    }
    function reset(frame, mode) { const c = frame.xtk.composite, { W, H } = box(frame); setP(frame, fitMatrix(W, H, c.sw, c.sh, mode || 'fill')); }
    function tách(frame) {
      if (!isComposite(frame) || !frame.fill || !frame.fill.patternTransform) return Promise.resolve(null);
      const c = frame.xtk.composite, { W, H } = box(frame), P = mul(frame.fill.patternTransform, S(c.k || 1)); // back to original-image px
      return new Promise(res => fabric.util.enlivenObjects([c.image], ([img]) => {
        const M = releaseMatrix(frame.calcTransformMatrix(), W, H, P, img.width, img.height), d = decompose(M);
        img.set({ angle: d.angle, scaleX: d.scaleX, scaleY: d.scaleY, skewX: d.skewX, skewY: 0, flipX: false, flipY: false });
        img.setPositionByOrigin(new fabric.Point(d.translateX, d.translateY), 'center', 'center'); img.setCoords();
        const x = { ...frame.xtk }; delete x.composite; frame.xtk = x; frame.set('fill', c.prevFill || '#94a3b8'); if (c.prevStroke !== undefined) frame.set('stroke', c.prevStroke); frame.dirty = true;
        quiet(() => canvas.insertAt(img, canvas.getObjects().indexOf(frame) + 1)); canvas.setActiveObject(img); canvas.requestRenderAll();
        X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers(); res(img);
      }));
    }
    function thayẢnh(frame, url) {
      return new Promise(res => fabric.Image.fromURL(url, img => {
        if (!img || !img.width) { toast('Không đọc được ảnh.', 2000); return res(null); }
        const c = frame.xtk.composite, src = img.getElement(); c.image = img.toObject(PROPS()); c.sw = img.width; c.sh = img.height; c.k = 1;
        const { W, H } = box(frame); frame.set('fill', pattern(src, fitMatrix(W, H, c.sw, c.sh, 'fill'))); frame.dirty = true; canvas.requestRenderAll(); res(frame);
      }));
    }

    // ---- edit session: frame stays put; drag pans, wheel zooms; Enter = apply (1 snapshot), Esc = cancel
    let ed = null;
    function begin(frame) {
      if (!isComposite(frame) || ed) return;
      if (needsPatternRestore(frame)) { restorePattern(frame).then(r => { if (r) begin(r); }); return; }
      if (!frame.fill || !frame.fill.patternTransform) { toast('Ảnh lồng bị lỗi — bấm “Khôi phục ảnh lồng”.', 2200); return; }
      const lockKeys = ['lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls'];
      ed = { frame, P0: frame.fill.patternTransform.slice(), locks: Object.fromEntries(lockKeys.map(k => [k, frame[k]])), drag: null };
      frame.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
      canvas.setActiveObject(frame); canvas.requestRenderAll(); opts.onEdit && opts.onEdit(true, frame);
    }
    function end(applyIt) {
      if (!ed) return; const { frame, P0, locks } = ed; ed = null; frame.set(locks);
      if (!applyIt) setP(frame, P0);
      else if (String(P0) !== String(frame.fill.patternTransform)) X.snapshot && X.snapshot();
      canvas.requestRenderAll(); opts.onEdit && opts.onEdit(false, frame);
    }
    canvas.on('mouse:down', o => { if (!ed) return; if (o.target !== ed.frame) return end(true); const p = canvas.getPointer(o.e); ed.drag = p; });
    canvas.on('mouse:move', o => { if (!ed || !ed.drag) return; const p = canvas.getPointer(o.e); setP(ed.frame, pan(ed.frame.fill.patternTransform, ed.frame.calcTransformMatrix(), p.x - ed.drag.x, p.y - ed.drag.y)); ed.drag = p; });
    canvas.on('mouse:up', () => { if (ed) ed.drag = null; });
    canvas.on('mouse:wheel', o => {
      if (!ed) return; const e = o.e; e.preventDefault(); e.stopPropagation();
      const f = ed.frame, p = canvas.getPointer(e), q = apply(mul(T(f.width / 2, f.height / 2), inv(f.calcTransformMatrix())), p.x, p.y);
      setP(f, zoomAround(f.fill.patternTransform, Math.exp(-e.deltaY * 0.0015), q.x, q.y));
    });
    canvas.on('mouse:dblclick', o => { const t = o.target; if (t && isComposite(t) && !isText(t)) begin(t); }); // text: dblclick stays text editing
    document.addEventListener('keydown', e => { if (!ed) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); end(true); } }, true);
    canvas.on('selection:cleared', () => end(true));

    // After document open, heal zombies (xtk.composite without Pattern fill)
    window.XTK_HOOKS = window.XTK_HOOKS || {};
    const prevOpened = window.XTK_HOOKS.opened;
    window.XTK_HOOKS.opened = function () { try { healZombies(); } catch (e) { } if (typeof prevOpened === 'function') prevOpened.apply(this, arguments); };

    const api = { toggleStroke, lồng, nest: lồng, release: tách, replace: thayẢnh, reset, begin, end, editing: () => ed && ed.frame, classify, isComposite, restorePattern, healZombies, needsPatternRestore };
    window.XTK_COMPOSITE = api; return api;
  }
  const api = { capScale, MAX_SIDE, MAX_PIXELS, mul, inv, T, S, apply, fitMatrix, placement, releaseMatrix, decompose, pan, zoomAround, covers, classify, isComposite, isGradientFill, isPatternFill, needsPatternRestore, init };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_COMPOSITE_LIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
